import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import {
  FraudSettingsData,
  FraudSettingsResponse,
} from '@support/http/models/fraudSettings/fraudSettings';
import { ApiResponse } from '../BaseHttpClient';

@RegisterService(SERVICE_KEYS.FRAUD_SETTINGS)
export class FraudSettingsService extends BaseService {
  constructor(httpClient: any) {
    super(httpClient);
  }

  async getFraudSettings(
    merchantToken: string,
    merchantId: string,
    expectError: boolean = false
  ): Promise<ApiResponse<FraudSettingsResponse>> {
    try {
      const response = await this.httpClient.request<FraudSettingsResponse>({
        url: EndpointConfig.getEndpoint('fraudSettings', 'getFraudSettings'),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${merchantToken}`,
        },
        pathParams: {
          merchantId: merchantId,
        },
        expectError: expectError,
      });

      return response;
    } catch (error) {
      throw new Error(`Fraud settings retrieval failed: ${JSON.stringify(error)}`);
    }
  }

  async updateFraudSettings(
    merchantToken: string,
    merchantId: string,
    body: FraudSettingsData,
    expectError: boolean = false
  ): Promise<ApiResponse<FraudSettingsResponse>> {
    try {
      const response = await this.httpClient.request<FraudSettingsResponse>({
        url: EndpointConfig.getEndpoint('fraudSettings', 'updateFraudSettings'),
        method: 'PUT',
        data: body,
        headers: {
          Authorization: `Bearer ${merchantToken}`,
        },
        pathParams: {
          merchantId: merchantId,
        },
        expectError: expectError,
      });

      return response;
    } catch (error) {
      throw new Error(`Fraud settings update failed: ${JSON.stringify(error)}`);
    }
  }

  async deleteFraudSettings(
    merchantToken: string,
    merchantId: string,
    expectError: boolean = false
  ): Promise<ApiResponse<void>> {
    try {
      const response = await this.httpClient.request<void>({
        url: EndpointConfig.getEndpoint('fraudSettings', 'deleteFraudSettings'),
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${merchantToken}`,
        },
        pathParams: {
          merchantId: merchantId,
        },
        expectError: expectError,
      });

      return response;
    } catch (error) {
      throw new Error(`Fraud settings deletion failed: ${JSON.stringify(error)}`);
    }
  }
}
