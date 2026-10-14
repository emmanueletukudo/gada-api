import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';


export interface PaystackBank {
  name: string;
  code: string;
  active: boolean;
  currency: string;
  type: string;
  id: number;
}

export interface BankAccountResolution {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export interface InitializeTransactionPayload {
  email: string;
  amount: number;
  currency?: string;
  reference?: string;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
  split_code?: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}

export interface CreateSubaccountPayload {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number; 
  primary_contact_email: string;
}

export interface UpdateSubaccountPayload {
  business_name?: string;
  settlement_bank?: string;
  account_number?: string;
  primary_contact_email?: string;
  percentage_charge?: number;
  active?: boolean;
}

@Injectable()
export class PaystackService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl() {
    return (
      this.config.get<string>('PAYSTACK_BASE_URL') ?? 'https://api.paystack.co'
    );
  }

  private get secretKey() {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret?.trim()) {
      throw new Error(
        'PAYSTACK_SECRET_KEY is not configured. Set the Paystack secret key in the environment.',
      );
    }
    return secret.trim();
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const payload = error.response?.data;
      const message = payload?.message ?? payload ?? error.message;
      throw new Error(
        `Paystack request failed${status ? ` [${status}]` : ''}: ${JSON.stringify(message)}`,
      );
    }
    throw error;
  }

  async createCustomer(payload: {
    email: string;
    first_name: string;
    last_name: string;
  }) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/customer`,
          {
            email: payload.email,
            first_name: payload.first_name,
            last_name: payload.last_name,
          },
          { headers: this.headers() },
        ),
      );
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getBanks(country = 'nigeria'): Promise<PaystackBank[]> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/bank?country=${country}`, {
          headers: this.headers(),
        }),
      );

      return response.data.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.response?.data?.message ||
          'Failed to fetch bank list from payment gateway',
      );
    }
  }

  async verifyAccount(
    accountNumber: string,
    bank_code: string,
  ): Promise<BankAccountResolution> {
    try {
      const accountDetails = await firstValueFrom(
        this.http.get(
          `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bank_code}`,
          {
            headers: this.headers(),
          },
        ),
      );

      return accountDetails.data.data;
    } catch (error: any) {
      console.log('error', error);
      const message =
        error.response?.data?.message ||
        'Could not verify bank account details';
      throw new BadRequestException(message);
    }
  }

  async createDedicatedVirtualAccount(payload: {
    customer: string;
    preferred_bank?: string;
  }) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/dedicated_account`, payload, {
          headers: this.headers(),
        }),
      );
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createSubaccount(payload: CreateSubaccountPayload) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/subaccount`, payload, {
          headers: this.headers(),
        }),
      );
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async updateSubaccount(
    subaccountCode: string,
    payload: UpdateSubaccountPayload,
  ) {

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/subaccount${subaccountCode}`, payload, {
          headers: this.headers()
        }),
      );
      return data
    }catch (err) {
      this.handleError(err)
    }
  }

  async initializeTransaction(payload: InitializeTransactionPayload) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/transaction/initialize`, payload, {
          headers: this.headers(),
        }),
      );
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(
          `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: this.headers(),
          },
        ),
      );
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }
}
