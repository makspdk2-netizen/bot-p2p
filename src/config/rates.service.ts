import { Injectable } from '@nestjs/common';
import {
  COURSE_MARKUP_PERCENT,
  USER_BONUS_PERCENT,
  getCourseRateFromApiRate,
  getUserRateFromApiRate,
} from './rates.config';

type CoinGeckoResponse = Record<string, { rub?: number }>;

@Injectable()
export class RatesService {
  private cached: CoinGeckoResponse | null = null;
  private cachedAt = 0;
  private readonly cacheMs = 60_000;

  async getUserRate(currency: string): Promise<number> {
    const apiRate = await this.getApiRate(currency);
    return getUserRateFromApiRate(apiRate);
  }

  async getApiRate(currency: string): Promise<number> {
    const coinId = this.coinId(currency);
    const data = await this.getPrices();
    const rate = data[coinId]?.rub;

    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Курс для ${currency} не найден`);
    }

    return rate;
  }

  async getCourseRate(currency: string): Promise<number> {
    return getCourseRateFromApiRate(await this.getApiRate(currency));
  }

  async getDisplayRates(): Promise<Record<string, number>> {
    const currencies = ['btc', 'ltc', 'usdt_trc20', 'ton'];
    const rates = await Promise.all(
      currencies.map(async (currency) => [currency, await this.getCourseRate(currency)] as const),
    );
    return Object.fromEntries(rates);
  }

  getMarkupSummary(): string {
    return `Надбавка курса: ${COURSE_MARKUP_PERCENT.toFixed(2)}%, бонус: ${USER_BONUS_PERCENT.toFixed(2)}%`;
  }

  private async getPrices(): Promise<CoinGeckoResponse> {
    if (this.cached && Date.now() - this.cachedAt < this.cacheMs) {
      return this.cached;
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price' +
        '?ids=bitcoin,litecoin,tether,the-open-network&vs_currencies=rub',
    );

    if (!response.ok) {
      throw new Error(`CoinGecko вернул HTTP ${response.status}`);
    }

    const data = (await response.json()) as CoinGeckoResponse;
    this.cached = data;
    this.cachedAt = Date.now();
    return data;
  }

  private coinId(currency: string): string {
    if (currency === 'btc') return 'bitcoin';
    if (currency === 'ltc') return 'litecoin';
    if (currency.startsWith('usdt_')) return 'tether';
    if (currency === 'ton') return 'the-open-network';
    throw new Error(`Неподдерживаемая валюта: ${currency}`);
  }
}
