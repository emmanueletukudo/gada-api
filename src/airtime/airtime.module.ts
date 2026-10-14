import { Module } from '@nestjs/common';
import { AirtimeService } from './airtime.service';
import { AirtimeController } from './airtime.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { ReloadlyModule } from '../reloadly/reloadly.module';

@Module({
  imports: [TransactionsModule, ReloadlyModule],
  controllers: [AirtimeController],
  providers: [AirtimeService],
})
export class AirtimeModule {}
