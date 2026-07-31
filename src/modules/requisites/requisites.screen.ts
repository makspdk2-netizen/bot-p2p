import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BankLabels } from '../../common/enums/bank.enum';
import { requisitesPhoneKeyboard } from '../../common/utils/keyboards';
import {
  buildRequisitesListMessage,
  buildRequisiteConfirmMessage,
  buildCardHolderMessage,
  buildAddRequisiteDetailsMessage,
  buildAddRequisiteLabelMessage,
  
  buildAddRequisiteBankMessage,
  buildEnterPhoneMessage,
  escapeHtml,
} from '../../common/utils/messages';
import {
  requisitesListKeyboard,
  requisiteActionKeyboard,
  addRequisiteTypeKeyboard,
  backAndMainKeyboard,
  confirmCancelKeyboard,
} from '../../common/utils/keyboards';

@Injectable()
export class RequisitesScreen {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async show(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    await this.redis.setSession(userId, { currentScreen: 'requisites' });

    const requisites = await this.prisma.requisite.findMany({
      where: { userId: BigInt(userId) },
    });

    const reqList = requisites.map((r) => ({
      id: Number(r.id),
      label: r.label,
      type: r.type,
      isPrimary: r.isPrimary,
    }));

    const message = buildRequisitesListMessage(requisites.map((r) => ({
      id: Number(r.id),
      label: r.label,
      type: r.type,
      bank: r.bank,
      details: r.details,
      isPrimary: r.isPrimary,
    })));

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: requisitesListKeyboard(reqList),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: requisitesListKeyboard(reqList),
      });
    });
  }

  async showRequisiteDetail(ctx: Context, user: { id: bigint | number }, requisiteId: number) {
    const requisite = await this.prisma.requisite.findFirst({
      where: { id: BigInt(requisiteId), userId: BigInt(Number(user.id)) },
    });

    if (!requisite) {
      await ctx.answerCallbackQuery({ text: 'Реквизиты не найдены' });
      return;
    }

    const typeLabel = requisite.type === 'card' ? '💳 Карта' : requisite.type === 'sbp' ? '📱 СБП' : '📞 Телефон';
    const bankInfo = requisite.bank ? `\nБанк: ${escapeHtml(BankLabels[requisite.bank] || requisite.bank)}` : '';
    const primaryMark = requisite.isPrimary ? ' ⭐ Основной' : '';

    const message = `🏦 <b>Реквизиты</b>

━━━━━━━━━━━━━━━━━━

<b>Тип:</b> ${typeLabel}${primaryMark}${bankInfo}
<b>Данные:</b> <code>${escapeHtml(requisite.details)}</code>
${requisite.label ? `<b>Название:</b> ${escapeHtml(requisite.label)}` : ''}`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: requisiteActionKeyboard(requisiteId),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: requisiteActionKeyboard(requisiteId),
      });
    });
  }

  async setPrimary(ctx: Context, user: { id: bigint | number }, requisiteId: number) {
    const userId = BigInt(user.id);
    const id = BigInt(requisiteId);

    const result = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.requisite.findFirst({ where: { id, userId }, select: { id: true } });
      if (!owned) return false;

      await tx.requisite.updateMany({ where: { userId }, data: { isPrimary: false } });
      await tx.requisite.updateMany({ where: { id, userId }, data: { isPrimary: true } });
      return true;
    });

    if (!result) {
      await ctx.answerCallbackQuery({ text: 'Реквизиты не найдены' });
      return;
    }

    await ctx.answerCallbackQuery({ text: 'Реквизиты установлены как основные' });
    await this.show(ctx, user);
  }

  async delete(ctx: Context, user: { id: bigint | number }, requisiteId: number) {
    const result = await this.prisma.requisite.deleteMany({
      where: { id: BigInt(requisiteId), userId: BigInt(user.id) },
    });

    if (result.count === 0) {
      await ctx.answerCallbackQuery({ text: 'Реквизиты не найдены' });
      return;
    }

    await ctx.answerCallbackQuery({
  text: 'Карта успешно удалена',
});

return;

  }

  async startEdit(ctx: Context, user: { id: bigint | number }, requisiteId: number) {
    const userId = Number(user.id);
    const requisite = await this.prisma.requisite.findFirst({
      where: { id: BigInt(requisiteId), userId: BigInt(userId) },
    });

    if (!requisite) {
      await ctx.answerCallbackQuery({ text: 'Реквизиты не найдены' });
      return;
    }

    await this.redis.setSession(userId, {
      step: 'add_requisite_details',
      currentScreen: 'requisites',
      data: { editId: requisiteId, type: requisite.type, bank: requisite.bank },
    });

    const message = `🏦 <b>Изменение реквизитов</b>

━━━━━━━━━━━━━━━━━━

Введите новые реквизиты:`;

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

  async showAddType(ctx: Context, user: { id: bigint | number }) {
    const message = `🏦 <b>Добавление реквизитов</b>

━━━━━━━━━━━━━━━━━━

Выберите тип реквизитов:`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: addRequisiteTypeKeyboard(),
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: addRequisiteTypeKeyboard(),
      });
    });
  }

  async startAdd(ctx: Context, user: { id: bigint | number }, type: string) {
    const userId = Number(user.id);

    if (!['card', 'sbp', 'phone'].includes(type)) {
      await ctx.answerCallbackQuery({ text: 'Неизвестный тип реквизитов' });
      return;
    }

    if (type === 'card') {
      await this.redis.setSession(userId, {
        step: 'add_requisite_bank',
        currentScreen: 'requisites',
        data: { type },
      });
      await this.showBankPage(ctx, user, 0);
    } else {
      await this.redis.setSession(userId, {
        step: 'add_requisite_details',
        currentScreen: 'requisites',
        data: { type },
      });

      const message = buildAddRequisiteDetailsMessage();

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
  }

  async showBankPage(ctx: Context, user: { id: bigint | number }, page: number = 0) {
    const banks = Object.entries(BankLabels);
    const perPage = 8;
    const totalPages = Math.ceil(banks.length / perPage);
    const safePage = Math.max(0, Math.min(page, Math.max(totalPages - 1, 0)));
    const start = safePage * perPage;
    const end = start + perPage;
    const pageBanks = banks.slice(start, end);

    const kb = new InlineKeyboard();
    pageBanks.forEach(([key, label]) => {
      kb.text(label, `bank_select:${key}`).row();
    });

    const navRow = [];
    if (safePage > 0) navRow.push({ text: '⬅ Назад', callback_data: `bank_page:${safePage - 1}` });
    if (safePage < totalPages - 1) navRow.push({ text: '➡ Далее', callback_data: `bank_page:${safePage + 1}` });

    if (navRow.length > 0) {
      const navButtons = navRow.map(b => InlineKeyboard.text(b.text, b.callback_data));
      kb.row(...navButtons);
    }

    kb.row().text('🔍 Поиск', 'bank_search').row();
    kb.text('⬅ Назад', 'back').text('🏠 Главное меню', 'main_menu');

    const message = buildAddRequisiteBankMessage();

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: kb,
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: kb,
      });
    });
  }

  async startBankSearch(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};

    await this.redis.setSession(userId, {
      step: 'add_requisite_bank_search',
      currentScreen: 'requisites',
      data,
    });

    const message = `🏦 <b>Поиск банка</b>

━━━━━━━━━━━━━━━━━━

Введите название банка для поиска:`;

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

  async selectBank(ctx: Context, user: { id: bigint | number }, bank: string) {
    const userId = Number(user.id);
    if (!BankLabels[bank]) {
      await ctx.answerCallbackQuery({ text: 'Неизвестный банк' });
      return;
    }

    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};
 await this.redis.setSession(userId,{
  step:'add_requisite_phone',
  currentScreen:'requisites',
  data:{...data,bank},
});

await ctx.answerCallbackQuery({
  text:`Выбран банк: ${BankLabels[bank] || bank}`,
});

const message = buildEnterPhoneMessage();

await ctx.editMessageText(message,{
  parse_mode:'HTML',
  reply_markup: requisitesPhoneKeyboard(),
});
  }

  async searchBank(ctx: Context, user: { id: bigint | number }, query: string) {
    const userId = Number(user.id);
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};

    const results = Object.entries(BankLabels).filter(([, label]) =>
      label.toLowerCase().includes(query.toLowerCase()),
    );

    if (results.length === 0) {
      await ctx.reply('❌ Банки не найдены. Попробуйте другой запрос.', {
        parse_mode: 'HTML',
      });
      return;
    }

    const kb = new InlineKeyboard();
    results.slice(0, 10).forEach(([key, label]) => {
      kb.text(label, `bank_select:${key}`).row();
    });
    kb.text('⬅ Назад', 'back').text('🏠 Главное меню', 'main_menu');

    const message = `🏦 <b>Результаты поиска</b>

━━━━━━━━━━━━━━━━━━

Найдено банков: ${results.length}`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: kb,
    }).catch(() => {
      ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: kb,
      });
    });
  }

  async receiveDetails(ctx: Context, user: { id: bigint | number }, details: string) {
    const userId = Number(user.id);
    const normalizedDetails = details.trim();
    if (normalizedDetails.length === 0 || normalizedDetails.length > 200) {
      await ctx.reply('❌ Реквизиты должны содержать от 1 до 200 символов.');
      return;
    }
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};

    await this.redis.setSession(userId, {
      step: 'add_requisite_holder',
      currentScreen: 'requisites',
      data: { ...data, details: normalizedDetails },
      type: 'sbp',
    });

    const message = buildAddRequisiteLabelMessage();

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup:requisitesPhoneKeyboard(),
    });
  }

  async receiveLabel(ctx: Context, user: { id: bigint | number }, label: string) {
    const userId = Number(user.id);
    const normalizedLabel = label.trim();
    if (normalizedLabel.length > 50) {
      await ctx.reply('❌ Название должно быть не длиннее 50 символов.');
      return;
    }
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};

    await this.redis.setSession(userId, {
      step: 'confirm_requisite',
      currentScreen: 'requisites',
      data: { ...data, label: normalizedLabel || null },
    });

    const type = (data.type as string) || 'card';
    const bank = (data.bank as string) || null;
    const details = (data.details as string) || '';
    const bankLabel = bank ? BankLabels[bank] || bank : null;

    const message = buildRequisiteConfirmMessage(type, bankLabel, details, normalizedLabel || null);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: confirmCancelKeyboard(),
    });
  }

  async confirmAdd(ctx: Context, user: { id: bigint | number }) {
    const userId = Number(user.id);
    const session = await this.redis.getSession(userId);
    const data = (session?.data as Record<string, unknown>) || {};

    const type = (data.type as string) || 'card';
    const bank = (data.bank as string) || null;
    const details = (data.details as string) || '';
    const label = (data.label as string) || null;
    const editId = data.editId as number | undefined;

    if (!details || details.length > 200 || !['card', 'sbp', 'phone'].includes(type)) {
      await ctx.answerCallbackQuery({ text: 'Некорректные реквизиты' });
      return;
    }

    if (editId) {
      const result = await this.prisma.requisite.updateMany({
        where: { id: BigInt(editId), userId: BigInt(userId) },
        data: { type, bank, details, label },
      });
      if (result.count === 0) {
        await ctx.answerCallbackQuery({ text: 'Реквизиты не найдены' });
        return;
      }
    } else {
      await this.prisma.requisite.create({
        data: {
          userId: BigInt(userId),
          type,
          bank,
          details,
          label,
        },
      });
    }

    await this.redis.clearSession(userId);

    await ctx.reply('✅ <b>Реквизиты сохранены!</b>', {
      parse_mode: 'HTML',
    });

    await this.show(ctx, user);
  }
  async receivePhone(
  ctx: Context,
  user: { id: bigint | number },
  phone: string,
) {
  const userId = Number(user.id);

  const normalizedPhone = phone.replace(/\D/g, '');

  if (!/^7\d{10}$/.test(normalizedPhone)) {
    await ctx.reply(
      '❌ Неверный номер телефона.\n\nВведите номер в формате:\n79991234567',
    );
    return;
  }

  const session = await this.redis.getSession(userId);

  const data = (session?.data as Record<string, unknown>) || {};

  await this.redis.setSession(userId, {
    step:'add_requisite_holder',
    currentScreen: 'requisites',
    data: {
      ...data,
      details: normalizedPhone,
      type: 'sbp',
    },
  });

  const message = buildCardHolderMessage()

  await ctx.reply(message, {
    parse_mode: 'HTML',
  });
}
async receiveHolder(
  ctx: Context,
  user: { id: bigint | number },
  holder: string,
) {
  const userId = Number(user.id);

  const normalizedHolder = holder.trim();

  if (normalizedHolder.length < 2 || normalizedHolder.length > 50) {
    await ctx.reply('❌ Некорректное имя держателя карты.');
    return;
  }

  const session = await this.redis.getSession(userId);

  const data = (session?.data as Record<string, unknown>) || {};

  const card = await this.prisma.requisite.create({
    data: {
      userId: BigInt(userId),
      type: 'card',
      bank: data.bank as string,
      details: data.details as string,
      label: normalizedHolder,
    },
  });


  await this.redis.clearSession(userId);


  await ctx.reply(
    `
<tg-emoji emoji-id="5472250091332993630">💳</tg-emoji> <b>Карта успешно добавлена!</b>

❗️ <a href="https://telegra.ph/Instrukciya-po-rabote-s-P2P-rekvizitami-06-29">Обязательно прочитайте рекомендации по работе с OnlyP2P</a>

Чтобы начать продажу криптовалюты на эту карту, активируйте её кнопкой ниже.
`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .add({
          text: 'Включить продажу',
          callback_data: `activate_card:${card.id}`,
          style: 'success',
        }),
    },
  );
}
async activateCard(
  ctx: Context,
  user: { id: bigint | number },
  requisiteId: number,
) {
  const requisite = await this.prisma.requisite.findFirst({
    where: {
      id: BigInt(requisiteId),
      userId: BigInt(Number(user.id)),
    },
  });

  if (!requisite) {
    await ctx.answerCallbackQuery({
      text: 'Реквизиты не найдены',
    });
    return;
  }


  await ctx.editMessageText(
`
<tg-emoji emoji-id="5258096772776991776">💳</tg-emoji><b>Управление картой</b>

<blockquote><b>Телефон:</b> <code>${requisite.details}</code>

<b>ФИО:</b> ${escapeHtml(requisite.label || '-')} 

<b>Банк:</b> ${escapeHtml(
  BankLabels[requisite.bank || ''] || requisite.bank || '-'
)}
</blockquote>

<tg-emoji emoji-id="5362074752737358235">💳</tg-emoji><b>Статус:</b>${
  requisite.isActive
  ? '<tg-emoji emoji-id="5990209588018812737">🟢</tg-emoji> Онлайн'
  : '<tg-emoji emoji-id="5987876686337677936">🔴</tg-emoji> Выключена'
}
<tg-emoji emoji-id="5411528427817673409">💳</tg-emoji><a href="https://telegra.ph/Instrukciya-po-rabоте-с-P2P-реквизитами-06-29">Обязательно прочитайте рекомендации по работе с OnlyP2P
</a>
`,
{
  parse_mode:'HTML',
  reply_markup: new InlineKeyboard()

.add({
  text: requisite.isActive ? 'Закончить вывод' : 'Начать вывод',
  icon_custom_emoji_id: requisite.isActive
    ? '5987876686337677936'
    : '5990209588018812737',
  callback_data: `toggle_card:${requisiteId}`,
  style: requisite.isActive ? 'danger' : 'success',
})
  .row()
  .add({
    text: 'Удалить карту',
    icon_custom_emoji_id: '5445267414562389170',
    callback_data: `delete_card:${requisiteId}`,
    style: 'danger',
  })
.row()
.add({
  
  text: 'Назад',
  icon_custom_emoji_id: '5976535107933050770',
  callback_data: 'withdrawal_back',
}),
});
}
async confirmDeleteCard(
  ctx: Context,
  requisiteId: number,
) {

  await ctx.editMessageText(
`
<tg-emoji emoji-id="5472250091332993630">💳</tg-emoji>
<b>Удаление карты</b>
Вы действительно хотите удалить карту?
`,
{
  parse_mode:'HTML',
  reply_markup: new InlineKeyboard()
    .add({
      text:'✅ Да',
      callback_data:`delete_card:${requisiteId}`,
      style:'success',
    })
    .add({
      text:'❌ Нет',
      callback_data:`cancel_delete_card:${requisiteId}`,
    }),
});
}
}

