import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GiftcardService } from './giftcard.service';
import { CreateGiftcardDto } from './dto/create-giftcard.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('giftcards')
export class GiftcardController {
  constructor(private readonly giftcardService: GiftcardService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async initiate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateGiftcardDto,
  ) {
    return this.giftcardService.initiate(user.userId, dto);
  }

  @Get('products')
  async getProducts(
    @Query('size') size?: string,
    @Query('page') page?: string,
    @Query('productName') productName?: string,
    @Query('countryCode') countryCode?: string,
    @Query('productCategoryId') productCategoryId?: string,
  ) {
    return this.giftcardService.getAll({
      size: size ? Number(size) : undefined,
      page: page ? Number(page) : undefined,
      productName,
      countryCode,
      productCategoryId,
    });
  }

  @Get('products/country/:countryCode')
  async getProductsByCountry(@Param('countryCode') countryCode: string) {
    return this.giftcardService.getProductsByCountry(countryCode);
  }

  @Get('products/:productId')
  async getProduct(@Param('productId') productId: string) {
    return this.giftcardService.getProduct(productId);
  }

  @Get('countries')
  async getCountries() {
    return this.giftcardService.getCountries();
  }

  @Get('categories')
  async getCategories() {
    return this.giftcardService.getCategories();
  }
}
