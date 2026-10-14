import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateVirtualAccountDto } from "./dto/create-virtual-account.dto";
import { UpdateVirtualAccountDto } from "./dto/update-virtual-account.dto";
import {
  VirtualAccount,
  VirtualAccountProvider,
} from "./entities/virtual-account.entity";
import { UsersService } from "../users/users.service";
import { WalletService } from "../wallet/wallet.service";
import { PaystackService } from "./providers/paystack/paystack.service";

@Injectable()
export class VirtualAccountService {
  constructor(
    @InjectRepository(VirtualAccount)
    private readonly vaRepo: Repository<VirtualAccount>,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
  ) {}

  async createForUser(userId: string, dto: CreateVirtualAccountDto) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (dto.provider !== VirtualAccountProvider.PAYSTACK) {
      throw new Error(
        "Only PAYSTACK virtual accounts are implemented currently",
      );
    }

    let customer;
    let dedicated;

    try {
      customer = await this.paystackService.createCustomer({
        email: user.email,
        first_name: user.firstName?.trim() || "Gada",
        last_name: user.lastName?.trim() || "User",
      });
      const customerCode = customer?.data?.customer_code;
      if (!customerCode) {
        throw new Error("Failed to create Paystack customer");
      }

      dedicated = await this.paystackService.createDedicatedVirtualAccount({
        customer: customerCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Paystack virtual account creation failed: ${message}`);
    }

    const accountNumber = dedicated?.data?.account_number;
    const bankName = dedicated?.data?.bank?.name ?? dto.bankName;
    const providerReference = String(
      dedicated?.data?.id ??
        dedicated?.data?.account_name ??
        customer?.data?.customer_code,
    );

    if (!accountNumber) {
      throw new Error("Failed to create Paystack dedicated account");
    }

    const va = this.vaRepo.create({
      user,
      accountNumber,
      bankName,
      provider: VirtualAccountProvider.PAYSTACK,
      providerReference,
    });
    return this.vaRepo.save(va);
  }

  async handleFundingWebhook(payload: {
    provider: VirtualAccountProvider;
    providerReference: string;
    amount: string;
  }) {
    const va = await this.vaRepo.findOne({
      where: {
        provider: payload.provider,
        providerReference: payload.providerReference,
      },
      relations: ["user", "user.wallet"],
    });
    if (!va || !va.user) {
      return;
    }

    const wallet = va.user.wallet;
    if (!wallet) {
      return;
    }

    await this.walletService.credit(
      wallet,
      payload.amount,
      `VA_${payload.providerReference}`,
      "VIRTUAL_ACCOUNT_FUNDING",
    );
  }

  update(id: number, updateVirtualAccountDto: UpdateVirtualAccountDto) {
    return `This action updates a #${id} virtualAccount`;
  }

  remove(id: number) {
    return `This action removes a #${id} virtualAccount`;
  }
}
