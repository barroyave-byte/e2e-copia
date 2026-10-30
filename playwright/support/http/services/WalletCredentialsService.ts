import { ApiResponse } from '../BaseHttpClient';
import { EndpointConfig } from '../config/EndpointConfig';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import {
  WalletCredentialsRequest,
  WalletCredentialsResponse,
} from '../models/wallet';
import {
  applePayCredentialDefault,
  googlePayCredentialDefault,
} from '../testData/wallet/walletCredentialsTestData';

@RegisterService(SERVICE_KEYS.WALLET_CREDENTIALS)
export class WalletCredentialsService extends BaseService {
  constructor(httpClient: any) {
    super(httpClient);
  }

  /**
   * Provisions wallet credentials in the DEUNA backend so the modular-checkout
   * iframe can resolve them at button-mount / payment-request time. Mirrors
   * the cURL pattern documented for `POST /wallet/credentials`.
   */
  private async createCredential(
    body: WalletCredentialsRequest,
    merchantToken: string,
    merchantId: string,
    overrides?: Partial<WalletCredentialsRequest>
  ): Promise<ApiResponse<WalletCredentialsResponse>> {
    return this.httpClient.request<WalletCredentialsResponse>({
      url: EndpointConfig.getEndpoint('wallet', 'credentials'),
      method: 'POST',
      data: { ...body, ...overrides, merchant_id: merchantId },
      auth: {
        type: 'bearer',
        token: merchantToken,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createApplePayCredential(
    merchantToken: string,
    merchantId: string,
    overrides?: Partial<WalletCredentialsRequest>
  ): Promise<ApiResponse<WalletCredentialsResponse>> {
    return this.createCredential(applePayCredentialDefault, merchantToken, merchantId, overrides);
  }

  async createGooglePayCredential(
    merchantToken: string,
    merchantId: string,
    overrides?: Partial<WalletCredentialsRequest>
  ): Promise<ApiResponse<WalletCredentialsResponse>> {
    return this.createCredential(googlePayCredentialDefault, merchantToken, merchantId, overrides);
  }
}
