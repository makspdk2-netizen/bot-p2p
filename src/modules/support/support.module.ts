import { Module } from '@nestjs/common';
import { SupportScreen } from './support.screen';

@Module({
  providers: [SupportScreen],
  exports: [SupportScreen],
})
export class SupportModule {}
