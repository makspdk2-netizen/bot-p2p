import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly redis: RedisService,
  ) {}

  async show(
    ctx: Context,
    userId: number,
    text: string,
    keyboard?: InlineKeyboard,
  ) {
    // удаляем сообщение пользователя
    if (ctx.message) {
      await ctx.deleteMessage().catch(() => {});
    }

    const messageId = await this.redis.getBotMessageId(userId);

    if (messageId) {
      try {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          messageId,
          text,
          {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          },
        );
        return;
      } catch {}
    }

    const message = await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    await this.redis.setBotMessageId(
      userId,
      message.message_id,
    );
  }
}