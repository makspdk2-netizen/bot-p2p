import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { MainMenuModule } from '../main-menu/main-menu.module';
import { BalanceModule } from '../balance/balance.module';
import { DepositModule } from '../deposit/deposit.module';
import { WithdrawalModule } from '../withdrawal/withdrawal.module';
import { HistoryModule } from '../history/history.module';
import { ProfileModule } from '../profile/profile.module';
import { RequisitesModule } from '../requisites/requisites.module';
import { PartnersModule } from '../partners/partners.module';
import { BonusesModule } from '../bonuses/bonuses.module';
import { SettingsModule } from '../settings/settings.module';
import { SupportModule } from '../support/support.module';
import { CommonModule } from '../../common/common.module';
import { PaymentRequestsModule } from '../payment-requests/payment-requests.module';

@Module({
  imports: [
    MainMenuModule,
    BalanceModule,
    DepositModule,
    WithdrawalModule,
    HistoryModule,
    ProfileModule,
    RequisitesModule,
    PartnersModule,
    BonusesModule,
    SettingsModule,
    SupportModule,
    CommonModule,
    WithdrawalModule
    ,PaymentRequestsModule
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
