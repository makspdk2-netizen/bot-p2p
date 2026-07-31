export const CURRENCIES = [
  { key: 'btc', label: 'BTC', emoji: '₿' },
  { key: 'ltc', label: 'LTC', emoji: 'Ł' },
  { key: 'usdt_trc20', label: 'USDT TRC20', emoji: '💎' },
  { key: 'usdt_erc20', label: 'USDT ERC20', emoji: '💎' },
  { key: 'usdt_bep20', label: 'USDT BEP20', emoji: '💎' },
  { key: 'ton', label: 'TON', emoji: '💎' },
] as const;

export const CURRENCY_ADDRESS_MAP: Record<string, string> = {
  btc: 'BTC_ADDRESS',
  ltc: 'LTC_ADDRESS',
  usdt_trc20: 'USDT_TRC20_ADDRESS',
  usdt_erc20: 'USDT_ERC20_ADDRESS',
  usdt_bep20: 'USDT_BEP20_ADDRESS',
  ton: 'TON_ADDRESS',
};
