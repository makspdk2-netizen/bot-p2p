import { Module } from '@nestjs/common';
import { BonusesScreen } from './bonuses.screen';

@Module({
  providers: [BonusesScreen],
  exports: [BonusesScreen],
})
export class BonusesModule {}
