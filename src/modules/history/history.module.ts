import { Module } from '@nestjs/common';
import { HistoryScreen } from './history.screen';

@Module({
  providers: [HistoryScreen],
  exports: [HistoryScreen],
})
export class HistoryModule {}
