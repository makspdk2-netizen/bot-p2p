import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { buildWelcomeMessage } from '../../common/utils/messages';
import { mainReplyKeyboard } from '../../common/utils/keyboards';

@Injectable()
export class MainMenuScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number; firstName?: string | null }) {
    const userId = Number(user.id);

    await this.redis.setSession(userId, { currentScreen: 'main_menu' });

    const dbUser = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { firstName: true, balance: true },
    });

    await ctx.reply(
      buildWelcomeMessage(
        dbUser?.firstName || user.firstName || 'Пользователь',
        Number(dbUser?.balance ?? 0),
      ),
      {
        parse_mode: 'HTML',
        reply_markup: mainReplyKeyboard(),
      },
    );
  }
}
