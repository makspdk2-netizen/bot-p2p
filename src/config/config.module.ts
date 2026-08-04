import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { RatesService } from './rates.service';

@Global()
@Module({
  providers: [ConfigService, RatesService],
  exports: [ConfigService, RatesService],
})
export class ConfigModule {}

export { ConfigService };
