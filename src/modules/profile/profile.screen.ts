import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  buildProfileMessage,
  buildDepositHistoryMessage,
  buildPaymentRequestHistoryMessage,
  buildMyReferralsMessage,
} from '../../common/utils/messages';
import { profileKeyboard, profileSubKeyboard } from '../../common/utils/keyboards';
import { editOrReply } from '../../common/utils/edit-or-reply';

const PER_PAGE = 5;

@Injectable()
export class ProfileScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    const userId = BigInt(user.id);
    await this.redis.setSession(Number(user.id), { currentScreen: 'profile' });

    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        username: true,
        balance: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: 'Пользователь не найден' }).catch(() => undefined);
      }
      return;
    }

    const [referralCount, earnings] = await Promise.all([
      this.prisma.referredUser.count({
        where: { referrerId: userId },
      }),
      this.prisma.partnerEarning.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    const message = buildProfileMessage({
      telegramId: dbUser.telegramId.toString(),
      username: dbUser.username,
      balance: Number(dbUser.balance),
      referralCount,
      referralEarned: Number(earnings._sum.amount ?? 0),
      createdAt: dbUser.createdAt,
    });

    await editOrReply(ctx, message, profileKeyboard());
  }

  async showDeposits(ctx: Context, user: { id: bigint | number }, page = 0) {
    const userId = BigInt(user.id);
    await this.redis.setSession(Number(user.id), { currentScreen: 'profile_deposits' });

    const total = await this.prisma.deposit.count({
      where: { userId },
    });
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

    const deposits = await this.prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: currentPage * PER_PAGE,
      take: PER_PAGE,
      select: {
        amountRub: true,
        status: true,
        createdAt: true,
      },
    });

    const message = buildDepositHistoryMessage(
      deposits.map((deposit) => ({
        amountRub: deposit.amountRub == null ? null : Number(deposit.amountRub),
        status: deposit.status,
        createdAt: deposit.createdAt,
      })),
      currentPage,
      totalPages,
    );

    await editOrReply(ctx, message, profileSubKeyboard('profile_deposits', currentPage, totalPages));
  }

  async showRequests(ctx: Context, user: { id: bigint | number }, page = 0) {
    const userId = BigInt(user.id);
    await this.redis.setSession(Number(user.id), { currentScreen: 'profile_requests' });

    const total = await this.prisma.paymentRequest.count({
      where: { userId },
    });
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

    const requests = await this.prisma.paymentRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: currentPage * PER_PAGE,
      take: PER_PAGE,
      select: {
        code: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    const message = buildPaymentRequestHistoryMessage(
      requests.map((request) => ({
        code: request.code,
        amount: Number(request.amount),
        status: request.status,
        createdAt: request.createdAt,
      })),
      currentPage,
      totalPages,
    );

    await editOrReply(ctx, message, profileSubKeyboard('profile_requests', currentPage, totalPages));
  }

  async showReferrals(ctx: Context, user: { id: bigint | number }) {
    const userId = BigInt(user.id);
    await this.redis.setSession(Number(user.id), { currentScreen: 'profile_referrals' });

    const referrals = await this.prisma.referredUser.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referred: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
      },
    });

    const earnings = referrals.length === 0
      ? []
      : await this.prisma.partnerEarning.groupBy({
          by: ['referredId'],
          where: {
            userId,
            referredId: { in: referrals.map((item) => item.referredId) },
          },
          _sum: { amount: true },
        });

    const earnedByReferred = new Map<string, number>();
    for (const earning of earnings) {
      if (earning.referredId == null) continue;
      earnedByReferred.set(earning.referredId.toString(), Number(earning._sum.amount ?? 0));
    }

    const items = referrals.map((item) => {
      const referred = item.referred;
      const displayName = referred.username
        ? `@${referred.username}`
        : [referred.firstName, referred.lastName].filter(Boolean).join(' ').trim()
          || `ID ${referred.telegramId.toString()}`;

      return {
        displayName,
        earned: earnedByReferred.get(item.referredId.toString()) ?? 0,
      };
    });

    const totalEarned = items.reduce((sum, item) => sum + item.earned, 0);
    const message = buildMyReferralsMessage(items, totalEarned);

    await editOrReply(ctx, message, profileSubKeyboard());
  }
}
