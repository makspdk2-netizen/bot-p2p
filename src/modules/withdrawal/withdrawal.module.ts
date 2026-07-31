import { Module } from '@nestjs/common';
import { WithdrawalScreen } from './withdrawal.screen';
import { RequisitesModule } from '../requisites/requisites.module';

@Module({
  imports: [
    RequisitesModule,
  ],
  providers: [
    WithdrawalScreen,
  ],
  exports: [
    WithdrawalScreen,
  ],
})
export class WithdrawalModule {}

