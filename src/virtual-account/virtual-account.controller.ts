import { Body, Controller, Headers, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VirtualAccountService } from './virtual-account.service';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { VirtualAccountProvider } from './entities/virtual-account.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';
import { verifyPaystackSignature } from './providers/paystack/paystack.webhook';

@Controller('virtual-accounts')
export class VirtualAccountController {
  constructor(
    private readonly virtualAccountService: VirtualAccountService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createForCurrentUser(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateVirtualAccountDto) {
    return this.virtualAccountService.createForUser(user.userId, dto);
  }

  @Post('webhook/paystack')
  async paystackWebhook(
    @Req() req: { rawBody?: string; body: any },
    @Headers('x-paystack-signature') signature: string | undefined,
  ) {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
    const raw = req.rawBody ?? JSON.stringify(req.body ?? {});
    const ok = verifyPaystackSignature(raw, signature, secret);
    if (!ok) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    const event = req.body;
    const amountKobo = event?.data?.amount;
    const reference = event?.data?.reference;
    const dedicatedAccountId = event?.data?.dedicated_account?.id ?? event?.data?.dedicated_account_id;

    if (!dedicatedAccountId || !amountKobo) {
      return { received: true };
    }


    await this.virtualAccountService.handleFundingWebhook({
      provider: VirtualAccountProvider.PAYSTACK,
      providerReference: String(dedicatedAccountId),
      amount: String(amountKobo),
    });

    return { received: true };
  }
}
