import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import { FraudProcessorData, FraudProcessorResponse } from '@support/http/models/guard/fraudProcessor';
import { ApiResponse } from '../BaseHttpClient';


@RegisterService(SERVICE_KEYS.GUARD)
export class GuardService extends BaseService {
  constructor(httpClient: any) {
    super(httpClient);
  }

  async createFraudProcessor(
    merchantToken: string,
    merchantId: string,
    merchantName: string,
    body: FraudProcessorData | any,
    expectError: boolean = false
  ): Promise<ApiResponse> {
    if (body.merchant_profile) {
      body.merchant_profile.merchant_id = merchantId;
      body.merchant_profile.name = merchantName;
    }
    try {
      const response = await this.httpClient.request<ApiResponse<FraudProcessorResponse>>({
        url: EndpointConfig.getEndpoint('guard', 'createFraudProcessor'),
        method: 'POST',
        data: body,
        headers: {
          Authorization: `Bearer ${merchantToken}`,
        },
        expectError: expectError,
      });

      return response;
    } catch (error) {
      throw new Error(`Fraud processor creation failed: ${JSON.stringify(error)}`);
    }
  }

  async getFraudProcessor(
    merchantToken: string,
    merchantId: string,
  ): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse<FraudProcessorResponse>>({
        url: EndpointConfig.getEndpoint('guard', 'getFraudProcessor'),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${merchantToken}`,
        },
        pathParams: {
          merchantId: merchantId,
        },
      });

      return response;
    } catch (error) {
      throw new Error(`Fraud processor creation failed: ${JSON.stringify(error)}`);
    }
  }
}
