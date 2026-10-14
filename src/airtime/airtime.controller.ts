import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AirtimeService } from './airtime.service';
import { CreateAirtimeDto } from './dto/create-airtime.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('airtime')
export class AirtimeController {
  constructor(private readonly airtimeService: AirtimeService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async initiate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAirtimeDto,
  ) {
    return this.airtimeService.initiate(user.userId, dto);
  }

  @Get('operators')
  async getOperators(
    @Query('includeBundles') includeBundles?: string,
    @Query('includeData') includeData?: string,
    @Query('suggestedAmountsMap') suggestedAmountsMap?: string,
    @Query('size') size?: string,
  ) {
    return this.airtimeService.getOperators({
      includeBundles: includeBundles !== 'false',
      includeData: includeData !== 'false',
      suggestedAmountsMap: suggestedAmountsMap === 'true',
      size: size ? Number(size) : undefined,
    });
  }

  @Get('operators/:operatorId')
  async getOperatorById(@Param('operatorId') operatorId: string) {
    return this.airtimeService.getOperatorById(operatorId);
  }

  @Get('operators/fx-rate')
  async getFxRate(@Query('operatorId') operatorId: string) {
    return this.airtimeService.getFxRate(operatorId);
  }

  @Get('countries')
  async getCountries(
    @Query('size') size?: string,
    @Query('page') page?: string,
  ) {
    return this.airtimeService.getCountries({
      size: size ? Number(size) : undefined,
      page: page ? Number(page) : undefined,
    });
  }
}
