import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { buildWelcomeMessage } from '../../common/utils/messages';
import { mainReplyKeyboard } from '../../common/utils/keyboards';
import { editOrReply } from "../../common/utils/edit-or-reply";

@Injectable()
export class MainMenuScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

 async show(ctx: Context, user: { id: bigint | number; firstName?: string | null }) {
  const userId = Number(user.id);

  await this.redis.setSession(userId, {
    currentScreen: 'main_menu',
  });

  await ctx.reply(
  buildWelcomeMessage(user.firstName || 'Пользователь'),
  {
    parse_mode: 'HTML',
    reply_markup: mainReplyKeyboard(),
  },
);
}
}
