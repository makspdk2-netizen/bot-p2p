import { Module } from '@nestjs/common';
import { RequisitesScreen } from './requisites.screen';

@Module({
  providers: [
    RequisitesScreen,
  ],
  exports: [
    RequisitesScreen,
  ],
})
export class RequisitesModule {}
