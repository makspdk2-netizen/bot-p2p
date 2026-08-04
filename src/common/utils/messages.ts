export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatRub(amount: number): string {
  return amount.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' RUB';
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildBalanceMessage(
  balance: number,
  pending: number,
  earned: number,
  todayEarned: number,
  weekEarned: number,
  monthEarned: number,
  totalEarned: number,
): string {
  return `💳 <b>Баланс</b>

━━━━━━━━━━━━━━━━━━

<b>Баланс:</b>
${formatRub(balance)}

<b>В заявках:</b>
${formatRub(pending)}

<b>Заработано:</b>
${formatRub(earned)}

━━━━━━━━━━━━━━━━━━

📊 <b>Статистика:</b>

• Сегодня: ${formatRub(todayEarned)}
• Неделя: ${formatRub(weekEarned)}
• Месяц: ${formatRub(monthEarned)}
• Всего: ${formatRub(totalEarned)}`;
}

export function buildDepositMessage(currencyLabel: string, address: string): string {
  return `
 <b>Ваш адрес ${escapeHtml(currencyLabel)} для пополнения:</b>

<code>${escapeHtml(address)}</code> <tg-emoji emoji-id="5467432173113974705">💸</tg-emoji>

<tg-emoji emoji-id="5361758668914191912">🔹</tg-emoji><i>Баланс зачислится автоматически после подтверждения транзакции в сети.</i>
`;
}

export function buildSelectBankMessage(): string {
  return `
<tg-emoji emoji-id="5264895611517300926">💳</tg-emoji><b>Выберите банк для получения средств:

На эту карту будут поступать рубли за продажу вашей криптовалюты.
</b>
Добавьте карту, чтобы запустить продажу криптовалюты.<tg-emoji emoji-id="5406745015365943482">👇</tg-emoji>
`;
}

export function buildRequisitesListMessage(requisites: { id: number; label: string | null; type: string; bank: string | null; details: string; isPrimary: boolean }[]): string {
  if (requisites.length === 0) {
    return `<tg-emoji emoji-id="5472250091332993630">💳</tg-emoji><b>EPIC P2P | Мои реквизиты</b>

У вас пока нет сохранённых реквизитов.

Выберите карту для вывода средств или добавьте новые реквизиты<tg-emoji emoji-id="5406745015365943482">💳</tg-emoji>`;
  }

  let message = `<tg-emoji emoji-id="5472250091332993630">💳</tg-emoji> <b>EPIC P2P | Мои реквизиты</b>

Выберите карту для вывода средств или добавьте новые реквизиты

━━━━━━━━━━━━━━━━━━\n`;

  requisites.forEach((r, i) => {
    const typeLabel = r.type === 'card' ? '💳 Карта' : r.type === 'sbp' ? '📱 СБП' : '📞 Телефон';
    const primaryMark = r.isPrimary ? ' ⭐ Основной' : '';
    const bankInfo = r.bank ? `\nБанк: ${escapeHtml(r.bank)}` : '';
    message += `\n${typeLabel}${primaryMark}${bankInfo}\n${escapeHtml(r.details)}`;
    if (r.label) message += `\nНазвание: ${escapeHtml(r.label)}`;
    message += '\n━━━━━━━━━━━━━━━━━━\n';
  });

  return message;
}

export function buildRequisiteConfirmMessage(type: string, bank: string | null, details: string, label: string | null): string {
  const typeLabel = type === 'card' ? '💳 Карта' : type === 'sbp' ? '📱 СБП' : '📞 Телефон';
  let msg = `🏦 <b>Подтверждение реквизитов</b>

━━━━━━━━━━━━━━━━━━

<b>Тип:</b> ${typeLabel}`;
  if (bank) msg += `\n<b>Банк:</b> ${escapeHtml(bank)}`;
  msg += `\n<b>Реквизиты:</b> <code>${escapeHtml(details)}</code>`;
  if (label) msg += `\n<b>Название:</b> ${escapeHtml(label)}`;

  msg += `\n\nВсё верно?`;
  return msg;
}

export function buildHistoryMessage(
  operations: { id: number; type: string; currency: string | null; amountRub: number; description: string | null; createdAt: Date }[],
  page: number,
  totalPages: number,
): string {
  if (operations.length === 0) {
    return `📜 <b>История операций</b>

━━━━━━━━━━━━━━━━━━

У вас пока нет операций.`;
  }

  let message = `📜 <b>История операций</b>

━━━━━━━━━━━━━━━━━━\n`;

  operations.forEach((op) => {
    const emoji = op.type === 'deposit' ? '🟢' : op.type === 'withdrawal' ? '🔴' : op.type === 'bonus' ? '🎁' : '👥';
    const typeLabel = op.type === 'deposit' ? 'Пополнение' : op.type === 'withdrawal' ? 'Вывод' : op.type === 'bonus' ? 'Бонус' : 'Партнёрские';
    const currencyInfo = op.currency ? ` ${op.currency}` : '';
    const sign = op.type === 'deposit' || op.type === 'bonus' || op.type === 'partner_earning' ? '+' : '−';

    message += `\n${emoji} <b>${typeLabel}${currencyInfo}</b>
${sign}${formatRub(op.amountRub)}
${formatDate(op.createdAt)}
━━━━━━━━━━━━━━━━━━\n`;
  });

  message += `\nСтраница ${page + 1} из ${totalPages}`;
  return message;
}
export function buildPartnerStatsMessage(
  invited: number,
  active: number,
  income: number,
  history: { date: Date; amount: number }[],
): string {
  let msg = `
📊 <b>Статистика партнёрской программы</b>

━━━━━━━━━━━━━━━━━━

<b>Приглашено:</b> ${invited} чел.
<b>Активных:</b> ${active} чел.
<b>Всего доход:</b> ${formatRub(income)}

━━━━━━━━━━━━━━━━━━

<b>История начислений:</b>
`;

  if (history.length === 0) {
    msg += '\nПока нет начислений.';
  } else {
    history.forEach((h) => {
      msg += `\n+${formatRub(h.amount)} — ${formatDate(h.date)}`;
    });
  }

  return msg;
}
export function buildPartnerMessage(invited: number, income: number, link: string): string {
  return `
<tg-emoji emoji-id="5332724926216428039">🤝</tg-emoji> <b>Партнёрская программа EPIC</b>

Получайте процент с каждого вывода ваших рефералов:
• 1-й уровень: <b>1.00%</b> с ваших рефералов.
• 2-й уровень: <b>0.50%</b> с рефералов 2-го уровня.

<b>Ваша реферальная ссылка:</b>

<code>${escapeHtml(link)}</code><tg-emoji emoji-id="5467432173113974705">🔗</tg-emoji>

<tg-emoji emoji-id="5298614648138919107">📊</tg-emoji><b>Ваша статистика:</b>

Рефералов 1 уровня: <b>${invited}</b>|2 уровня: <b>0</b>

<b>Ваш текущий баланс:</b> ${formatRub(0)}
<b>Всего заработано:</b> ${formatRub(income)}
`;
}

export function buildBonusesMessage(available: { type: string; amount: number }[], history: { type: string; amount: number; date: Date }[]): string {
  let msg = `🎁 <b>Бонусы</b>

━━━━━━━━━━━━━━━━━━\n`;

  if (available.length > 0) {
    msg += `\n<b>Доступные бонусы:</b>\n`;
    available.forEach((b) => {
      msg += `\n• ${b.type === 'welcome' ? 'Приветственный' : b.type === 'deposit' ? 'Депозитный' : 'Партнёрский'} бонус: +${formatRub(b.amount)}`;
    });
  } else {
    msg += `\nНет доступных бонусов.`;
  }

  msg += `\n\n━━━━━━━━━━━━━━━━━━\n<b>История бонусов:</b>\n`;

  if (history.length === 0) {
    msg += '\nПока нет начисленных бонусов.';
  } else {
    history.forEach((b) => {
      msg += `\n• +${formatRub(b.amount)} — ${formatDate(b.date)}`;
    });
  }

  return msg;
}

export function buildTicketMessage(ticket: { id: number; subject: string; message: string; status: string; createdAt: Date }): string {
  const statusEmoji = ticket.status === 'open' ? '🟢' : ticket.status === 'in_progress' ? '🟡' : '🔴';
  const statusLabel = ticket.status === 'open' ? 'Открыто' : ticket.status === 'in_progress' ? 'В работе' : 'Закрыто';

  return `📝 <b>Обращение #${ticket.id}</b>

━━━━━━━━━━━━━━━━━━

<b>Тема:</b> ${escapeHtml(ticket.subject)}
<b>Сообщение:</b> ${escapeHtml(ticket.message)}
<b>Статус:</b> ${statusEmoji} ${statusLabel}
<b>Дата:</b> ${formatDateTime(ticket.createdAt)}`;
}

export function buildTicketsListMessage(tickets: { id: number; subject: string; status: string; createdAt: Date }[]): string {
  if (tickets.length === 0) {
    return `📋 <b>Мои обращения</b>

━━━━━━━━━━━━━━━━━━

У вас пока нет обращений.`;
  }

  let msg = `📋 <b>Мои обращения</b>

━━━━━━━━━━━━━━━━━━\n`;

  tickets.forEach((t) => {
    const statusEmoji = t.status === 'open' ? '🟢' : t.status === 'in_progress' ? '🟡' : '🔴';
    msg += `\n#${t.id} ${statusEmoji} ${escapeHtml(t.subject)}
${formatDate(t.createdAt)}
━━━━━━━━━━━━━━━━━━\n`;
  });

  return msg;
}

export function buildFaqMessage(entries: { id: number; question: string; answer: string }[]): string {
  let msg = `❓ <b>FAQ — Часто задаваемые вопросы</b>

━━━━━━━━━━━━━━━━━━\n`;

  entries.forEach((e) => {
    msg += `\n<b>❓ ${escapeHtml(e.question)}</b>\n${escapeHtml(e.answer)}\n━━━━━━━━━━━━━━━━━━\n`;
  });

  return msg;
}

export function buildSettingsMessage(): string {
  return `⚙ <b>Настройки</b>

━━━━━━━━━━━━━━━━━━

Выберите раздел настроек:`;
}

export function buildLanguageMessage(): string {
  return `🌐 <b>Язык</b>

━━━━━━━━━━━━━━━━━━

Выберите язык интерфейса:`;
}

export function buildNotificationsMessage(enabled: boolean): string {
  const status = enabled ? '🔔 Включены' : '🔕 Выключены';
  return `🔔 <b>Уведомления</b>

━━━━━━━━━━━━━━━━━━

<b>Статус:</b> ${status}

Управляйте уведомлениями о новых операциях и изменениях.`;
}

export function buildSecurityMessage(): string {
  return `🔒 <b>Безопасность</b>

━━━━━━━━━━━━━━━━━━

Управление безопасностью вашего аккаунта.

PIN-код используется для подтверждения операций вывода средств.`;
}

export function buildSupportMessage(): string {
  return `<tg-emoji emoji-id="5443038326535759644">⭐️</tg-emoji> <b>Поддержка</b>

━━━━━━━━━━━━━━━━━━

Контакты поддержки:
@rus_37x`;
}

export function buildAddRequisiteTypeMessage(): string {
  return `🏦 <b>Добавление реквизитов</b>

━━━━━━━━━━━━━━━━━━

Выберите тип реквизитов:`;
}

export function buildAddRequisiteBankMessage(): string {
  return `🏦 <b>Добавление реквизитов</b>

━━━━━━━━━━━━━━━━━━

Выберите банк из списка или воспользуйтесь поиском:`;
}

export function buildAddRequisiteDetailsMessage(): string {
  return `🏦 <b>Добавление реквизитов</b>

━━━━━━━━━━━━━━━━━━

Введите реквизиты карты (номер карты, номер телефона или другие данные):`;
}

export function buildAddRequisiteLabelMessage(): string {
  return `🏦 <b>Добавление реквизитов</b>

━━━━━━━━━━━━━━━━━━

Введите название для этих реквизитов.

Например: <i>Основная</i>, <i>Т-Банк</i>, <i>Рабочая</i>, <i>Зарплатная</i>`;
}

export function buildRequisiteDeletedMessage(): string {
  return `✅ <b>Реквизиты удалены</b>

━━━━━━━━━━━━━━━━━━

Реквизиты успешно удалены.`;
}

export function buildRequisiteSetPrimaryMessage(): string {
  return `✅ <b>Основные реквизиты изменены</b>

━━━━━━━━━━━━━━━━━━

Реквизиты установлены как основные.`;
}

export function buildWelcomeMessage(firstName: string, balance: number) {
  return `
<tg-emoji emoji-id="5217822164362739968">🔥</tg-emoji> <b>EPIC P2P | Главное меню</b>

<tg-emoji emoji-id="5215420556089776398">💳</tg-emoji> <b>Ваш баланс:</b> ${formatRub(balance)}

<tg-emoji emoji-id="5462902520215002477">⭐</tg-emoji> <b>Главные фишки:</b>
• Продавайте крипту с доплатой <b>+7%</b> к сумме.
• Моментальный вывод от <b>3000₽</b> — без долгого ожидания встречных заявок.

Выберите действие на клавиатуре ниже <tg-emoji emoji-id="5406745015365943482">👇</tg-emoji>
`;
}

export function buildUnknownCommandMessage(): string {
  return `❌ <b>Неизвестная команда</b>

━━━━━━━━━━━━━━━━━━

Пожалуйста, используйте кнопки меню для навигации.`;
}


export function buildEnterPhoneMessage(): string {
  return `
<tg-emoji emoji-id="5265074015868822600">📱</tg-emoji><b>Укажите номер телефона для переводов по СБП:</b>

<i>Введите его без знака «+», начиная с 7. Например: 79991234567</i>`;
}
export function buildCardHolderMessage(): string {
  return `
<tg-emoji emoji-id="5282843764451195532">👤</tg-emoji><b>Укажите имя держателя карты:</b>

<i>Например: Владимир К.</i>
`;
}
export function buildCardAddedMessage(): string {
  return `
<tg-emoji emoji-id="5206607081334906820">💳</tg-emoji><b>Карта успешно добавлена!</b>

❗️ <a href="https://telegra.ph/Instrukciya-po-rabote-s-P2P-rekvizitami-06-29">Обязательно прочитайте рекомендации по работе с EPIC P2P</a>

Чтобы начать продажу криптовалюты на эту карту, активируйте её кнопкой ниже<tg-emoji emoji-id="5406745015365943482">💳</tg-emoji>
`;
}
