import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export const PAYMENT_REQUEST_MINUTES = 15;

type PaymentBot = Pick<Bot<Context>, 'api'>;

@Injectable()
export class PaymentRequestsService implements OnModuleDestroy {
  private bot?: PaymentBot;
  private expirationTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {
    this.expirationTimer = setInterval(() => {
      void this.expireRequests();
    }, 30_000);
    this.expirationTimer.unref();
  }

  attachBot(bot: PaymentBot) {
    this.bot = bot;
  }

  async onModuleDestroy() {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }

  async createRequest(userId: bigint, requisiteId: bigint, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Сумма должна быть больше нуля');
    }

    const target = await this.prisma.requisite.findFirst({
      where: { id: requisiteId, userId, isActive: true },
      include: { user: true },
    });
    if (!target) throw new Error('Активная карта пользователя не найдена');

    const request = await this.prisma.paymentRequest.create({
      data: {
        code: this.generateCode(),
        userId,
        requisiteId,
        amount,
        deadline: new Date(Date.now() + PAYMENT_REQUEST_MINUTES * 60_000),
      },
      include: { user: true, requisite: true },
    });

    await this.sendRequestToUser(request);
    return this.serialize(request);
  }

  async acceptFromUser(ctx: Context, requestId: bigint) {
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'pending_user') return;
    if (ctx.from?.id !== Number(request.userId)) return;

    await this.completeAndDebit(request.id, 'Пользователь подтвердил поступление');
    await ctx.editMessageText(this.completedText(request.code, Number(request.amount))).catch(() => undefined);
  }

  async rejectFromUser(ctx: Context, requestId: bigint) {
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'pending_user') return;
    if (ctx.from?.id !== Number(request.userId)) return;

    await this.prisma.paymentRequest.update({
      where: { id: request.id },
      data: {
        status: 'awaiting_proof',
        respondedAt: new Date(),
        deadline: new Date(Date.now() + PAYMENT_REQUEST_MINUTES * 60_000),
      },
    });
    await ctx.editMessageText(this.proofRequestText(request.code)).catch(() => undefined);
  }

  async receiveUserProof(ctx: Context) {
    if (!ctx.from || !ctx.message) return false;
    const active = await this.prisma.paymentRequest.findFirst({
      where: { userId: BigInt(ctx.from.id), status: 'awaiting_proof' },
      orderBy: { createdAt: 'desc' },
    });
    if (!active) return false;

    const media = this.extractMedia(ctx.message);
    if (!media) {
      await ctx.reply('📎 Отправьте один файл: видео из приложения банка или PDF-выписку.');
      return true;
    }

    await this.prisma.paymentRequestProof.create({
      data: { requestId: active.id, mediaType: media.type, fileId: media.fileId },
    });
    await this.prisma.paymentRequest.update({
      where: { id: active.id },
      data: { status: 'under_review' },
    });
    await this.notifyAdmin(active.id);
    await ctx.reply('✅ Доказательство отправлено на проверку. Ожидайте решения.');
    return true;
  }

  async confirmByAdmin(requestId: bigint, ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request || !['under_review', 'pending_user', 'awaiting_proof'].includes(request.status)) return;
    await this.completeAndDebit(request.id, 'Подтверждено администратором');
    await ctx.editMessageText(this.adminCompletedText(request.code, Number(request.amount))).catch(() => undefined);
    await this.bot?.api.sendMessage(Number(request.userId), this.completedText(request.code, Number(request.amount)));
  }

  async startAdminMessage(requestId: bigint, ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request || ['completed', 'rejected', 'expired'].includes(request.status)) return;
    await this.prisma.paymentRequest.update({ where: { id: requestId }, data: { status: 'under_review' } });
    await this.redis.setSession(ctx.from!.id, { step: 'admin_payment_request_message', data: { requestId: requestId.toString() } });
    await ctx.reply(`💬 Введите сообщение пользователю по заявке ${request.code}:`);
  }

  async receiveAdminMessage(ctx: Context, text: string) {
    if (!this.isAdmin(ctx) || !ctx.from) return false;
    const requestId = await this.readAdminRequestId(ctx.from.id);
    if (!requestId) return false;
    const normalized = text.trim();
    if (!normalized) return true;
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request || ['completed', 'rejected', 'expired'].includes(request.status)) return true;
    await this.prisma.paymentRequestMessage.create({ data: { requestId, senderType: 'admin', text: normalized } });
    await this.bot?.api.sendMessage(Number(request.userId), `💬 <b>Сообщение по заявке ${request.code}</b>\n\n${normalized}`, { parse_mode: 'HTML' });
    await this.redis.clearSession(ctx.from.id);
    await ctx.reply('✅ Сообщение отправлено пользователю.');
    return true;
  }


  async rejectByAdmin(requestId: bigint, ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const request = await this.prisma.paymentRequest.updateMany({
      where: { id: requestId, status: { in: ['under_review', 'awaiting_proof'] } },
      data: { status: 'rejected', completedAt: new Date() },
    });
    if (request.count === 1) {
      await ctx.editMessageText('❌ Заявка отклонена. Списание не выполнено.').catch(() => undefined);
    }
  }

  async listRequests(status?: string) {
    const requests = await this.prisma.paymentRequest.findMany({
      where: status ? { status } : undefined,
      include: { user: true, requisite: true },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((request) => this.serialize(request));
  }

  async getRequest(id: bigint) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id },
      include: { user: true, requisite: true, messages: { orderBy: { createdAt: 'asc' } }, proofs: true },
    });
    return request ? this.serialize(request) : null;
  }

  private async expireRequests() {
    const expired = await this.prisma.paymentRequest.findMany({
      where: { status: { in: ['pending_user', 'awaiting_proof'] }, deadline: { lte: new Date() } },
      select: { id: true, code: true, userId: true, amount: true },
    });
    for (const request of expired) {
      const changed = await this.prisma.paymentRequest.updateMany({
        where: { id: request.id, status: { in: ['pending_user', 'awaiting_proof'] } },
        data: { status: 'expired', completedAt: new Date() },
      });
      if (changed.count !== 1) continue;
      await this.debit(request.id, Number(request.amount), 'Заявка завершена по истечении 15 минут');
      await this.bot?.api.sendMessage(Number(request.userId), this.completedText(request.code, Number(request.amount)));
    }
  }

  private async completeAndDebit(requestId: bigint, description: string) {
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request) return;
    const changed = await this.prisma.paymentRequest.updateMany({
      where: { id: requestId, status: { in: ['pending_user', 'under_review', 'awaiting_proof'] } },
      data: { status: 'completed', completedAt: new Date() },
    });
    if (changed.count === 1) await this.debit(requestId, Number(request.amount), description);
  }

  private async debit(requestId: bigint, amount: number, description: string) {
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: request.userId }, data: { balance: { decrement: amount } } });
      await tx.operation.create({
        data: { userId: request.userId, type: 'payment_request', amount, amountRub: amount, currency: 'RUB', status: 'completed', description: `${description}: ${request.code}` },
      });
    });
  }

  private async notifyAdmin(requestId: bigint) {
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId }, include: { user: true, requisite: true, proofs: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!request || !this.bot || !request.proofs[0]) return;
    const adminId = Number(process.env.ADMIN_TELEGRAM_ID);
    await this.bot.api.sendMessage(adminId, `⚠️ <b>Доказательство по заявке ${request.code}</b>\n\nПользователь: ${request.user.username ? `@${request.user.username}` : request.user.firstName || request.user.telegramId}\nСумма: ${Number(request.amount).toFixed(2)} RUB\nКарта: ${request.requisite.bank || 'Банк'} ${request.requisite.details}`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '✅ Подтвердить и списать', callback_data: `payment_request_confirm:${request.id}` }, { text: '💬 Написать', callback_data: `payment_request_message:${request.id}` }, { text: '❌ Отклонить', callback_data: `payment_request_admin_reject:${request.id}` }]] } });
    const proof = request.proofs[0];
    if (proof.mediaType === 'photo') await this.bot.api.sendPhoto(adminId, proof.fileId);
    else await this.bot.api.sendDocument(adminId, proof.fileId);
  }

  private async sendRequestToUser(request: any) {
    if (!this.bot) throw new Error('Бот ещё не подключён');
    await this.bot.api.sendMessage(Number(request.userId), this.requestText(request), { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '✅ Да, поступили', callback_data: `payment_request_accept:${request.id}` }, { text: '❌ Нет, не поступили', callback_data: `payment_request_reject:${request.id}` }]] } });
  }

  private requestText(request: any) { return `❓ <b>Вам поступили средства по заявке ${request.code}?</b>\n\n<b>Сумма:</b> ${Number(request.amount).toFixed(2)} RUB\n<b>Реквизиты:</b> ${request.requisite.details}\n<b>Банк:</b> ${request.requisite.bank || '-'}\n\nЕсли средства поступили на ваш реквизит — нажмите «Да», и заявка завершится. Если нет — нажмите «Нет».\n\n<i>Если за 15 минут ничего не выбрать, заявка завершится автоматически.</i>`; }
  private proofRequestText(code: string) { return `📎 <b>По заявке ${code} загрузите видео из приложения банка или PDF-выписку</b> (один файл на выбор) в течение 15 минут.\n\n<i>Если за 15 минут ничего не загрузить, заявка завершится автоматически.</i>`; }
  private completedText(code: string, amount: number) { return `✅ <b>Заявка ${code} завершена</b>\n\nСумма ${amount.toFixed(2)} RUB успешно списана с баланса Only P2P. Спасибо, что выбрали наш сервис!`; }
  private adminCompletedText(code: string, amount: number) { return `✅ Заявка ${code} подтверждена. Списано ${amount.toFixed(2)} RUB.`; }
  private generateCode() { return randomBytes(5).toString('base64url').slice(0, 10); }
  private serialize(request: any) {
    return {
      id: request.id.toString(),
      code: request.code,
      userId: request.userId.toString(),
      requisiteId: request.requisiteId.toString(),
      amount: request.amount.toString(),
      status: request.status,
      deadline: request.deadline,
      respondedAt: request.respondedAt,
      completedAt: request.completedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      user: request.user ? {
        id: request.user.id.toString(),
        telegramId: request.user.telegramId.toString(),
        username: request.user.username,
        firstName: request.user.firstName,
        lastName: request.user.lastName,
        balance: request.user.balance?.toString(),
      } : undefined,
      requisite: request.requisite ? {
        id: request.requisite.id.toString(),
        userId: request.requisite.userId.toString(),
        bank: request.requisite.bank,
        details: request.requisite.details,
        label: request.requisite.label,
        isActive: request.requisite.isActive,
      } : undefined,
      messages: request.messages?.map((message: any) => ({ ...message, id: message.id.toString(), requestId: message.requestId.toString() })),
      proofs: request.proofs?.map((proof: any) => ({ ...proof, id: proof.id.toString(), requestId: proof.requestId.toString() })),
    };
  }
  private isAdmin(ctx: Context) { return Number(ctx.from?.id) === Number(process.env.ADMIN_TELEGRAM_ID); }
  private async readAdminRequestId(userId: number): Promise<bigint | null> {
    const session = await this.redis.getSession(userId);
    const data = session?.data;
    const value = data && typeof data === 'object' ? (data as Record<string, unknown>).requestId : undefined;
    return typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value) : null;
  }
  private extractMedia(message: Context['message']) { if (!message) return null; if ('photo' in message && message.photo?.length) return { type: 'photo', fileId: message.photo[message.photo.length - 1].file_id }; if ('document' in message && message.document) return { type: 'document', fileId: message.document.file_id }; return null; }
}
