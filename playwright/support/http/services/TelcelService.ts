import { ApiResponse } from '../BaseHttpClient';
import { EndpointConfig } from '../config/EndpointConfig';
import { RegisterService } from '../decorators/ServiceDecorator';
import {
  TelcelInquiryRequest,
  TelcelInquiryResponse,
  TelcelOrderParams,
  TelcelOrderResult,
} from '../models/telcel';
import { TelcelOrderBodyBuilder } from '../testData/telcel/TelcelOrderBodyBuilder';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';

@RegisterService(SERVICE_KEYS.TELCEL)
export class TelcelService extends BaseService {
  async inquiry(body: TelcelInquiryRequest): Promise<ApiResponse<TelcelInquiryResponse>> {
    try {
      return await this.httpClient.request<TelcelInquiryResponse>({
        url: EndpointConfig.getEndpoint('telcel', 'inquiry'),
        method: 'POST',
        data: body,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      throw new Error(`TelcelService.inquiry failed: ${JSON.stringify(error)}`);
    }
  }

  async createOrder(params: TelcelOrderParams): Promise<TelcelOrderResult> {
    try {
      const body = TelcelOrderBodyBuilder.build(params);
      const response = await this.httpClient.request<{
        token: string;
        order: { order_id: string; transaction_id: string };
      }>({
        url: EndpointConfig.getEndpoint('telcel', 'createOrder'),
        method: 'POST',
        data: body,
        auth: { type: 'api-key', apiKey: params.privateKey },
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        token: response.data.token,
        orderId: response.data.order.order_id,
        transactionId: response.data.order.transaction_id,
      };
    } catch (error) {
      throw new Error(`TelcelService.createOrder failed: ${JSON.stringify(error)}`);
    }
  }
}
