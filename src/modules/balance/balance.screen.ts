import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { buildBalanceMessage } from '../../common/utils/messages';

@Injectable()
export class BalanceScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'balance' });

    const dbUser = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    const balance = dbUser ? Number(dbUser.balance) : 0;
    const earnedTotal = dbUser ? Number(dbUser.earnedTotal) : 0;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pendingOps = await this.prisma.operation.findMany({
      where: { userId: BigInt(userId), status: 'pending' },
    });
    const pending = pendingOps.reduce((sum, op) => sum + Number(op.amountRub), 0);

    const todayOps = await this.prisma.operation.findMany({
      where: { userId: BigInt(userId), createdAt: { gte: startOfDay } },
    });
    const todayEarned = todayOps
      .filter((op) => op.type === 'deposit' || op.type === 'bonus' || op.type === 'partner_earning')
      .reduce((sum, op) => sum + Number(op.amountRub), 0);

    const weekOps = await this.prisma.operation.findMany({
      where: { userId: BigInt(userId), createdAt: { gte: startOfWeek } },
    });
    const weekEarned = weekOps
      .filter((op) => op.type === 'deposit' || op.type === 'bonus' || op.type === 'partner_earning')
      .reduce((sum, op) => sum + Number(op.amountRub), 0);

    const monthOps = await this.prisma.operation.findMany({
      where: { userId: BigInt(userId), createdAt: { gte: startOfMonth } },
    });
    const monthEarned = monthOps
      .filter((op) => op.type === 'deposit' || op.type === 'bonus' || op.type === 'partner_earning')
      .reduce((sum, op) => sum + Number(op.amountRub), 0);

    const allOps = await this.prisma.operation.findMany({
      where: { userId: BigInt(userId) },
    });
    const totalEarned = allOps
      .filter((op) => op.type === 'deposit' || op.type === 'bonus' || op.type === 'partner_earning')
      .reduce((sum, op) => sum + Number(op.amountRub), 0);

    const message = buildBalanceMessage(
      balance,
      pending,
      earnedTotal,
      todayEarned,
      weekEarned,
      monthEarned,
      totalEarned,
    );

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: balanceKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: balanceKeyboard(),
      });
    });
  }
}

function balanceKeyboard() {
  return new InlineKeyboard()
    .text('➕ Пополнить', 'deposit')
    .text('💸 Вывести', 'withdrawal')
    .row()
    .text('📜 История', 'history')
    .row()
    .text('🏠 Главное меню', 'main_menu');
}
