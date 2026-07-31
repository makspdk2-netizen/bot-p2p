import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { MessageService } from './message.service';

@Module({
  imports: [RedisModule],
  providers: [MessageService],
  exports: [MessageService],
})
export class CommonModule {}