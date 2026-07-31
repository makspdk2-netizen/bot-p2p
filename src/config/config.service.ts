import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';

@Injectable()
export class ConfigService {
  private readonly envConfig: Record<string, string>;

  constructor() {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    this.envConfig = process.env as Record<string, string>;

    const missing = ['BOT_TOKEN', 'DATABASE_URL'].filter((key) => !this.envConfig[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  get botToken(): string {
    return this.get('BOT_TOKEN');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get redisHost(): string {
    return this.get('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return parseInt(this.get('REDIS_PORT', '6379'), 10);
  }

  get btcAddress(): string {
    return this.get('BTC_ADDRESS');
  }

  get ltcAddress(): string {
    return this.get('LTC_ADDRESS');
  }

  get usdtTrc20Address(): string {
    return this.get('USDT_TRC20_ADDRESS');
  }

  get usdtErc20Address(): string {
    return this.get('USDT_ERC20_ADDRESS');
  }

  get usdtBep20Address(): string {
    return this.get('USDT_BEP20_ADDRESS');
  }

  get tonAddress(): string {
    return this.get('TON_ADDRESS');
  }

  get botUsername(): string {
    return this.get('BOT_USERNAME');
  }

  getAddressForCurrency(currency: string): string {
    const map: Record<string, string> = {
      btc: this.btcAddress,
      ltc: this.ltcAddress,
      usdt_trc20: this.usdtTrc20Address,
      usdt_erc20: this.usdtErc20Address,
      usdt_bep20: this.usdtBep20Address,
      ton: this.tonAddress,
    };
    return map[currency] || '';
  }

  private get(key: string, defaultValue?: string): string {
    return this.envConfig[key] || defaultValue || '';
  }
}
