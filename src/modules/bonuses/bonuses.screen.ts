import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { buildBonusesMessage } from '../../common/utils/messages';
import { bonusesKeyboard } from '../../common/utils/keyboards';

@Injectable()
export class BonusesScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'bonuses' });

    const message = `🎁 <b>Бонусы</b>

━━━━━━━━━━━━━━━━━━

Добро пожаловать в раздел бонусов!

Здесь вы можете получить приветственные бонусы и следить за историей начислений.`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: bonusesKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: bonusesKeyboard(),
      });
    });
  }

  async showAvailable(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);

    let claimed = false;
    try {
      claimed = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.bonus.findUnique({
          where: { userId_type: { userId: BigInt(userId), type: 'welcome' } },
        });
        if (existing) return false;

        await tx.bonus.create({
          data: { userId: BigInt(userId), type: 'welcome', amount: 100 },
        });
        await tx.operation.create({
          data: {
            userId: BigInt(userId),
            type: 'bonus',
            amount: 100,
            amountRub: 100,
            description: 'Приветственный бонус',
          },
        });
        await tx.user.update({
          where: { id: BigInt(userId) },
          data: { balance: { increment: 100 }, earnedTotal: { increment: 100 } },
        });
        return true;
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
        throw error;
      }
      claimed = false;
    }

    if (claimed) {
      await ctx.answerCallbackQuery({ text: '🎁 Приветственный бонус 100 RUB получен!' });
    } else {
      await ctx.answerCallbackQuery({ text: 'Все бонусы уже получены' });
    }

    await this.show(ctx, user);
  }

  async showHistory(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);

    const bonuses = await this.prisma.bonus.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { claimedAt: 'desc' },
    });

    const history = bonuses.map((b) => ({
      type: b.type,
      amount: Number(b.amount),
      date: b.claimedAt,
    }));

    const message = buildBonusesMessage([], history);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: bonusesKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: bonusesKeyboard(),
      });
    });
  }
}
