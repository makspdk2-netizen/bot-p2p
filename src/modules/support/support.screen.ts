import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { buildFaqMessage, buildTicketsListMessage, escapeHtml } from '../../common/utils/messages';
import {
  adminSupportKeyboard,
  supportChatKeyboard,
  supportFaqKeyboard,
  supportMenuKeyboard,
} from '../../common/utils/keyboards';

const ADMIN_ID = () => Number(process.env.ADMIN_TELEGRAM_ID);

@Injectable()
export class SupportScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    await this.redis.setSession(Number(user.id), { currentScreen: 'support' });
    const message = `<tg-emoji emoji-id="5443038326535759644">⭐️</tg-emoji><b>Поддержка</b>\n\nВы можете написать оператору прямо здесь. Мы ответим в этом чате.`;
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: supportMenuKeyboard(),
    }).catch(() => ctx.reply(message, { parse_mode: 'HTML', reply_markup: supportMenuKeyboard() }));
  }

  async startConversation(ctx: Context, user: { id: bigint | number }) {
    const ticket = await this.getOrCreateTicket(BigInt(user.id));
    await this.redis.setSession(Number(user.id), {
      currentScreen: 'support',
      step: 'support_message',
      data: { ticketId: ticket.id.toString() },
    });
    await ctx.editMessageText(
      `🆘 <b>Диалог с поддержкой</b>\n\nНапишите сообщение, и оператор ответит вам здесь.`,
      { parse_mode: 'HTML', reply_markup: supportChatKeyboard() },
    ).catch(() => ctx.reply(
      `🆘 <b>Диалог с поддержкой</b>\n\nНапишите сообщение, и оператор ответит вам здесь.`,
      { parse_mode: 'HTML', reply_markup: supportChatKeyboard() },
    ));
  }

  async closeUserConversation(ctx: Context, user: { id: bigint | number }) {
    const ticket = await this.getActiveTicket(BigInt(user.id));
    if (ticket) {
      await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'closed' } });
    }
    await this.redis.clearSession(Number(user.id));
    await ctx.editMessageText('🔒 Диалог с поддержкой закрыт.', { reply_markup: supportMenuKeyboard() })
      .catch(() => ctx.reply('🔒 Диалог с поддержкой закрыт.', { reply_markup: supportMenuKeyboard() }));
  }

  async receiveUserText(ctx: Context, user: { id: bigint | number }, text: string) {
    const ticket = await this.getOrCreateTicket(BigInt(user.id));
    const normalized = text.trim();
    if (!normalized) {
      await ctx.reply('❌ Напишите сообщение для поддержки.');
      return;
    }
    await this.prisma.supportMessage.create({
      data: { ticketId: ticket.id, senderType: 'user', text: normalized, telegramMsgId: BigInt(ctx.message!.message_id) },
    });
    await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'in_progress' } });
    await this.notifyAdminAboutText(ctx, ticket.id, normalized);
    await ctx.reply('✅ Сообщение отправлено оператору.', { reply_markup: supportChatKeyboard() });
  }

  async receiveUserMedia(ctx: Context, user: { id: bigint | number }) {
    if (!ctx.message || !ctx.chat) return;
    const ticket = await this.getOrCreateTicket(BigInt(user.id));
    const media = this.extractMedia(ctx.message);
    if (!media) {
      await ctx.reply('❌ Этот тип файла пока не поддерживается.');
      return;
    }
    await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'user',
        mediaType: media.type,
        fileId: media.fileId,
        telegramMsgId: BigInt(ctx.message.message_id),
      },
    });
    await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'in_progress' } });
    await this.notifyAdminAboutMedia(ctx, ticket.id, media.type);
    await ctx.reply('✅ Файл отправлен оператору.', { reply_markup: supportChatKeyboard() });
  }

  async startAdminReply(ctx: Context, ticketId: bigint) {
    if (!this.isAdmin(ctx)) return;
    const ticket = await this.getTicket(ticketId);
    if (!ticket || ticket.status === 'closed') {
      await ctx.answerCallbackQuery({ text: 'Диалог уже закрыт' });
      return;
    }
    await this.redis.setSession(ctx.from!.id, { step: 'admin_support_message', data: { ticketId: ticketId.toString() } });
    await ctx.reply(`✍️ Введите ответ пользователю #${ticket.user.telegramId}:`);
    await ctx.answerCallbackQuery({ text: 'Ожидаю ответ' });
  }

  async closeAdminConversation(ctx: Context, ticketId: bigint) {
    if (!this.isAdmin(ctx)) return;
    const ticket = await this.getTicket(ticketId);
    if (!ticket) return;
    await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'closed' } });
    await this.redis.clearSession(Number(ticket.user.id));
    await this.redis.clearSession(ctx.from!.id);
    await ctx.api.sendMessage(Number(ticket.user.telegramId), '🔒 Диалог с поддержкой закрыт оператором.');
    await ctx.editMessageText(`🔒 Диалог #${ticket.id} закрыт.`);
    await ctx.answerCallbackQuery({ text: 'Диалог закрыт' });
  }

  async receiveAdminText(ctx: Context, text: string) {
    if (!this.isAdmin(ctx)) return;
    const session = await this.redis.getSession(ctx.from!.id);
    const ticketId = this.readTicketId(session);
    if (!ticketId) return;
    const ticket = await this.getTicket(ticketId);
    if (!ticket || ticket.status === 'closed') {
      await this.redis.clearSession(ctx.from!.id);
      await ctx.reply('Диалог уже закрыт.');
      return;
    }
    const normalized = text.trim();
    if (!normalized) return;
    await this.prisma.supportMessage.create({ data: { ticketId, senderType: 'admin', text: normalized } });
    await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'in_progress' } });
    await ctx.api.sendMessage(Number(ticket.user.telegramId), `💬 <b>Ответ поддержки</b>\n\n${escapeHtml(normalized)}`, { parse_mode: 'HTML' });
    await this.redis.clearSession(ctx.from!.id);
    await ctx.reply('✅ Ответ отправлен пользователю.');
  }

  async receiveAdminMedia(ctx: Context) {
    if (!this.isAdmin(ctx) || !ctx.message || !ctx.chat) return;
    const session = await this.redis.getSession(ctx.from!.id);
    const ticketId = this.readTicketId(session);
    const media = this.extractMedia(ctx.message);
    if (!ticketId || !media) return;
    const ticket = await this.getTicket(ticketId);
    if (!ticket || ticket.status === 'closed') {
      await this.redis.clearSession(ctx.from!.id);
      await ctx.reply('Диалог уже закрыт.');
      return;
    }
    await this.prisma.supportMessage.create({ data: { ticketId, senderType: 'admin', mediaType: media.type, fileId: media.fileId } });
    await ctx.api.copyMessage(Number(ticket.user.telegramId), ctx.chat.id, ctx.message.message_id);
    await this.redis.clearSession(ctx.from!.id);
    await ctx.reply('✅ Файл отправлен пользователю.');
  }

  async showMyTickets(ctx: Context, user: { id: bigint | number }) {
    const tickets = await this.prisma.supportTicket.findMany({ where: { userId: BigInt(user.id) }, orderBy: { createdAt: 'desc' } });
    const ticketList = tickets.map((ticket) => ({ id: Number(ticket.id), subject: ticket.subject, status: ticket.status, createdAt: ticket.createdAt }));
    const message = buildTicketsListMessage(ticketList);
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: supportMenuKeyboard() })
      .catch(() => ctx.reply(message, { parse_mode: 'HTML', reply_markup: supportMenuKeyboard() }));
  }

  async showFaq(ctx: Context, _user: { id: bigint | number }) {
    const entries = await this.prisma.faqEntry.findMany({ orderBy: { order: 'asc' } });
    const message = buildFaqMessage(entries.map((entry) => ({ id: Number(entry.id), question: entry.question, answer: entry.answer })));
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: supportFaqKeyboard() })
      .catch(() => ctx.reply(message, { parse_mode: 'HTML', reply_markup: supportFaqKeyboard() }));
  }

  private async getOrCreateTicket(userId: bigint) {
    const active = await this.getActiveTicket(userId);
    if (active) return active;
    return this.prisma.supportTicket.create({
      data: { userId, subject: 'Диалог с поддержкой', message: 'Диалог открыт', status: 'open' },
      include: { user: { select: { telegramId: true, username: true, firstName: true, lastName: true, id: true } } },
    });
  }

  private getActiveTicket(userId: bigint) {
    return this.prisma.supportTicket.findFirst({
      where: { userId, status: { in: ['open', 'in_progress'] } },
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { telegramId: true, username: true, firstName: true, lastName: true, id: true } } },
    });
  }

  private getTicket(ticketId: bigint) {
    return this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, telegramId: true, username: true, firstName: true, lastName: true } } },
    });
  }

  private async notifyAdminAboutText(ctx: Context, ticketId: bigint, text: string) {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) return;
    const name = ticket.user.username ? `@${ticket.user.username}` : ticket.user.firstName || 'Пользователь';
    await ctx.api.sendMessage(ADMIN_ID(), `🆘 <b>Сообщение в поддержку</b>\n\n👤 ${escapeHtml(name)}\n🆔 <code>${ticket.user.telegramId}</code>\n\n${escapeHtml(text)}`, { parse_mode: 'HTML', reply_markup: adminSupportKeyboard(ticketId) });
  }

  private async notifyAdminAboutMedia(ctx: Context, ticketId: bigint, mediaType: string) {
    const ticket = await this.getTicket(ticketId);
    if (!ticket || !ctx.chat || !ctx.message) return;
    const name = ticket.user.username ? `@${ticket.user.username}` : ticket.user.firstName || 'Пользователь';
    await ctx.api.sendMessage(ADMIN_ID(), `🆘 <b>Файл в поддержку</b>\n\n👤 ${escapeHtml(name)}\n🆔 <code>${ticket.user.telegramId}</code>\n📎 ${mediaType}`, { parse_mode: 'HTML', reply_markup: adminSupportKeyboard(ticketId) });
    await ctx.api.copyMessage(ADMIN_ID(), ctx.chat.id, ctx.message.message_id);
  }

  private extractMedia(message: Context['message']) {
    if (!message) return null;
    const photo = 'photo' in message ? message.photo : undefined;
    if (photo && photo.length > 0) return { type: 'photo', fileId: photo[photo.length - 1].file_id };
    const document = 'document' in message ? message.document : undefined;
    if (document) return { type: 'document', fileId: document.file_id };
    return null;
  }

  private readTicketId(session: Record<string, unknown> | null) {
    const data = session?.data;
    const value = data && typeof data === 'object' ? (data as Record<string, unknown>).ticketId : undefined;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
    return BigInt(value);
  }

  private isAdmin(ctx: Context) {
    return Number.isSafeInteger(ADMIN_ID()) && ctx.from?.id === ADMIN_ID();
  }
}
