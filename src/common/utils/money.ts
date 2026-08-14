export function formatMoney(value: number | string | { toString(): string }): string {
  const num = typeof value === 'number' ? value : Number(value.toString());
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRub(amount: number | string | { toString(): string }): string {
  return `${formatMoney(amount)} RUB`;
}
