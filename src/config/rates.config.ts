/**
 * Централизованные настройки курса пополнения.
 * Меняйте значения только здесь — расчёты и сообщения используют их.
 */
export const COURSE_MARKUP_PERCENT = 0;
export const USER_BONUS_PERCENT = 7;

export function getUserRateFromApiRate(apiRateRub: number): number {
  const courseMarkup = 1 + COURSE_MARKUP_PERCENT / 100;
  const userBonus = 1 + USER_BONUS_PERCENT / 100;

  return apiRateRub * courseMarkup * userBonus;
}

export function getEffectiveMarkupPercent(): number {
  return ((1 + COURSE_MARKUP_PERCENT / 100) * (1 + USER_BONUS_PERCENT / 100) - 1) * 100;
}

export function formatRatePercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
