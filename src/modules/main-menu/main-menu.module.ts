import { Module } from '@nestjs/common';
import { MainMenuScreen } from './main-menu.screen';

@Module({
  providers: [MainMenuScreen],
  exports: [MainMenuScreen],
})
export class MainMenuModule {}
