import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { Prisma } from '@prisma/client';
import { PrismaService as AppPrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { ConfigService } from '../../config/config.service';
import { RedisService } from '../../redis/redis.service';
import { buildPartnerMessage, buildPartnerStatsMessage, escapeHtml } from '../../common/utils/messages';
import { partnersKeyboard } from '../../common/utils/keyboards';

@Injectable()
export class PartnersScreen {
  constructor(
    private prisma: AppPrismaService,
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'partners' });

    const partnerCode = await this.ensurePartnerCode(userId);
    const code = partnerCode.code;

    const referredCount = await this.prisma.referredUser.count({
      where: { referrerId: BigInt(userId) },
    });

    const earnings = await this.prisma.partnerEarning.findMany({
      where: { userId: BigInt(userId) },
    });
    const totalIncome = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

    const botUsername = (await this.redis.get('bot_username')) || this.config.botUsername;
    if (!botUsername) {
      await ctx.answerCallbackQuery({ text: 'Имя бота ещё не настроено' });
      return;
    }
    const link = `https://t.me/${botUsername}?start=${code}`;

    const message = buildPartnerMessage(referredCount, totalIncome, link);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
      });
    });
  }

  async copyLink(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);

    const partnerCode = await this.ensurePartnerCode(userId);

    const botUsername = (await this.redis.get('bot_username')) || this.config.botUsername;
    if (!botUsername) {
      await ctx.answerCallbackQuery({ text: 'Имя бота ещё не настроено' });
      return;
    }
    const link = `https://t.me/${botUsername}?start=${partnerCode.code}`;

    await ctx.answerCallbackQuery({ text: 'Ссылка скопирована!' });
    await ctx.reply(`<code>${escapeHtml(link)}</code>`, { parse_mode: 'HTML' });
  }

  async showStats(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);

    const referredCount = await this.prisma.referredUser.count({
      where: { referrerId: BigInt(userId) },
    });

    const earnings = await this.prisma.partnerEarning.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    const totalIncome = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

    const history = earnings.map((e) => ({
      date: e.createdAt,
      amount: Number(e.amount),
    }));

    const message = buildPartnerStatsMessage(referredCount, referredCount, totalIncome, history);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: partnersKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
      });
    });
  }

  private async ensurePartnerCode(userId: number) {
    const existing = await this.prisma.partnerCode.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (existing) return existing;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.partnerCode.create({
          data: {
            userId: BigInt(userId),
            code: randomBytes(8).toString('base64url'),
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
        const codeForUser = await this.prisma.partnerCode.findUnique({
          where: { userId: BigInt(userId) },
        });
        if (codeForUser) return codeForUser;
      }
    }

    throw new Error('Could not allocate a unique partner code');
  }
}
