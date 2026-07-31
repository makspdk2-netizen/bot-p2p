import { Module } from '@nestjs/common';
import { SettingsScreen } from './settings.screen';

@Module({
  providers: [SettingsScreen],
  exports: [SettingsScreen],
})
export class SettingsModule {}
