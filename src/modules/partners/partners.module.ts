import { Module } from '@nestjs/common';
import { PartnersScreen } from './partners.screen';

@Module({
  providers: [PartnersScreen],
  exports: [PartnersScreen],
})
export class PartnersModule {}
