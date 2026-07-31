import { Module } from '@nestjs/common';
import { BalanceScreen } from './balance.screen';

@Module({
  providers: [BalanceScreen],
  exports: [BalanceScreen],
})
export class BalanceModule {}
