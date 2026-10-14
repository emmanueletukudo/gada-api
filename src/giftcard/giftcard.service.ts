import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateGiftcardDto } from './dto/create-giftcard.dto';
import { ReloadlyService } from '../reloadly/reloadly.service';

@Injectable()
export class GiftcardService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly reloadlyService: ReloadlyService,
  ) {}

  async initiate(userId: string, dto: CreateGiftcardDto) {
    return this.transactionsService.initiateGiftcard(userId, {
      amount: dto.amount,
      productId: dto.productId,
      countryCode: dto.countryCode,
      recipientEmail: dto.recipientEmail,
    });
  }

  async getAll(query?: {
    size?: number;
    page?: number;
    productName?: string;
    countryCode?: string;
    productCategoryId?: string;
  }) {
    return this.reloadlyService.getGiftcardProducts(query);
  }

  async getProductsByCountry(countryCode: string) {
    return this.reloadlyService.getGiftcardProductsByCountry(countryCode);
  }

  async getProduct(productId: string) {
    return this.reloadlyService.getGiftcardProduct(productId);
  }

  async getCountries() {
    return this.reloadlyService.getGiftcardCountries();
  }

  async getCategories() {
    return this.reloadlyService.getGiftcardCategories();
  }
}
