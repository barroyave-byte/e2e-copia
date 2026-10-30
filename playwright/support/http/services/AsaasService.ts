import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import { ApiResponse } from '../BaseHttpClient';

const ASAAS_ACCESS_TOKEN =
  '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwODQ3MzQ6OiRhYWNoX2JmZjA5YTYxLWMxMmUtNDgyYS05OTAwLTM5NjM2NjhiY2NiMQ==';

@RegisterService(SERVICE_KEYS.ASAAS)
export class AsaasService extends BaseService {
  async createWebhook(urlWebhookPix: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('asaas', 'createWebhook'),
        method: 'POST',
        headers: { access_token: ASAAS_ACCESS_TOKEN },
        data: {
          name: 'Webhook TEST E2E',
          url: urlWebhookPix,
          email: 'jroldan@deuna.com',
          enabled: true,
          interrupted: false,
          apiVersion: 3,
          authToken: null,
          sendType: 'SEQUENTIALLY',
          events: [
            'PIX_CREDIT_REFUND_REFUSED',
            'PIX_CREDIT_REFUND_DONE',
            'PIX_CREDIT_RECEIVED',
            'PIX_DEBIT_REFUNDED',
            'PIX_QR_CODE_PAYMENT_REFUSED',
            'PIX_QR_CODE_PAID',
          ],
        },
      });
    } catch (error) {
      throw new Error(`createWebhook failed: ${JSON.stringify(error)}`);
    }
  }

  async deleteWebhook(webhookId: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('asaas', 'deleteWebhook'),
        method: 'DELETE',
        headers: { access_token: ASAAS_ACCESS_TOKEN },
        pathParams: { webhookId },
      });
    } catch (error) {
      throw new Error(`deleteWebhook failed: ${JSON.stringify(error)}`);
    }
  }

  async simulatePixPayment(qrCode: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('asaas', 'simulatePixPayment'),
        method: 'POST',
        headers: { access_token: ASAAS_ACCESS_TOKEN },
        data: {
          qrCode: { payload: qrCode },
          value: 1.4,
        },
      });
    } catch (error) {
      throw new Error(`simulatePixPayment failed: ${JSON.stringify(error)}`);
    }
  }
}
