import { faker } from '@faker-js/faker';
import envConfig from '@support/envConfig';
import { ApiResponse } from '../BaseHttpClient';
import { EndpointConfig } from '../config/EndpointConfig';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';

@RegisterService(SERVICE_KEYS.VTEX_MIDDLEWARE)
export class VtexMiddlewareService extends BaseService {
  /**
   * Registers merchant credentials in the VTEX public middleware.
   * Uses VTEX_MIDDLEWARE_URL as base (different from the service's main base URL).
   */
  async saveCredentials(
    merchantId: string,
    privateKey: string,
    publicKey: string
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: `${envConfig.VTEX_MIDDLEWARE_URL}/merchants/credentials`,
        method: 'POST',
        data: { merchant_id: merchantId, private_key: privateKey, public_key: publicKey },
      });
    } catch (error) {
      throw new Error(`VtexMiddlewareService.saveCredentials failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Creates a payment in the VTEX middleware and returns the order token.
   * Uses URL_MIDDLEWARE as base URL (set via fixture).
   */
  async createPayment(publicKey: string): Promise<string> {
    try {
      const ipAddress = faker.internet.ip();
      const orderFormId = faker.string.alphanumeric(16) + Date.now();

      const response = await this.httpClient.request<{ orderToken: string }>({
        url: EndpointConfig.getEndpoint('vtexMiddleware', 'createPayment'),
        method: 'POST',
        headers: { 'x-vtex-api-apptoken': publicKey },
        data: {
          vtexFlowType: 'V2',
          ipAddress,
          orderForm: { orderFormId },
        },
      });

      const { orderToken } = response.data;
      if (!orderToken) {
        throw new Error('orderToken not found in vtex createPayment response');
      }
      return orderToken;
    } catch (error) {
      throw new Error(`VtexMiddlewareService.createPayment failed: ${JSON.stringify(error)}`);
    }
  }
}
