import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

type ReloadlyProduct = 'airtime' | 'giftcards' | 'utilities';

export interface AirtimeTopupPayload {
  operatorId: string;
  amount: string;
  useLocalAmount?: boolean;
  customIdentifier?: string;
  recipientEmail?: string;
  recipientPhone: {
    countryCode: string;
    number: string;
  };
}

export interface GiftcardOrderPayload {
  senderName: string;
  productId: number;
  quantity: number;
  unitPrice: number;
  customIdentifier?: string;
  recipientEmail?: string;
  productAdditionalRequirements?: Record<string, unknown>;
  recipientPhoneDetails?: {
    countryCode: string;
    phoneNumber: string;
  };
  preOrder?: boolean;
}

export interface UtilityPayPayload {
  subscriberAccountNumber: string;
  amount: number;
  billerId: number;
  amountId?: number;
  useLocalAmount?: boolean;
  referenceId?: string;
  customerEmail?: string;
  customerMobile?: string;
}

export interface AirtimeOperatorsQuery {
  includeBundles?: boolean;
  includeData?: boolean;
  suggestedAmountsMap?: boolean;
  size?: number;
  countryCode?: string;
  operatorName?: string;
  [key: string]: unknown;
}

export interface GiftcardProductsQuery {
  size?: number;
  page?: number;
  productName?: string;
  countryCode?: string;
  productCategoryId?: string;
  [key: string]: unknown;
}

export interface UtilityBillersQuery {
  id?: number;
  name?: string;
  type?: string;
  serviceType?: string;
  [key: string]: unknown;
}

@Injectable()
export class ReloadlyService {
  private readonly accessTokenStore = new Map<
    ReloadlyProduct | 'default',
    {
      token: string;
      expiresAt: number;
    }
  >();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private resolveConfigKey(key: string, service?: ReloadlyProduct) {
    return service ? `${key}_${service.toUpperCase()}` : key;
  }

  private getBaseUrl(service?: ReloadlyProduct): string {
    const baseUrl =
      this.config.get<string>(
        this.resolveConfigKey('RELOADLY_BASE_URL', service),
      ) ?? this.config.get<string>('RELOADLY_BASE_URL');

    if (!baseUrl) {
      throw new InternalServerErrorException(
        'Reloadly base URL is not configured. Set RELOADLY_BASE_URL or service-specific URL.',
      );
    }

    return baseUrl;
  }

  private getAuthConfig(service?: ReloadlyProduct) {
    const authUrl =
      this.config.get<string>(
        this.resolveConfigKey('RELOADLY_AUTH_URL', service),
      ) ?? this.config.get<string>('RELOADLY_AUTH_URL');
    const clientId =
      this.config.get<string>(
        this.resolveConfigKey('RELOADLY_CLIENT_ID', service),
      ) ?? this.config.get<string>('RELOADLY_CLIENT_ID');
    const clientSecret =
      this.config.get<string>(
        this.resolveConfigKey('RELOADLY_CLIENT_SECRET', service),
      ) ?? this.config.get<string>('RELOADLY_CLIENT_SECRET');
    const audience =
      this.config.get<string>(
        this.resolveConfigKey('RELOADLY_AUDIENCE', service),
      ) ?? this.config.get<string>('RELOADLY_AUDIENCE');

    if (!authUrl || !clientId || !clientSecret || !audience) {
      throw new InternalServerErrorException(
        'Reloadly authentication is not configured correctly. Verify auth URL, client id, client secret and audience.',
      );
    }

    return { authUrl, clientId, clientSecret, audience };
  }

  private async getAccessToken(service?: ReloadlyProduct): Promise<string> {
    const cacheKey = service ?? 'default';
    const cached = this.accessTokenStore.get(
      cacheKey as ReloadlyProduct | 'default',
    );
    const now = Date.now();
    if (cached && now < cached.expiresAt - 60_000) {
      return cached.token;
    }

    const { authUrl, clientId, clientSecret, audience } =
      this.getAuthConfig(service);
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      audience,
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post(authUrl, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      if (!data?.access_token || !data?.expires_in) {
        throw new InternalServerErrorException(
          'Reloadly access token response was invalid',
        );
      }

      const token = data.access_token as string;
      const expiresAt = now + Number(data.expires_in) * 1000;
      this.accessTokenStore.set(cacheKey as ReloadlyProduct | 'default', {
        token,
        expiresAt,
      });
      return token;
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Failed to retrieve Reloadly access token',
      );
    }
  }

  private async withAuthHeaders(service?: ReloadlyProduct) {
    const token = await this.getAccessToken(service);
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
    service?: ReloadlyProduct,
  ): Promise<T> {
    const baseUrl = this.getBaseUrl(service);
    const headers = await this.withAuthHeaders(service);

    const { data } = await firstValueFrom(
      this.http.get<T>(`${baseUrl}${path}`, {
        params,
        headers,
      }),
    );

    return data;
  }

  async post<T = unknown>(
    path: string,
    body: unknown,
    service?: ReloadlyProduct,
  ): Promise<T> {
    const baseUrl = this.getBaseUrl(service);
    const headers = await this.withAuthHeaders(service);

    const { data } = await firstValueFrom(
      this.http.post<T>(`${baseUrl}${path}`, body, {
        headers,
      }),
    );

    return data;
  }

  async getAirtimeOperators(query?: AirtimeOperatorsQuery) {
    return this.get('/operators', query, 'airtime');
  }

  async getAirtimeOperatorById(operatorId: string) {
    return this.get(`/operators/${operatorId}`, undefined, 'airtime');
  }

  async getAirtimeFxRate(operatorId: string | number) {
    return this.post(
      '/operators/fx-rate',
      { operatorId: operatorId.toString() },
      'airtime',
    );
  }

  async getAirtimeCountries(query?: { size?: number; page?: number }) {
    return this.get('/countries', query, 'airtime');
  }

  async topUpAirtime(payload: AirtimeTopupPayload) {
    return this.post('/topups', payload, 'airtime');
  }

  async getGiftcardProducts(query?: GiftcardProductsQuery) {
    return this.get('/products', query, 'giftcards');
  }

  async getGiftcardProductsByCountry(countryCode: string) {
    return this.get(
      `/countries/${countryCode}/products`,
      undefined,
      'giftcards',
    );
  }

  async getGiftcardProduct(productId: string | number) {
    return this.get(`/products/${productId}`, undefined, 'giftcards');
  }

  async getGiftcardCountries() {
    return this.get('/countries', undefined, 'giftcards');
  }

  async getGiftcardCategories() {
    return this.get('/categories', undefined, 'giftcards');
  }

  async createGiftcardOrder(payload: GiftcardOrderPayload) {
    return this.post('/orders', payload, 'giftcards');
  }

  async getUtilityBillers(query?: UtilityBillersQuery) {
    return this.get('/billers', query, 'utilities');
  }

  async getUtilityBillerById(billerId: number | string) {
    return this.get(`/billers/${billerId}`, undefined, 'utilities');
  }

  async payUtilityBill(payload: UtilityPayPayload) {
    return this.post('/pay', payload, 'utilities');
  }
}
