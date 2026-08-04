import { InlineKeyboard } from 'grammy';
import { BankLabels } from '../enums/bank.enum';
import { Keyboard } from 'grammy';
export const BANKS_PER_PAGE = 12;
export const PREMIUM_BACK_EMOJI_ID = '5976535107933050770';
export const PREMIUM_HOME_EMOJI_ID = '5240118799885158175';
export const PREMIUM_SENT_EMOJI_ID = '5206607081334906820';
export const PREMIUM_DIAMOND_EMOJI_ID = '5467432173113974705';
export const PREMIUM_CARD_EMOJI_ID = '5215420556089776398';
export const MAIN_MENU_BUTTON_TEXT = 'Главное меню';

function addBack(kb: InlineKeyboard, callbackData = 'back') {
  return kb.add({ text: 'Назад', callback_data: callbackData, icon_custom_emoji_id: PREMIUM_BACK_EMOJI_ID });
}

function addMainMenu(kb: InlineKeyboard) {
  return kb.add({ text: 'Главное меню', callback_data: 'main_menu', icon_custom_emoji_id: PREMIUM_HOME_EMOJI_ID });
}

export function mainReplyKeyboard() {
  return new Keyboard()
    .add({
      text: 'Пополнить',
      style: 'success',
      icon_custom_emoji_id: '5397916757333654639',
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
    .row()
    .add({
      text: MAIN_MENU_BUTTON_TEXT,
      icon_custom_emoji_id: PREMIUM_HOME_EMOJI_ID,
    })
    .resized();
}

export function backToMainKeyboard() {
  return addMainMenu(new InlineKeyboard());
}

export function backAndMainKeyboard() {
  const kb = new InlineKeyboard();
  addBack(kb);
  return addMainMenu(kb);
}

export function backKeyboard() {
  return addBack(new InlineKeyboard());
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
      style: 'success',
    })
    .row()
    .add({
      text: 'Gramm',
      callback_data: 'deposit:ton',
      icon_custom_emoji_id: '5377620962390857342',
    });
}

export function depositAddressKeyboard(currency: string) {
  const kb = new InlineKeyboard().add({ text: 'Я отправил', callback_data: `deposit_sent:${currency}`, style: 'success', icon_custom_emoji_id: PREMIUM_SENT_EMOJI_ID }).row();
  addBack(kb);
  return addMainMenu(kb);
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
  const kb = new InlineKeyboard()
    .text('⭐ Сделать основной', `requisite_set_primary:${requisiteId}`)
    .text('✏ Изменить', `requisite_edit:${requisiteId}`)
    .row()
    .text('🗑 Удалить', `requisite_delete:${requisiteId}`)
    .row();
  addBack(kb);
  return addMainMenu(kb);
}

export function addRequisiteTypeKeyboard() {
  const kb = new InlineKeyboard()
    .text('💳 Карта', 'add_requisite:card')
    .text('📱 СБП', 'add_requisite:sbp')
    .row()
    .text('📞 Телефон', 'add_requisite:phone')
    .row();
  addBack(kb);
  return addMainMenu(kb);
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
  addBack(kb);
  addMainMenu(kb);
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
  kb.row();
  addMainMenu(kb);
  return kb;
}

export function partnersKeyboard() {
  const kb = new InlineKeyboard()
    .text('📋 Копировать ссылку', 'copy_partner_link')
    .text('📊 Статистика', 'partner_stats')
    .row();
  addBack(kb);
  return addMainMenu(kb);
}

export function supportKeyboard() {
  return addMainMenu(new InlineKeyboard());
}

export function supportMenuKeyboard() {
  return new InlineKeyboard()
    .add({ text: 'Написать оператору', callback_data: 'support_start', style: 'danger', icon_custom_emoji_id: '5303138782004924588' })
    .row()
    .add({ text: 'Частые вопросы', callback_data: 'faq', style: 'success', icon_custom_emoji_id: '5436113877181941026' });
}

export function supportChatKeyboard() {
  return addBack(new InlineKeyboard(), 'support_back');
}

export function supportFaqKeyboard() {
  return addBack(new InlineKeyboard(), 'support_back');
}

export function adminSupportKeyboard(ticketId: bigint) {
  return new InlineKeyboard()
    .add({ text: '✍️ Ответить', callback_data: `support_admin_reply:${ticketId}`, style: 'success', icon_custom_emoji_id: '5472239203590888751' })
    .add({ text: '🔒 Закрыть', callback_data: `support_admin_close:${ticketId}`, style: 'danger', icon_custom_emoji_id: '5397916757333654639' });
}

export function settingsKeyboard() {
  const kb = new InlineKeyboard()
    .text('🌐 Язык', 'settings_language')
    .text('🔔 Уведомления', 'settings_notifications')
    .row()
    .text('🔒 Безопасность', 'settings_security')
    .row();
  addBack(kb);
  return addMainMenu(kb);
}

export function languageKeyboard() {
  const kb = new InlineKeyboard()
    .text('🇷🇺 Русский', 'lang:ru')
    .text('🇬🇧 English', 'lang:en')
    .row();
  addBack(kb);
  return addMainMenu(kb);
}

export function notificationsKeyboard(currentState: boolean) {
  const label = currentState ? '🔔 Включены' : '🔕 Выключены';
  const kb = new InlineKeyboard()
    .text(currentState ? '🔕 Выключить' : '🔔 Включить', 'toggle_notifications')
    .row()
    .text(`Статус: ${label}`, 'noop')
    .row();
  addBack(kb);
  return addMainMenu(kb);
}

export function securityKeyboard() {
  const kb = new InlineKeyboard()
    .text('🔑 Сменить PIN-код', 'change_pin')
    .row();
  addBack(kb);
  return addMainMenu(kb);
}

export function bonusesKeyboard() {
  const kb = new InlineKeyboard()
    .text('🎁 Доступные бонусы', 'available_bonuses')
    .text('📜 История бонусов', 'bonus_history')
    .row();
  addBack(kb);
  return addMainMenu(kb);
}

export function confirmCancelKeyboard() {
  const kb = new InlineKeyboard()
    .text('✅ Подтвердить', 'confirm')
    .text('❌ Отмена', 'cancel')
    .row();
  addBack(kb);
  return addMainMenu(kb);
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
    text: '\u2063',
    callback_data: `banks_page:${page - 1}`,
    style: 'primary',
    icon_custom_emoji_id: '5255703720078879038'
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
    text: '\u2063',
    callback_data: `banks_page:${page + 1}`,
    style: 'primary',
    icon_custom_emoji_id: '5253767677670862169'
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
