import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportInquiriesController } from './support-inquiries.controller';
import { SupportInquiriesService } from './support-inquiries.service';
import { SupportInquiry } from './entities/support-inquiry.entity';
import { Order } from '../events/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupportInquiry, Event, Order])],
  controllers: [SupportInquiriesController],
  providers: [SupportInquiriesService],
  exports: [SupportInquiriesService],
})
export class SupportInquiriesModule {}
