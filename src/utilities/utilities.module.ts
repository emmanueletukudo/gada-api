import { Module } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { UtilitiesController } from './utilities.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { ReloadlyModule } from '../reloadly/reloadly.module';

@Module({
  imports: [TransactionsModule, ReloadlyModule],
  controllers: [UtilitiesController],
  providers: [UtilitiesService],
})
export class UtilitiesModule {}
