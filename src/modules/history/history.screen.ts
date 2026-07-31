import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { buildHistoryMessage } from '../../common/utils/messages';
import { historyKeyboard } from '../../common/utils/keyboards';

const PER_PAGE = 5;

@Injectable()
export class HistoryScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }, page: number = 0) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'history' });

    const totalOps = await this.prisma.operation.count({
      where: { userId: BigInt(userId) },
    });

    const totalPages = Math.max(1, Math.ceil(totalOps / PER_PAGE));
    const currentPage = Math.min(page, totalPages - 1);

    const operations = await this.prisma.operation.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
      skip: currentPage * PER_PAGE,
      take: PER_PAGE,
    });

    const ops = operations.map((op) => ({
      id: Number(op.id),
      type: op.type,
      currency: op.currency,
      amountRub: Number(op.amountRub),
      description: op.description,
      createdAt: op.createdAt,
    }));

    const message = buildHistoryMessage(ops, currentPage, totalPages);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: historyKeyboard(currentPage, totalPages),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: historyKeyboard(currentPage, totalPages),
      });
    });
  }
}
