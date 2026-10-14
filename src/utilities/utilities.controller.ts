import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { MeterVerificationPipe } from './pipes/meter-verification.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('utilities')
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async initiate(
    @CurrentUser() user: CurrentUserPayload,
    @Body(MeterVerificationPipe) dto: CreateUtilityDto,
  ) {
    return this.utilitiesService.initiate(user.userId, dto);
  }

  @Get('billers')
  async getBillers(
    @Query('id') id?: string,
    @Query('name') name?: string,
    @Query('type') type?: string,
    @Query('serviceType') serviceType?: string,
  ) {
    return this.utilitiesService.listBillers({
      id: id ? Number(id) : undefined,
      name,
      type,
      serviceType,
    });
  }

  @Get('billers/:id')
  async getBillerById(@Param('id') id: string) {
    return this.utilitiesService.getBillerById(id);
  }
}
