import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { verifyPin } from '../../common/utils/pin';
import { buildSelectBankMessage, buildRequisitesListMessage } from '../../common/utils/messages';
import { withdrawalStartKeyboard, withdrawalRequisitesKeyboard } from '../../common/utils/keyboards';
import { BankLabels } from '../../common/enums/bank.enum';
import { RequisitesScreen } from '../requisites/requisites.screen';
@Injectable()
export class WithdrawalScreen {
constructor(
  private prisma: PrismaService,
  private redis: RedisService,
  private requisitesScreen: RequisitesScreen,
) {}

  async show(ctx: Context, user: { id: bigint | number }) {

const requisites = await this.prisma.requisite.findMany({
 where:{
   userId: BigInt(user.id)
 }
});


if (requisites.length === 0) {

  const message = `
<tg-emoji emoji-id="5472250091332993630">💳</tg-emoji><b>Список ваших карт пуст</b>

Добавьте первую карту, чтобы запустить продажу криптовалюты.<tg-emoji emoji-id="5406745015365943482">👇</tg-emoji>
`;

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: withdrawalStartKeyboard(),
  });

  return;
}


const reqList = requisites.map(r=>({
 id:Number(r.id),
 bank:r.bank,
 details:r.details,
}));


const message = `
<tg-emoji emoji-id="5472250091332993630">💳</tg-emoji><b>EPIC P2P | Мои реквизиты</b>

Выберите карту для вывода средств или добавьте новые реквизиты
`;


await ctx.reply(message,{
 parse_mode:'HTML',
 reply_markup: withdrawalRequisitesKeyboard(reqList)
});

}
  async selectRequisite(
  ctx: Context,
  user: { id: bigint | number },
  requisiteId: number,
) {

  await this.requisitesScreen.activateCard(
    ctx,
    user,
    requisiteId,
  );

}

  async receiveAmount(ctx: Context, user: { id: bigint | number }, rawAmount: string) {
    const userId = Number(user.id);
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};
    const requisiteId = Number(data.requisiteId);
    const normalized = rawAmount.trim().replace(',', '.');

    if (!Number.isSafeInteger(requisiteId) || requisiteId <= 0) {
      await this.redis.clearSession(userId);
      await ctx.reply('❌ Сессия вывода истекла. Начните вывод заново.');
      return;
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
      await ctx.reply('❌ Введите положительную сумму с максимум двумя знаками после запятой.');
      return;
    }

    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
      await ctx.reply('❌ Недопустимая сумма вывода.');
      return;
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { pinHash: true },
    });
    if (!userRecord?.pinHash) {
      await this.redis.clearSession(userId);
      await ctx.reply('❌ Сначала задайте PIN-код в разделе «Настройки → Безопасность».');
      return;
    }

    await this.redis.setSession(userId, {
      step: 'withdrawal_pin',
      currentScreen: 'withdrawal',
      data: { requisiteId, amount: normalized },
    });
    await ctx.reply('Введите PIN-код для подтверждения вывода:', {
      reply_markup: withdrawalStartKeyboard(),
    });
  }

  async receivePin(ctx: Context, user: { id: bigint | number }, pin: string) {
    const userId = Number(user.id);
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};
    const requisiteId = Number(data.requisiteId);
    const amountText = String(data.amount || '');

    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isSafeInteger(requisiteId) || requisiteId <= 0) {
      await this.redis.clearSession(userId);
      await ctx.reply('❌ Сессия вывода истекла. Начните вывод заново.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      await ctx.reply('❌ PIN-код должен состоять из 4 цифр.');
      return;
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { pinHash: true },
    });
    if (!userRecord?.pinHash || !verifyPin(pin, userRecord.pinHash)) {
      await ctx.reply('❌ Неверный PIN-код. Попробуйте ещё раз.');
      return;
    }

    const amount = new Prisma.Decimal(amountText);
    const requisite = await this.prisma.requisite.findFirst({
      where: { id: BigInt(requisiteId), userId: BigInt(userId) },
      select: { id: true },
    });
    if (!requisite) {
      await this.redis.clearSession(userId);
      await ctx.reply('❌ Реквизиты не найдены. Начните вывод заново.');
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id: BigInt(userId), balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (updated.count !== 1) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        await tx.operation.create({
          data: {
            userId: BigInt(userId),
            type: 'withdrawal',
            currency: 'RUB',
            amount,
            amountRub: amount,
            status: 'pending',
            description: `Вывод на реквизиты #${requisiteId}`,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        await ctx.reply('❌ Недостаточно средств на балансе.');
        return;
      }
      throw error;
    } finally {
      await this.redis.clearSession(userId);
    }

    await ctx.reply('✅ Заявка на вывод создана и отправлена на обработку.');
    await this.show(ctx, user);
  }
}
