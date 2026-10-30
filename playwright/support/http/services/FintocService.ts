import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import { ApiResponse } from '../BaseHttpClient';
import { fintocProcessor } from '../../interfaces/payment_processors/fintocProcessor';

@RegisterService(SERVICE_KEYS.FINTOC)
export class FintocService extends BaseService {
  async createWebhook(urlWebhookPix: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('fintoc', 'createWebhook'),
        method: 'POST',
        headers: { Authorization: fintocProcessor.private_api_key },
        data: {
          url: urlWebhookPix,
          description: 'Webhook endpoint for TEST E2E',
          name: 'DEUNA TEST E2E',
          enabled_events: ['checkout_session.finished', 'checkout_session.expired'],
        },
      });
    } catch (error) {
      throw new Error(`createWebhook failed: ${JSON.stringify(error)}`);
    }
  }

  async deleteWebhook(webhookId: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('fintoc', 'deleteWebhook'),
        method: 'DELETE',
        headers: { Authorization: fintocProcessor.private_api_key },
        pathParams: { webhookId },
      });
    } catch (error) {
      throw new Error(`deleteWebhook failed: ${JSON.stringify(error)}`);
    }
  }
}
