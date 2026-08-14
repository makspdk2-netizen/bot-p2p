import { Module } from '@nestjs/common';
import { ProfileScreen } from './profile.screen';

@Module({
  providers: [ProfileScreen],
  exports: [ProfileScreen],
})
export class ProfileModule {}
