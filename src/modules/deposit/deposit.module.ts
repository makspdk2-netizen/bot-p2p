import { Module } from '@nestjs/common';
import { DepositScreen } from './deposit.screen';

@Module({
  providers: [DepositScreen],
  exports: [DepositScreen],
})
export class DepositModule {}
