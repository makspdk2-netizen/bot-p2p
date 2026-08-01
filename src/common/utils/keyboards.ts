import { InlineKeyboard } from 'grammy';
import { BankLabels } from '../enums/bank.enum';
import { Keyboard } from 'grammy';
export const BANKS_PER_PAGE = 12;

export function mainReplyKeyboard() {
  return new Keyboard()
    .add({
      text: 'Пополнить',
      style: 'success',
      icon_custom_emoji_id: '5215420556089776398',
    })
    .add({
      text: 'Вывод на карту',
      style: 'primary',
      icon_custom_emoji_id: '5472250091332993630',
    })
    .row()
    .add({
      text: 'Партнёрство',
      icon_custom_emoji_id: '5332724926216428039',
    })
    .add({
      text: 'Поддержка',
      icon_custom_emoji_id: '5472239203590888751',
    })
    .resized();
}

export function backToMainKeyboard() {
  return new InlineKeyboard()
    .text('🏠 Главное меню', 'main_menu');
}

export function backAndMainKeyboard() {
  return new InlineKeyboard()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function backKeyboard() {
  return new InlineKeyboard()
    .text('⬅ Назад', 'back');
}

export function depositCurrenciesKeyboard() {
  return new InlineKeyboard()
    .add({
      text: 'BTC',
      callback_data: 'deposit:btc',
      icon_custom_emoji_id: '5379773896352355687',
    })
    .row()
    .add({
      text: 'LTC',
      callback_data: 'deposit:ltc',
      icon_custom_emoji_id: '5202064723922670546',
    })
    .row()
    .add({
      text: 'USDT TRC20',
      callback_data: 'deposit:usdt_trc20',
      icon_custom_emoji_id: '5201692367437974073',
    });
}

export function depositAddressKeyboard(currency: string) {
  return new InlineKeyboard()
    .text('✅ Я отправил', `deposit_sent:${currency}`)
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function withdrawalStartKeyboard() {
 return new InlineKeyboard()
    .add({
      icon_custom_emoji_id: '5397916757333654639',
      text: 'Добавить реквизиты',
      callback_data: 'add_requisites',
      style: 'success',
  
    });
}

export function requisitesListKeyboard(requisites: { id: number; label: string | null; type: string; isPrimary: boolean }[]) {
  const kb = new InlineKeyboard();
  requisites.forEach((r, i) => {
    const label = r.label || `${r.type === 'card' ? '💳' : r.type === 'sbp' ? '📱' : '📞'} Карта ${i + 1}`;
    const primaryMark = r.isPrimary ? ' ⭐' : '';
    kb.text(`${label}${primaryMark}`, `requisite_select:${r.id}`).row();
  });
  kb.add({
  text: '➕ Добавить реквизиты',
  callback_data: 'add_requisite',
  style: 'success',
}).row();

  return kb;
}

export function withdrawalRequisitesKeyboard(
  requisites: {
    id: number;
    bank: string | null;
    details: string;
  }[]
) {
  const kb = new InlineKeyboard();

  requisites.forEach((r) => {
    kb.text(
      `${BankLabels[r.bank || ''] || r.bank || 'Банк'} | ${r.details}`,
      `withdrawal_requisite:${r.id}`
    ).row();
  });

  kb.add({
  icon_custom_emoji_id: '5397916757333654639',
  text: 'Добавить реквизиты',
  callback_data: 'add_requisites',
  style: 'success',
});

  return kb;
}

export function requisiteActionKeyboard(requisiteId: number) {
  return new InlineKeyboard()
    .text('⭐ Сделать основной', `requisite_set_primary:${requisiteId}`)
    .text('✏ Изменить', `requisite_edit:${requisiteId}`)
    .row()
    .text('🗑 Удалить', `requisite_delete:${requisiteId}`)
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function addRequisiteTypeKeyboard() {
  return new InlineKeyboard()
    .text('💳 Карта', 'add_requisite:card')
    .text('📱 СБП', 'add_requisite:sbp')
    .row()
    .text('📞 Телефон', 'add_requisite:phone')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function bankSelectionKeyboard(page: number = 0) {
  const banks = Object.entries(BankLabels);
  const perPage = 8;
  const totalPages = Math.ceil(banks.length / perPage);
  const start = page * perPage;
  const end = start + perPage;
  const pageBanks = banks.slice(start, end);

  const kb = new InlineKeyboard();
  pageBanks.forEach(([key, label]) => {
    kb.text(label, `bank_select:${key}`).row();
  });

  const navRow = [];
  if (page > 0) navRow.push({ text: '⬅ Назад', callback_data: `bank_page:${page - 1}` });
  if (page < totalPages - 1) navRow.push({ text: '➡ Далее', callback_data: `bank_page:${page + 1}` });

  if (navRow.length > 0) {
    const navButtons = navRow.map(b => InlineKeyboard.text(b.text, b.callback_data));
    kb.row(...navButtons);
  }

  kb.row().text('🔍 Поиск', 'bank_search').row();
  kb.text('⬅ Назад', 'back').text('🏠 Главное меню', 'main_menu');
  return kb;
}

export function historyKeyboard(page: number, totalPages: number) {
  const kb = new InlineKeyboard();
  const navRow = [];
  if (page > 0) navRow.push({ text: '⬅ Назад', callback_data: `history_page:${page - 1}` });
  if (page < totalPages - 1) navRow.push({ text: '➡ Далее', callback_data: `history_page:${page + 1}` });
  if (navRow.length > 0) {
    const navButtons = navRow.map(b => InlineKeyboard.text(b.text, b.callback_data));
    kb.row(...navButtons);
  }
  kb.row().text('🏠 Главное меню', 'main_menu');
  return kb;
}

export function partnersKeyboard() {
  return new InlineKeyboard()
    .text('📋 Копировать ссылку', 'copy_partner_link')
    .text('📊 Статистика', 'partner_stats')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function supportKeyboard() {
  return new InlineKeyboard()
    .text('🏠 Главное меню', 'main_menu');
}

export function supportMenuKeyboard() {
  return new InlineKeyboard()
    .add({ text: '🆘 Написать оператору', callback_data: 'support_start', style: 'success', icon_custom_emoji_id: '5472239203590888751' })
    .row()
    .add({ text: '❓ Частые вопросы', callback_data: 'faq', style: 'primary', icon_custom_emoji_id: '5472250091332993630' })
    .row()
    .add({ text: '⬅️ Назад', callback_data: 'back', icon_custom_emoji_id: '5215420556089776398' });
}

export function supportChatKeyboard() {
  return new InlineKeyboard()
    .add({ text: '⬅️ Назад', callback_data: 'back', icon_custom_emoji_id: '5215420556089776398' });
}

export function adminSupportKeyboard(ticketId: bigint) {
  return new InlineKeyboard()
    .add({ text: '✍️ Ответить', callback_data: `support_admin_reply:${ticketId}`, style: 'success', icon_custom_emoji_id: '5472239203590888751' })
    .add({ text: '🔒 Закрыть', callback_data: `support_admin_close:${ticketId}`, style: 'danger', icon_custom_emoji_id: '5397916757333654639' });
}

export function settingsKeyboard() {
  return new InlineKeyboard()
    .text('🌐 Язык', 'settings_language')
    .text('🔔 Уведомления', 'settings_notifications')
    .row()
    .text('🔒 Безопасность', 'settings_security')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function languageKeyboard() {
  return new InlineKeyboard()
    .text('🇷🇺 Русский', 'lang:ru')
    .text('🇬🇧 English', 'lang:en')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function notificationsKeyboard(currentState: boolean) {
  const label = currentState ? '🔔 Включены' : '🔕 Выключены';
  return new InlineKeyboard()
    .text(currentState ? '🔕 Выключить' : '🔔 Включить', 'toggle_notifications')
    .row()
    .text(`Статус: ${label}`, 'noop')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function securityKeyboard() {
  return new InlineKeyboard()
    .text('🔑 Сменить PIN-код', 'change_pin')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function bonusesKeyboard() {
  return new InlineKeyboard()
    .text('🎁 Доступные бонусы', 'available_bonuses')
    .text('📜 История бонусов', 'bonus_history')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}

export function confirmCancelKeyboard() {
  return new InlineKeyboard()
    .text('✅ Подтвердить', 'confirm')
    .text('❌ Отмена', 'cancel')
    .row()
    .text('⬅ Назад', 'back')
    .text('🏠 Главное меню', 'main_menu');
}
export function depositAdminKeyboard(depositId: bigint) {
  return new InlineKeyboard()
    .text('✅ Подтвердить', `deposit_accept:${depositId}`)
    .text('❌ Отклонить', `deposit_reject:${depositId}`);
}
const BANKS = [
  { key: 'sber', label: 'Сбербанк' },
  { key: 't_bank', label: 'Т-Банк' },
  { key: 'alfa', label: 'Альфа-Банк' },
  { key: 'vtb', label: 'ВТБ' },
  { key: 'gazprom', label: 'Газпромбанк' },
  { key: 'raiffeisen', label: 'Райффайзенбанк' },
  { key: 'sovcombank', label: 'Совкомбанк' },
  { key: 'rosbank', label: 'Росбанк' },
  { key: 'mkb', label: 'МКБ' },
  { key: 'psb', label: 'ПСБ' },
  { key: 'rshb', label: 'Россельхозбанк' },
  { key: 'domrf', label: 'Дом.РФ' },

  { key: 'uralsib', label: 'Уралсиб' },
  { key: 'ak_bars', label: 'Ак Барс' },
  { key: 'zenit', label: 'Банк Зенит' },
  { key: 'absolut', label: 'Абсолют Банк' },
  { key: 'avangard', label: 'Авангард' },
  { key: 'russia', label: 'Банк Россия' },
  { key: 'pochtabank', label: 'Почта Банк' },
  { key: 'otp', label: 'ОТП Банк' },
];

export function banksKeyboard(page = 1) {
  const keyboard = new InlineKeyboard();

  const perPage = 12;

  const start = (page - 1) * perPage;

  const banks = BANKS.slice(start, start + perPage);

  banks.forEach((bank) => {
  keyboard
    .text(bank.label, `bank_select:${bank.key}`)
    .row();
});

  // вот этой строки у тебя не было
  const totalPages = Math.ceil(BANKS.length / perPage);

  if (page > 1) {
  keyboard.add({
    text: '⬅️',
    callback_data: `banks_page:${page - 1}`,
    style: 'primary',
  });
} else {
  keyboard.add({
    text: ' ',
    callback_data: 'none',
  });
}

keyboard.add({
  text: `${page}/${totalPages}`,
  callback_data: 'none',
});

if (page < totalPages) {
  keyboard.add({
    text: '➡️',
    callback_data: `banks_page:${page + 1}`,
    style: 'primary',
  });
} else {
  keyboard.add({
    text: ' ',
    callback_data: 'none',
  });
}

  return keyboard;
}

export function requisitesPhoneKeyboard() {
  return new InlineKeyboard();
}
export function cardAddedKeyboard(cardId: number) {
  return new InlineKeyboard()
    .add({
      text: 'Включить продажу',
      callback_data: `activate_card:${cardId}`,
      style: 'success',
    });
}
