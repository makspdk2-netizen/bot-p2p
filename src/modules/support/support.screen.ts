import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  buildTicketsListMessage,
  buildFaqMessage,
  escapeHtml,
} from '../../common/utils/messages';
import {
  supportKeyboard,
  backAndMainKeyboard,
} from '../../common/utils/keyboards';

@Injectable()
export class SupportScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'support' });

    const message = `💬 <b>Поддержка</b>

Контакты поддержки: @rus_37x`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: supportKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: supportKeyboard(),
      });
    });
  }

  async startCreateTicket(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, {
      step: 'create_ticket_subject',
      currentScreen: 'support',
    });

    const message = `📝 <b>Создание обращения</b>

━━━━━━━━━━━━━━━━━━

Пожалуйста, напишите тему вашего обращения.`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: backAndMainKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: backAndMainKeyboard(),
      });
    });
  }

  async receiveTicketSubject(ctx: Context, user: { id: bigint | number }, subject: string) {
    const userId = Number(user.id);
    const normalizedSubject = subject.trim();
    if (normalizedSubject.length === 0 || normalizedSubject.length > 200) {
      await ctx.reply('❌ Тема должна содержать от 1 до 200 символов.');
      return;
    }
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};

    await this.redis.setSession(userId, {
      step: 'create_ticket_message',
      currentScreen: 'support',
      data: { ...data, subject: normalizedSubject },
    });

    const message = `📝 <b>Создание обращения</b>

━━━━━━━━━━━━━━━━━━

<b>Тема:</b> ${escapeHtml(normalizedSubject)}

Теперь напишите подробное описание вашей проблемы.`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: backAndMainKeyboard(),
    });
  }

  async receiveTicketMessage(ctx: Context, user: { id: bigint | number }, messageText: string) {
    const userId = Number(user.id);
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};
    const subject = (data.subject as string) || 'Без темы';
    const normalizedMessage = messageText.trim();
    if (normalizedMessage.length === 0 || normalizedMessage.length > 4000) {
      await ctx.reply('❌ Сообщение должно содержать от 1 до 4000 символов.');
      return;
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId: BigInt(userId),
        subject,
        message: normalizedMessage,
      },
    });

    await this.redis.clearSession(userId);

    const replyMessage = `✅ <b>Обращение создано!</b>

━━━━━━━━━━━━━━━━━━

Ваше обращение #${ticket.id} принято.

Мы ответим вам в ближайшее время.`;

    await ctx.reply(replyMessage, {
      parse_mode: 'HTML',
    });

    await this.show(ctx, user);
  }

  async showMyTickets(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);

    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    const ticketList = tickets.map((t) => ({
      id: Number(t.id),
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
    }));

    const message = buildTicketsListMessage(ticketList);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: supportKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: supportKeyboard(),
      });
    });
  }

  async showFaq(ctx: Context, user: { id: bigint | number }) {
    const faqEntries = await this.prisma.faqEntry.findMany({
      orderBy: { order: 'asc' },
    });

    const entries = faqEntries.map((e) => ({
      id: Number(e.id),
      question: e.question,
      answer: e.answer,
    }));

    const message = buildFaqMessage(entries);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: supportKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: supportKeyboard(),
      });
    });
  }
}
