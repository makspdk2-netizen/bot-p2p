import { Module } from '@nestjs/common';
import { AdminApiController } from './admin-api.controller';
import { AdminApiService } from './admin-api.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentRequestsModule } from '../payment-requests/payment-requests.module';

@Module({
  controllers: [
    AdminApiController
  ],
  providers:[
    AdminApiService,
    PrismaService
  ],
  imports: [PaymentRequestsModule],
})
export class AdminApiModule {}
