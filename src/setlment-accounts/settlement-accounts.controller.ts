import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { SettlementAccountsService } from './settlement-accounts.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateSettlementAccountDto } from './dto/create-settlement-account.dto';
import { VerifyBankAccountDto } from './entities/verify-bank-account.dto';
import type { CurrentUserPayload } from 'src/auth/current-user.decorator';
import { UpdateSettlementAccountDto } from './dto/update-settlement-account.dto';


@Controller('settlement-accounts')
@UseGuards(JwtAuthGuard)
export class SettlementAccountsController {
  constructor(private readonly service: SettlementAccountsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateSettlementAccountDto) {
    return await this.service.create(req.user, dto);
  }

  @Get('banks')
  async getBanks() {
    return await this.service.getSupportedBanks();
  }

  @Get()
  async findAll(@Req() req: any) {
    return await this.service.findAllForOrganizer(req.user.id);
  }

  @Get('verify')
  async verifyBankAccount(@Query() dto: VerifyBankAccountDto) {
    return await this.service.verifyBankAccount(dto);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return await this.service.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() user: CurrentUserPayload ,
    @Body() dto: UpdateSettlementAccountDto,
  ) {
    return await this.service.update(id, user, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.service.remove(id, req.user.id);
    return { message: 'Settlement account removed successfully' };
  }
}
