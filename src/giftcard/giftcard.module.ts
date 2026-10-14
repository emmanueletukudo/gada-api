import { Module } from '@nestjs/common';
import { GiftcardService } from './giftcard.service';
import { GiftcardController } from './giftcard.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { ReloadlyModule } from '../reloadly/reloadly.module';

@Module({
  imports: [TransactionsModule, ReloadlyModule],
  controllers: [GiftcardController],
  providers: [GiftcardService],
})
export class GiftcardModule {}
