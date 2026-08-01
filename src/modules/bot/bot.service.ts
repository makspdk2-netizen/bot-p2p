import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Bot, Context, session } from 'grammy';
import { Prisma } from '@prisma/client';
import { ConfigService } from '../../config/config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MainMenuScreen } from '../main-menu/main-menu.screen';
import { BalanceScreen } from '../balance/balance.screen';
import { DepositScreen } from '../deposit/deposit.screen';
import { WithdrawalScreen } from '../withdrawal/withdrawal.screen';
import { HistoryScreen } from '../history/history.screen';
import { RequisitesScreen } from '../requisites/requisites.screen';
import { PartnersScreen } from '../partners/partners.screen';
import { BonusesScreen } from '../bonuses/bonuses.screen';
import { SettingsScreen } from '../settings/settings.screen';
import { SupportScreen } from '../support/support.screen';
import { 
  buildWelcomeMessage, 
  buildUnknownCommandMessage,
  escapeHtml 
} from '../../common/utils/messages';
import { mainReplyKeyboard } from '../../common/utils/keyboards';
import { banksKeyboard } from '../../common/utils/keyboards';
import { buildSelectBankMessage } from '../../common/utils/messages';
@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private bot!: Bot;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
    private mainMenuScreen: MainMenuScreen,
    private balanceScreen: BalanceScreen,
    private depositScreen: DepositScreen,
    private withdrawalScreen: WithdrawalScreen,
    private historyScreen: HistoryScreen,
    private requisitesScreen: RequisitesScreen,
    private partnersScreen: PartnersScreen,
    private bonusesScreen: BonusesScreen,
    private settingsScreen: SettingsScreen,
    private supportScreen: SupportScreen,
  ) {}

  async onModuleInit() {
    this.bot = new Bot(this.configService.botToken);

    this.bot.use(session({ initial: () => ({}) }));

    this.bot.command('start', async (ctx) => {
      await this.handleStart(ctx);
    });

    this.bot.on('callback_query:data', async (ctx) => {
      try {
        await this.handleCallback(ctx, ctx.callbackQuery.data);
      } finally {
        await ctx.answerCallbackQuery().catch(() => undefined);
      }
    });
this.bot.hears('Пополнить', async (ctx) => {
  if (!ctx.from) return;

  const user = await this.prisma.user.findUnique({
    where: { telegramId: ctx.from.id },
  });

  if (!user) return;

  await this.depositScreen.showCurrencies(ctx, user);
});


this.bot.hears('Вывод на карту', async (ctx) => {
  if (!ctx.from) return;

  const user = await this.prisma.user.findUnique({
    where: { telegramId: ctx.from.id },
  });

  if (!user) return;

  await this.withdrawalScreen.show(ctx, user);
});


this.bot.hears('Партнёрство', async (ctx) => {
  if (!ctx.from) return;

  const user = await this.prisma.user.findUnique({
    where: { telegramId: ctx.from.id },
  });

  if (!user) return;

  await this.partnersScreen.show(ctx, user);
});


this.bot.hears('Поддержка', async (ctx) => {
  if (!ctx.from) return;

  const user = await this.prisma.user.findUnique({
    where: { telegramId: ctx.from.id },
  });

  if (!user) return;

  await this.supportScreen.show(ctx, user);
});


this.bot.hears('⚙️ Настройки', async (ctx) => {
  if (!ctx.from) return;

  const user = await this.prisma.user.findUnique({
    where: { telegramId: ctx.from.id },
  });

  if (!user) return;

  await this.settingsScreen.show(ctx, user);
});
 this.bot.hears('💰 Пополнить', async (ctx) => {
  if (!ctx.from) return;

  const user = await this.prisma.user.findUnique({
    where: {
      telegramId: ctx.from.id,
    },
  });

  if (!user) return;

  await this.depositScreen.showCurrencies(ctx, user);
});
    this.bot.on('message:text', async (ctx) => {
      await this.handleTextMessage(ctx);
      
    });

    this.bot.on('message:photo', async (ctx) => {
      if (!ctx.from) return;
      if (this.isAdmin(ctx)) {
        const adminSession = await this.redis.getSession(ctx.from.id);
        if (adminSession?.step === 'admin_support_message') {
          await this.supportScreen.receiveAdminMedia(ctx);
          return;
        }
      }
      const user = await this.prisma.user.findUnique({ where: { telegramId: ctx.from.id } });
      if (!user) return;
      const session = await this.redis.getSession(Number(user.id));
      if (session?.step === 'support_message') {
        await this.supportScreen.receiveUserMedia(ctx, user);
      }
    });

    this.bot.on('message:document', async (ctx) => {
      if (!ctx.from) return;
      if (this.isAdmin(ctx)) {
        const adminSession = await this.redis.getSession(ctx.from.id);
        if (adminSession?.step === 'admin_support_message') {
          await this.supportScreen.receiveAdminMedia(ctx);
          return;
        }
      }
      const user = await this.prisma.user.findUnique({ where: { telegramId: ctx.from.id } });
      if (!user) return;
      const session = await this.redis.getSession(Number(user.id));
      if (session?.step === 'support_message') {
        await this.supportScreen.receiveUserMedia(ctx, user);
      }
    });
    

    this.bot.catch((err) => {
      console.error('Bot error:', err);
    });

    await this.bot.init();
    if (this.bot.botInfo?.username) {
      await this.redis.set('bot_username', this.bot.botInfo.username);
    }

    void this.bot.start({
      onStart: () => console.log('Bot started successfully'),
    }).catch((err) => console.error('Bot polling failed:', err));
  }
  
  async onModuleDestroy() {
    if (this.bot) {
      await this.bot.stop();
    }
  }

  private async handleStart(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;
    const username = ctx.from.username || null;
    const firstName = ctx.from.first_name || null;
    const lastName = ctx.from.last_name || null;
    const startPayload = typeof ctx.match === 'string' ? ctx.match.trim() : '';

    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          username,
          firstName,
          lastName,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { username, firstName, lastName },
      });
    }

    if (startPayload) {
      await this.registerReferral(startPayload, user.id);
    }

    await this.redis.clearSession(Number(user.id));

    await ctx.reply(buildWelcomeMessage(firstName || 'Пользователь', Number(user.balance)), {
      parse_mode: 'HTML',
      reply_markup: mainReplyKeyboard(),
    });
  }

  private async handleCallback(ctx: Context, data: string) {
    if (!ctx.from) return;

    if (data.startsWith('deposit_accept:') || data.startsWith('deposit_reject:')) {
      await this.handleAdminDepositCallback(ctx, data);
      return;
    }

    if (data.startsWith('support_admin_reply:')) {
      await this.supportScreen.startAdminReply(ctx, BigInt(data.split(':')[1]));
      return;
    }
    if (data.startsWith('support_admin_close:')) {
      await this.supportScreen.closeAdminConversation(ctx, BigInt(data.split(':')[1]));
      return;
    }

    const telegramId = ctx.from.id;
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'Пользователь не найден. Напишите /start' });
      return;
    }
    if (data === 'requisites_back') {
      await this.requisitesScreen.show(ctx, user);
      return;
      }
    
    if (data.startsWith('banks_page:')) {
  const page = Number(data.split(':')[1]);
  

  if (page < 1) return;

  await ctx.editMessageReplyMarkup({
    reply_markup: banksKeyboard(page),
  });

  return;
}
if (data === 'add_requisites') {
  await ctx.editMessageText(
    buildSelectBankMessage(),
    {
      parse_mode: 'HTML',
      reply_markup: banksKeyboard(1),
    },
  );

  return;
}
    const userId = Number(user.id);

    if (data === 'main_menu') {
      await this.mainMenuScreen.show(ctx, user);
      return;
    }

    if (data === 'back') {
      const session = await this.redis.getSession(userId);
      const currentScreen = String(session?.currentScreen ?? 'main_menu');

      const parentScreens: Record<string, () => Promise<void>> = {
        balance: () => this.mainMenuScreen.show(ctx, user),
        deposit: () => this.mainMenuScreen.show(ctx, user),
        deposit_address: () => this.depositScreen.showCurrencies(ctx, user),
        withdrawal: () => this.mainMenuScreen.show(ctx, user),
        history: () => this.mainMenuScreen.show(ctx, user),
        requisites: () => this.mainMenuScreen.show(ctx, user),
        partners: () => this.mainMenuScreen.show(ctx, user),
        bonuses: () => this.mainMenuScreen.show(ctx, user),
        settings: () => this.mainMenuScreen.show(ctx, user),
        support: () => this.mainMenuScreen.show(ctx, user),
      };

      const handler = parentScreens[currentScreen];
      if (handler) {
        await handler();
      } else {
        await this.mainMenuScreen.show(ctx, user);
      }
      return;
    }

    if (data.startsWith('deposit:')) {
      const currency = data.split(':')[1];
      await this.depositScreen.showAddress(ctx, user, currency);
      return;
    }

    if (data.startsWith('copy_address:')) {
      await this.depositScreen.copyAddress(ctx, user, data.split(':')[1]);
      return;
    }

    if (data.startsWith('deposit_sent:')) {
      const currency = data.split(':')[1];
     await this.depositScreen.startDeposit(ctx, user, currency);
     return;
    }


    if (data.startsWith('deposit_accept:')) {
      if (!this.isAdmin(ctx)) {
        await ctx.answerCallbackQuery({ text: 'Недостаточно прав' });
        return;
      }

      const depositId = BigInt(data.split(':')[1]);
      const deposit = await this.prisma.deposit.findUnique({ where: { id: depositId } });
      if (!deposit) {
        await ctx.answerCallbackQuery({ text: 'Депозит не найден' });
        return;
      }
      if (deposit.status !== 'pending') {
        await ctx.answerCallbackQuery({ text: 'Уже обработан' });
        return;
      }

      await this.redis.setSession(ctx.from.id, {
        step: 'admin_deposit_amount',
        depositId: depositId.toString(),
      });
      await ctx.reply(`Введите сумму в рублях для зачисления по депозиту #${deposit.id}:`);
      await ctx.editMessageText(`⏳ Депозит #${deposit.id}: ожидается сумма от администратора.`);
      await ctx.answerCallbackQuery({ text: 'Введите сумму в рублях' });
      return;
    }

    if (data.startsWith('deposit_accept_legacy:')) {
  const depositId = BigInt(data.split(':')[1]);

  const deposit = await this.prisma.deposit.findUnique({
    where: { id: depositId },
  });

  if (!deposit) {
    await ctx.answerCallbackQuery({
      text: 'Депозит не найден',
    });
    return;
  }

  if (deposit.status !== 'pending') {
    await ctx.answerCallbackQuery({
      text: 'Уже обработан',
    });
    return;
  }

  await this.prisma.$transaction(async (tx) => {
    await tx.deposit.update({
      where: { id: depositId },
      data: {
        status: 'completed',
      },
    });

    await tx.user.update({
      where: {
        id: deposit.userId,
      },
      data: {
        balance: {
          increment: deposit.amount ?? 0,
        },
      },
    });
  });

  await ctx.editMessageText(
    `✅ Депозит #${deposit.id} подтвержден.`,
  );

  
const dbUser = await this.prisma.user.findUnique({
  where: {
    id: deposit.userId,
  },
});

if (dbUser) {
  await ctx.api.sendMessage(
  Number(dbUser.telegramId),
  `✅ Ваш депозит успешно подтверждён.

💰 На ваш баланс зачислено: ${deposit.amount} ${deposit.currency}.`
);
}


  
  await ctx.answerCallbackQuery({
    text: 'Средства зачислены',
  });

  return;
}

if (data.startsWith('deposit_reject:')) {
  if (!this.isAdmin(ctx)) {
    await ctx.answerCallbackQuery({ text: 'Недостаточно прав' });
    return;
  }
  const depositId = BigInt(data.split(':')[1]);

  const deposit = await this.prisma.deposit.findUnique({
    where: { id: depositId },
  });

  if (!deposit) {
    await ctx.answerCallbackQuery({
      text: 'Депозит не найден',
    });
    return;
  }

  if (deposit.status !== 'pending') {
    await ctx.answerCallbackQuery({
      text: 'Уже обработан',
    });
    return;
  }

  await this.prisma.deposit.update({
    where: { id: depositId },
    data: {
      status: 'rejected',
    },
  });

  const dbUser = await this.prisma.user.findUnique({
  where: {
    id: deposit.userId,
  },
});

if (dbUser) {
  await ctx.api.sendMessage(
  Number(dbUser.telegramId),
  `❌ Ваш депозит был отклонён администрацией.

Если вы считаете, что произошла ошибка, свяжитесь с поддержкой.`
);
}

  await ctx.editMessageText(
    `❌ Депозит #${deposit.id} отклонён.`,
  );

  await ctx.answerCallbackQuery({
    text: 'Депозит отклонён',
  });

  return;
}





    if (data.startsWith('new_address:')) {
      await this.depositScreen.showAddress(ctx, user, data.split(':')[1]);
      return;
    }

    if (data.startsWith('withdrawal_requisite:')) {
      const id = this.parsePositiveInt(data.split(':')[1]);
      if (id === null) {
        await ctx.answerCallbackQuery({ text: 'Некорректный идентификатор' });
        return;
      }
      await this.withdrawalScreen.selectRequisite(ctx, user, id);
      return;
    }

    if (data.startsWith('requisite_select:')) {
      const id = this.parsePositiveInt(data.split(':')[1]);
      if (id === null) {
        await ctx.answerCallbackQuery({ text: 'Некорректный идентификатор' });
        return;
      }
      await this.requisitesScreen.showRequisiteDetail(ctx, user, id);
      return;
    }

    if (data.startsWith('requisite_set_primary:')) {
      const id = this.parsePositiveInt(data.split(':')[1]);
      if (id === null) {
        await ctx.answerCallbackQuery({ text: 'Некорректный идентификатор' });
        return;
      }
      await this.requisitesScreen.setPrimary(ctx, user, id);
      return;
    }

    if (data.startsWith('requisite_edit:')) {
      const id = this.parsePositiveInt(data.split(':')[1]);
      if (id === null) {
        await ctx.answerCallbackQuery({ text: 'Некорректный идентификатор' });
        return;
      }
      await this.requisitesScreen.startEdit(ctx, user, id);
      return;
    }
    if (data.startsWith('activate_card:')) {

  const id = this.parsePositiveInt(data.split(':')[1]);

  if (id === null) {
    await ctx.answerCallbackQuery({
      text: 'Некорректный ID',
    });
    return;
  }

  await this.requisitesScreen.activateCard(ctx, user, id);

  return;
}


if (data.startsWith('toggle_card:')) {

  const id = this.parsePositiveInt(data.split(':')[1]);

  if (id === null) {
    await ctx.answerCallbackQuery({
      text: 'Некорректный ID',
    });
    return;
  }


  const card = await this.prisma.requisite.findFirst({
    where: {
      id: BigInt(id),
      userId: BigInt(Number(user.id)),
    },
  });


  if (!card) {
    await ctx.answerCallbackQuery({
      text: 'Карта не найдена',
    });
    return;
  }


  const updatedCard = await this.prisma.requisite.update({
    where: {
      id: BigInt(id),
    },
    data: {
      isActive: !card.isActive,
    },
  });
const owner = await this.prisma.user.findUnique({
  where: {
    id: card.userId,
  },
});


if (owner) {

  await ctx.api.sendMessage(
  Number(process.env.ADMIN_TELEGRAM_ID),

`
💳 <b>Статус карты изменён</b>


🏦 Банк:
<b>${card.bank || '-'}</b>


💳 Телефон:
<code>${card.details}</code>


👤👤 Пользователь:

<b>${owner.username ? '@' + owner.username : owner.firstName || 'Без имени'}</b>

<blockquote>
Профиль:
http://localhost:3000/users/${owner.id}
</blockquote>

📊 Новый статус:

${
  updatedCard.isActive
    ? '🟢 Карта включена'
    : '🔴 Карта выключена'
}

`,
{
  parse_mode:'HTML',
}
);

}

  await ctx.answerCallbackQuery({
    text: updatedCard.isActive
      ? 'Карта включена'
      : 'Карта выключена',
  });


  // просто обновляем это же меню
  await this.requisitesScreen.activateCard(
    ctx,
    user,
    id,
  );


  return;
}
if (data === 'withdrawal_back') {
  await this.withdrawalScreen.show(ctx, user);
  return;
}
if (data.startsWith('delete_card:')) {
  const id = this.parsePositiveInt(data.split(':')[1]);

  if (id === null) {
    await ctx.answerCallbackQuery({
      text: 'Некорректный ID',
    });
    return;
  }

  await this.requisitesScreen.delete(ctx, user, id);

  await this.withdrawalScreen.show(ctx, user);

  return;
}
if (data.startsWith('delete_card:')) {
  const id = this.parsePositiveInt(data.split(':')[1]);

  if (id === null) {
    await ctx.answerCallbackQuery({
      text:'Некорректный ID',
    });
    return;
  }
  if (data.startsWith('cancel_delete_card:')) {
  const id = this.parsePositiveInt(data.split(':')[1]);

  if (id === null) return;

  await this.requisitesScreen.showRequisiteDetail(ctx, user, id);
  return;
}

  await this.requisitesScreen.delete(ctx, user, id);
  return;
}

   if (data.startsWith('requisite_delete:')) {
  const id = this.parsePositiveInt(data.split(':')[1]);

  if (id === null) {
    await ctx.answerCallbackQuery({
      text: 'Некорректный идентификатор',
    });
    return;
  }

  await this.requisitesScreen.confirmDeleteCard(ctx, id);
  return;
}

    if (data.startsWith('add_requisite:')) {
      const type = data.split(':')[1];
      await this.requisitesScreen.showAddType(ctx, user,);
      return;
    }

    if (data.startsWith('bank_select:')) {
      const bank = data.split(':')[1];
      await this.requisitesScreen.selectBank(ctx, user, bank);
      return;
    }

    if (data.startsWith('bank_page:')) {
      const page = this.parseNonNegativeInt(data.split(':')[1]);
      if (page === null) {
        await ctx.answerCallbackQuery({ text: 'Некорректная страница' });
        return;
      }
      await this.requisitesScreen.showBankPage(ctx, user, page);
      return;
    }

    if (data.startsWith('bank_search')) {
      await this.requisitesScreen.startBankSearch(ctx, user);
      return;
    }

    if (data.startsWith('history_page:')) {
      const page = this.parseNonNegativeInt(data.split(':')[1]);
      if (page === null) {
        await ctx.answerCallbackQuery({ text: 'Некорректная страница' });
        return;
      }
      await this.historyScreen.show(ctx, user, page);
      return;
    }

    if (data.startsWith('lang:')) {
      const lang = data.split(':')[1];
      await this.settingsScreen.setLanguage(ctx, user, lang);
      return;
    }

    if (data === 'toggle_notifications') {
      await this.settingsScreen.toggleNotifications(ctx, user);
      return;
    }

    if (data === 'change_pin') {
      await this.settingsScreen.changePin(ctx, user);
      return;
    }

    if (data === 'copy_partner_link') {
      await this.partnersScreen.copyLink(ctx, user);
      return;
    }

    if (data === 'partner_stats') {
      await this.partnersScreen.showStats(ctx, user);
      return;
    }

    if (data === 'create_ticket') {
      await this.supportScreen.startConversation(ctx, user);
      return;
    }

    if (data === 'support_start') {
      await this.supportScreen.startConversation(ctx, user);
      return;
    }

    if (data === 'support_back') {
      await this.supportScreen.show(ctx, user);
      return;
    }

    if (data === 'support_close') {
      await this.supportScreen.closeUserConversation(ctx, user);
      return;
    }

    if (data === 'my_tickets') {
      await this.supportScreen.showMyTickets(ctx, user);
      return;
    }

    if (data === 'faq') {
      await this.supportScreen.showFaq(ctx, user);
      return;
    }

    if (data === 'available_bonuses') {
      await this.bonusesScreen.showAvailable(ctx, user);
      return;
    }

    if (data === 'bonus_history') {
      await this.bonusesScreen.showHistory(ctx, user);
      return;
    }

    if (data === 'settings_language') {
      await this.settingsScreen.showLanguage(ctx, user);
      return;
    }

    if (data === 'settings_notifications') {
      await this.settingsScreen.showNotifications(ctx, user);
      return;
    }

    if (data === 'settings_security') {
      await this.settingsScreen.showSecurity(ctx, user);
      return;
    }

    if (data === 'add_requisite') {
      await this.requisitesScreen.showAddType(ctx, user);
      return;
    }

    if (data === 'confirm') {
      const session = await this.redis.getSession(userId);
      if (session?.step === 'confirm_requisite') {
        await this.requisitesScreen.confirmAdd(ctx, user);
      }
      return;
    }

    if (data === 'cancel') {
      await this.redis.clearSession(userId);
      await this.mainMenuScreen.show(ctx, user);
      return;
    }

    if (data === 'noop') {
      await ctx.answerCallbackQuery();
      return;
    }

    const screenMap: Record<string, () => Promise<void>> = {
      balance: () => this.balanceScreen.show(ctx, user),
      deposit: () => this.depositScreen.showCurrencies(ctx, user),
      withdrawal: () => this.withdrawalScreen.show(ctx, user),
      history: () => this.historyScreen.show(ctx, user, 0),
      requisites: () => this.requisitesScreen.show(ctx, user),
      partners: () => this.partnersScreen.show(ctx, user),
      bonuses: () => this.bonusesScreen.show(ctx, user),
      settings: () => this.settingsScreen.show(ctx, user),
      support: () => this.supportScreen.show(ctx, user),
    };

    if (screenMap[data]) {
      await screenMap[data]();
    } else {
      await ctx.answerCallbackQuery({ text: 'Неизвестная команда' });
    }
  }

  private async handleAdminDepositCallback(ctx: Context, data: string) {
    if (!this.isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: 'Недостаточно прав' });
      return;
    }

    const depositId = BigInt(data.split(':')[1]);
    const deposit = await this.prisma.deposit.findUnique({ where: { id: depositId } });

    if (!deposit) {
      await ctx.answerCallbackQuery({ text: 'Депозит не найден' });
      return;
    }
    if (deposit.status !== 'pending') {
      await ctx.answerCallbackQuery({ text: 'Уже обработан' });
      return;
    }

    if (data.startsWith('deposit_accept:')) {
      await this.redis.setSession(ctx.from!.id, {
        step: 'admin_deposit_amount',
        depositId: depositId.toString(),
      });
      await ctx.reply(`Введите сумму в рублях для зачисления по депозиту #${deposit.id}:`);
      await ctx.editMessageText(`⏳ Депозит #${deposit.id}: ожидается сумма от администратора.`);
      await ctx.answerCallbackQuery({ text: 'Введите сумму в рублях' });
      return;
    }

    await this.prisma.deposit.update({
      where: { id: depositId },
      data: { status: 'rejected' },
    });

    const dbUser = await this.prisma.user.findUnique({
      where: { id: deposit.userId },
      select: { telegramId: true },
    });
    if (dbUser) {
      await ctx.api.sendMessage(Number(dbUser.telegramId), '❌ Ваш депозит был отклонён администрацией.');
    }

    await ctx.editMessageText(`❌ Депозит #${deposit.id} отклонён.`);
    await ctx.answerCallbackQuery({ text: 'Депозит отклонён' });
  }

  private async handleTextMessage(ctx: Context) {
    if (!ctx.from) return;

    if (this.isAdmin(ctx) && ctx.message && 'text' in ctx.message) {
      const adminSession = await this.redis.getSession(ctx.from.id);
      if (adminSession?.step === 'admin_deposit_amount') {
        await this.processAdminDepositAmount(ctx, adminSession, ctx.message.text ?? '');
        return;
      }
      if (adminSession?.step === 'admin_support_message') {
        await this.supportScreen.receiveAdminText(ctx, ctx.message.text ?? '');
        return;
      }
    }

    const telegramId = ctx.from.id;
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply('Пожалуйста, начните с команды /start');
      return;
    }

    const userId = Number(user.id);
    const session = await this.redis.getSession(userId);
    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text ?? '';

    if (!session || !session.step) {
      await ctx.reply(buildUnknownCommandMessage(), {
        parse_mode: 'HTML',
        reply_markup: mainReplyKeyboard(),
      });
      return;
    }

    switch (session.step) {
      case 'add_requisite_details':
        await this.requisitesScreen.receiveDetails(ctx, user, text);
        break;
        case 'add_requisite_holder':
        await this.requisitesScreen.receiveHolder(ctx, user, text);
        break; 

      case 'add_requisite_phone':
        await this.requisitesScreen.receivePhone(ctx, user, text);
        break;
      case 'add_requisite_label':
        await this.requisitesScreen.receiveLabel(ctx, user, text);
        break;
      case 'add_requisite_bank_search':
        await this.requisitesScreen.searchBank(ctx, user, text);
        break;
      case 'support_message':
        await this.supportScreen.receiveUserText(ctx, user, text);
        break;
      case 'change_pin':
        await this.settingsScreen.receiveNewPin(ctx, user, text);
        break;
      case 'withdrawal_amount':
        await this.withdrawalScreen.receiveAmount(ctx, user, text);
        break;
      case 'withdrawal_pin':
        await this.withdrawalScreen.receivePin(ctx, user, text);
        break;

      case 'deposit_amount':
        await this.depositScreen.receiveAmount(ctx, user, text);
        break;

      case 'deposit_txhash':
        await this.depositScreen.receiveTxHash(ctx, user, text);
      break;
      default:
        await ctx.reply(buildUnknownCommandMessage(), {
          parse_mode: 'HTML',
          reply_markup: mainReplyKeyboard(),
        });
       
    }
  }

  private async processAdminDepositAmount(
    ctx: Context,
    adminSession: Record<string, unknown>,
    text: string,
  ) {
    const amount = Number(text.trim().replace(',', '.'));
    const depositIdValue = String(adminSession.depositId ?? '');

    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:[.,]\d{1,2})?$/.test(text.trim())) {
      await ctx.reply('Введите корректную сумму в рублях, например: 1500 или 1500,50.');
      return;
    }

    let depositId: bigint;
    try {
      depositId = BigInt(depositIdValue);
    } catch {
      await this.redis.clearSession(ctx.from!.id);
      await ctx.reply('Не удалось определить депозит. Начните обработку заново.');
      return;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.deposit.updateMany({
        where: { id: depositId, status: 'pending' },
        data: { status: 'completed', amount },
      });

      if (claimed.count !== 1) return null;

      const deposit = await tx.deposit.findUniqueOrThrow({
        where: { id: depositId },
        include: { user: { select: { telegramId: true } } },
      });

      await tx.user.update({
        where: { id: deposit.userId },
        data: { balance: { increment: amount } },
      });

      await tx.operation.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          currency: 'RUB',
          amount,
          amountRub: amount,
          status: 'completed',
          description: `Пополнение по депозиту #${deposit.id}`,
        },
      });

      return deposit;
    });

    await this.redis.clearSession(ctx.from!.id);

    if (!result) {
      await ctx.reply('Этот депозит уже обработан.');
      return;
    }

    await ctx.reply(`✅ На баланс пользователя зачислено ${amount.toFixed(2)} ₽.`);
    await ctx.api.sendMessage(
      Number(result.user.telegramId),
      `✅ Баланс пополнен на ${amount.toFixed(2)} ₽.`,
    );
  }

  private async registerReferral(payload: string, referredId: bigint) {
    const code = await this.prisma.partnerCode.findUnique({ where: { code: payload } });
    if (!code || code.userId === referredId) return;

    const existing = await this.prisma.referredUser.findUnique({ where: { referredId } });
    if (existing) return;

    try {
      await this.prisma.referredUser.create({
        data: { referrerId: code.userId, referredId },
      });
    } catch (error) {
      // A concurrent /start for the same user may win the unique referredId race.
      if (!(error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002')) {
        throw error;
      }
    }
  }

  private isAdmin(ctx: Context): boolean {
    const adminId = Number(process.env.ADMIN_TELEGRAM_ID);
    return Number.isSafeInteger(adminId) && adminId > 0 && ctx.from?.id === adminId;
  }

  private parsePositiveInt(value: string | undefined): number | null {
    if (!value || !/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private parseNonNegativeInt(value: string | undefined): number | null {
    if (!value || !/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
  }
}

