import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { hashPin } from '../../common/utils/pin';
import {
  buildSettingsMessage,
  buildLanguageMessage,
  buildNotificationsMessage,
  buildSecurityMessage,
} from '../../common/utils/messages';
import {
  settingsKeyboard,
  languageKeyboard,
  notificationsKeyboard,
  securityKeyboard,
  backAndMainKeyboard,
} from '../../common/utils/keyboards';

@Injectable()
export class SettingsScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'settings' });

    const message = buildSettingsMessage();

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: settingsKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: settingsKeyboard(),
      });
    });
  }

  async showLanguage(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'settings' });

    const message = buildLanguageMessage();

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: languageKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: languageKeyboard(),
      });
    });
  }

  async setLanguage(ctx: Context, user: { id: bigint | number }, lang: string) {
    if (!['ru', 'en'].includes(lang)) {
      await ctx.answerCallbackQuery({ text: 'Неизвестный язык' });
      return;
    }

    await this.prisma.user.update({
      where: { id: BigInt(Number(user.id)) },
      data: { languageCode: lang },
    });

    const label = lang === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English';
    await ctx.answerCallbackQuery({ text: `Язык изменён на ${label}` });
    await this.show(ctx, user);
  }

  async showNotifications(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'settings' });
    const dbUser = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { notificationsEnabled: true },
    });
    const enabled = dbUser?.notificationsEnabled ?? true;

    const message = buildNotificationsMessage(enabled);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: notificationsKeyboard(enabled),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: notificationsKeyboard(enabled),
      });
    });
  }

  async toggleNotifications(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    const dbUser = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { notificationsEnabled: true },
    });
    const current = dbUser?.notificationsEnabled ?? true;
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { notificationsEnabled: !current },
    });

    await ctx.answerCallbackQuery({ text: !current ? '🔔 Уведомления включены' : '🔕 Уведомления выключены' });
    await this.showNotifications(ctx, user);
  }

  async showSecurity(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'settings' });

    const message = buildSecurityMessage();

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: securityKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: securityKeyboard(),
      });
    });
  }

  async changePin(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, {
      step: 'change_pin',
      currentScreen: 'settings',
    });

    const message = `🔑 <b>Смена PIN-кода</b>

━━━━━━━━━━━━━━━━━━

Введите новый PIN-код (4 цифры):`;

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

  async receiveNewPin(ctx: Context, user: { id: bigint | number }, pin: string) {
    if (!/^\d{4}$/.test(pin)) {
      await ctx.reply('❌ PIN-код должен состоять из 4 цифр. Попробуйте снова.', {
        parse_mode: 'HTML',
      });
      return;
    }

    const userId = Number(user.id);
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { pinHash: hashPin(pin) },
    });
    await this.redis.clearSession(userId);

    await ctx.reply('✅ <b>PIN-код успешно изменён!</b>', {
      parse_mode: 'HTML',
    });

    await this.show(ctx, user);
  }
}
