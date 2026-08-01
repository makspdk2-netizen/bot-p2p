import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { BotModule } from './modules/bot/bot.module';
import { AdminApiModule } from './modules/admin-api/admin-api.module';
import { PaymentRequestsModule } from './modules/payment-requests/payment-requests.module';
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    BotModule,
    AdminApiModule
    ,PaymentRequestsModule
  ],
})
export class AppModule {}
