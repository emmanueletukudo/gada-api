import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettlementAccount } from './entities/settlement-account.entity';
import { CreateSettlementAccountDto } from './dto/create-settlement-account.dto';
import { PaystackService } from '../virtual-account/providers/paystack/paystack.service';
import { VerifyBankAccountDto } from './entities/verify-bank-account.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
import { UpdateSettlementAccountDto } from './dto/update-settlement-account.dto';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class SettlementAccountsService {
  constructor(
    @InjectRepository(SettlementAccount)
    private readonly settlementRepo: Repository<SettlementAccount>,
    private readonly paystackService: PaystackService,
  ) {}

  async create(
    user: CurrentUserPayload,
    dto: CreateSettlementAccountDto,
  ): Promise<SettlementAccount> {
    if (!user || !user.userId) {
      throw new BadRequestException(
        'User identification missing from request.',
      );
    }

    if (!dto.bankCode) {
      throw new BadRequestException(
        'Bank code is required to create a settlement subaccount.',
      );
    }

    if (dto.isDefault) {
      await this.settlementRepo.update(
        { organizerId: user.userId, isDefault: true },
        { isDefault: false },
      );
    }

    let paystackSubaccountCode: string | undefined;

    try {
      const subaccountResponse = await this.paystackService.createSubaccount({
        business_name: dto.accountName,
        settlement_bank: dto.bankCode,
        account_number: dto.accountNumber,
        percentage_charge: 0,
        primary_contact_email: user.email,
      });

      paystackSubaccountCode = subaccountResponse.data.subaccount_code;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to register subaccount with Paystack: ${error?.message || error}`,
      );
    }

    const account = this.settlementRepo.create({
      ...dto,
      organizerId: user.userId,
      paystackSubaccountCode,
    });

    return await this.settlementRepo.save(account);
  }

  async update(
    id: string,
    user: CurrentUserPayload,
    dto: UpdateSettlementAccountDto,
  ): Promise<SettlementAccount> {
    this.assertOrganizerId(user?.userId);

    const account = await this.findOne(id, user.userId);

    if (dto.isDefault && !account.isDefault) {
      await this.settlementRepo.update(
        { organizerId: user.userId, isDefault: true },
        { isDefault: false },
      );
    }

    const isPaystackUpdateNeeded =
      (dto.accountName && dto.accountName !== account.accountName) ||
      (dto.accountNumber && dto.accountNumber !== account.accountNumber) ||
      (dto.bankCode && dto.bankCode !== account.bankCode);

    if (account.paystackSubaccountCode && isPaystackUpdateNeeded) {
      try {
        await this.paystackService.updateSubaccount(
          account.paystackSubaccountCode,
          {
            business_name: dto.accountName || account.accountName,
            settlement_bank: dto.bankCode || account.bankCode,
            account_number: dto.accountNumber || account.accountNumber,
          },
        );
      } catch (error: any) {
        throw new InternalServerErrorException(
          `Failed to update subaccount with Paystack: ${error?.message || error}`,
        );
      }
    } else if (!account.paystackSubaccountCode && isPaystackUpdateNeeded) {
      const bankCode = dto.bankCode || account.bankCode;
      if (bankCode) {
        const subaccount = await this.paystackService.createSubaccount({
          business_name: dto.accountName || account.accountName,
          settlement_bank: bankCode,
          account_number: dto.accountNumber || account.accountNumber,
          percentage_charge: 0,
          primary_contact_email: user.email,
        });
        account.paystackSubaccountCode = subaccount.subaccount_code;
      }
    }

    Object.assign(account, dto);

    return await this.settlementRepo.save(account);
  }

  async getSupportedBanks() {
    const banks = await this.paystackService.getBanks();
    return banks.map((bank) => ({
      bank: bank.name,
      code: bank.code,
    }));
  }

  async verifyBankAccount(dto: VerifyBankAccountDto) {
    const resolvedAccount = await this.paystackService.verifyAccount(
      dto.accountNumber,
      dto.bankCode,
    );
    return {
      accountNumber: resolvedAccount.account_number,
      accountName: resolvedAccount.account_name,
      bankCode: resolvedAccount.bank_id,
    };
  }

  async findAllForOrganizer(organizerId: string): Promise<SettlementAccount[]> {
     this.assertOrganizerId(organizerId);
    return await this.settlementRepo.find({
      where: { organizerId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizerId: string): Promise<SettlementAccount> {
     this.assertOrganizerId(organizerId);
    const account = await this.settlementRepo.findOne({
      where: { id, organizerId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException('Settlement account not found');
    }

    return account;
  }

  async remove(id: string, organizerId: string): Promise<void> {
     this.assertOrganizerId(organizerId);
    const account = await this.findOne(id, organizerId);
    account.isActive = false;
    await this.settlementRepo.save(account);
  }

  private assertOrganizerId(
    organizerId?: string,
  ): asserts organizerId is string {
    if (!organizerId) {
      throw new BadRequestException(
        'User identification missing from request.',
      );
    }
  }
}
