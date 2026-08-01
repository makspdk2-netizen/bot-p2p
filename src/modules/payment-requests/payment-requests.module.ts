import { Module } from '@nestjs/common';
import { PaymentRequestsService } from './payment-requests.service';

@Module({
  providers: [PaymentRequestsService],
  exports: [PaymentRequestsService],
})
export class PaymentRequestsModule {}
