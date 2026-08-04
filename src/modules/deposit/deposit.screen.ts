import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '../../config/config.service';
import { CURRENCIES } from '../../common/constants/currencies';
import { buildDepositMessage, escapeHtml } from '../../common/utils/messages';
import { editOrReply } from '../../common/utils/edit-or-reply';
import {
  depositCurrenciesKeyboard,
  depositAddressKeyboard,
  depositAdminKeyboard,
} from '../../common/utils/keyboards';
import { USER_BONUS_PERCENT, formatRatePercent } from '../../config/rates.config';


@Injectable()
export class DepositScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  async showCurrencies(ctx: Context, user: { id: bigint | number }) {

  const userId = Number(user.id);

  await this.redis.setSession(userId, {
    currentScreen: 'deposit'
  });


  const dbUser = await this.prisma.user.findUnique({
    where: {
      id: BigInt(userId),
    },
    select: {
      balance: true,
    },
  });


  const balance = dbUser?.balance ?? 0;


  const message = `

 <tg-emoji emoji-id="5201873447554145566">💳</tg-emoji> Ваш баланс: ${balance} ₽

<tg-emoji emoji-id="5462902520215002477">💳</tg-emoji> Доплата за пополнение: +${formatRatePercent(USER_BONUS_PERCENT)}

Для пополнения баланса используйте кнопки ниже:`;


  await editOrReply(
    ctx,
    message,
    depositCurrenciesKeyboard(),
  );

  }

  async showAddress(ctx: Context, user: { id: bigint | number }, currency: string) {
    const currencyInfo = CURRENCIES.find((c) => c.key === currency);
    if (!currencyInfo) {
      await ctx.answerCallbackQuery({ text: 'Неизвестная валюта' });
      return;
    }

    const address = this.configService.getAddressForCurrency(currency);
    if (!address) {
      await ctx.answerCallbackQuery({ text: 'Пополнение этой валюты пока недоступно' });
      return;
    }

    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'deposit_address' });
    const label = currencyInfo.label;

    const message = buildDepositMessage(label, address);

    await editOrReply(
  ctx,
  message,
  depositAddressKeyboard(currency),
);
  }

  async copyAddress(ctx: Context, user: { id: bigint | number }, currency: string) {
    const address = this.configService.getAddressForCurrency(currency);
    if (!CURRENCIES.some((c) => c.key === currency) || !address) {
      await ctx.answerCallbackQuery({ text: 'Адрес для этой валюты недоступен' });
      return;
    }
    await ctx.answerCallbackQuery({ text: 'Адрес скопирован!' });
    await ctx.reply(`<code>${escapeHtml(address)}</code>`, { parse_mode: 'HTML' });
  }
async startDeposit(
  ctx: Context,
  user: { id: bigint | number },
  currency: string,
) {
  const userId = Number(user.id);
  

  await this.redis.setSession(userId, {
  currentScreen: 'deposit',
  step: 'deposit_txhash',
  currency,
});

await ctx.reply(`
🔗 <b>Введите TX Hash транзакции.</b>
`, {
  parse_mode: 'HTML',
});
}

async receiveAmount(
  ctx: Context,
  user: { id: bigint | number },
  text: string,
) {
  const amount = Number(text.replace(',', '.'));
if (ctx.message) {
  await ctx.deleteMessage().catch(() => {});
}
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Введите корректную сумму.');
    return;
  }

  const userId = Number(user.id);
  const session = await this.redis.getSession(userId);

  await this.redis.setSession(userId, {
    ...session,
    amount,
    step: 'deposit_txhash',
  });

  await ctx.reply('📝 Теперь отправьте TX Hash транзакции:');
}

async receiveTxHash(
  ctx: Context,
  user: { id: bigint | number },
  txHash: string,
) {
  const userId = Number(user.id);
  if (ctx.message) {
  await ctx.deleteMessage().catch(() => {});
}
  const session = await this.redis.getSession(userId);
  const currency = String(session?.currency);

if (!session?.currency) {
    await ctx.reply('❌ Сессия пополнения не найдена. Начните заново.');
    return;
  }

  const deposit = await this.prisma.deposit.create({
  data: {
    userId: BigInt(user.id),
    currency,
    network: currency,
    txHash: txHash.trim(),
    status: 'pending',
  },
});

await this.redis.clearSession(userId);

const adminId = Number(process.env.ADMIN_TELEGRAM_ID);

await ctx.reply(
`✅ <b>Платеж зарегистрирован.</b>

⏳ Ожидайте автоматической проверки.

<blockquote>Проверка может занять до 2-х часов.</blockquote>`,
{
    parse_mode: 'HTML',
});

await ctx.api.sendMessage(
  adminId,
  `💸 <b>Новый запрос на проверку депозита</b>

🆔 Депозит:
<b>#${deposit.id}</b>

👤 Пользователь:
<b>${user.id}</b>

🪙 Валюта:
<b>${currency.toUpperCase()}</b>

🔗 TX Hash:
<code>${txHash.trim()}</code>`,
{
    parse_mode: 'HTML',
    reply_markup: depositAdminKeyboard(deposit.id),
});
}

async acceptDeposit(
  ctx: Context,
  depositId: bigint,
) {
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

    await ctx.api.sendMessage(
  Number(process.env.ADMIN_TELEGRAM_ID),
  `⚠️ Депозит #${deposit.id} подтвержден.

Введите сумму пользователю вручную через админ-панель.`,
);
  });

  await ctx.editMessageText(
    `✅ Депозит #${deposit.id} подтвержден.`,
  );

  await ctx.api.sendMessage(
    Number(deposit.userId),
    `✅ Ваш депозит на сумму ${deposit.amount} ${deposit.currency} подтвержден и зачислен на баланс.`,
  );
}

async rejectDeposit(
  ctx: Context,
  depositId: bigint,
) {
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
    where: {
      id: depositId,
    },
    data: {
      status: 'rejected',
    },
  });

  await ctx.editMessageText(
    `❌ Депозит #${deposit.id} отклонён.`,
  );

  await ctx.api.sendMessage(
    Number(deposit.userId),
    `❌ Ваш депозит был отклонён администрацией.`,
  );
}
  
}
