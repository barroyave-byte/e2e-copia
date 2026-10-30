import { expect } from '@playwright/test';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { RegisterService } from '../decorators/ServiceDecorator';
import { BaseService } from './BaseService';
import { ApiResponse } from '../BaseHttpClient';
import { TransactionTraceResponse } from '../models/transactionTrace';
import { EndpointConfig } from '../config/EndpointConfig';
import { pollUntil } from '../utils/PollingHelper';
import { describeApiError } from '../utils/describeApiError';

export interface TraceLogV2 {
  message: string;
  metadata?: { payload?: Record<string, unknown> };
}

@RegisterService(SERVICE_KEYS.TRANSACTION_TRACE)
export class TransactionTraceService extends BaseService {
  async getTransactionVisibilityLogs(
    orderId: string,
    subType: string,
    merchantId: string,
    merchantToken: string
  ): Promise<ApiResponse<TransactionTraceResponse[]>> {
    // Capturamos merchantId/token UNA sola vez aquí. pollUntil reintenta hasta 30s;
    // si re-leyéramos el global en cada intento, un valor momentáneamente vacío
    // haría que axios dropee el header 'X-Merchant-Id' y el trace responda 400.
    if (!merchantId) {
      throw new Error(
        `Cannot query trace logs for orderId=${orderId}: merchantId is empty ` +
          `(merchantId was empty at call time)`
      );
    }
    return pollUntil(
      () => this.fetchTransactionVisibilityLogs(orderId, subType, merchantId, merchantToken),
      (response) => response.data?.length > 0
    ).catch((error: Error) => {
      if (error.message.startsWith('Polling timed out')) {
        throw new Error(
          `Transaction visibility logs not available for orderId=${orderId}: ${error.message}`
        );
      }
      throw error;
    });
  }

  private async fetchTransactionVisibilityLogs(
    orderId: string,
    subType: string,
    merchantId: string,
    merchantToken: string
  ): Promise<ApiResponse<TransactionTraceResponse[]>> {
    // Guard final antes de armar el request: si merchantId es vacío, axios dropea
    // el header y el error se vuelve un 400 opaco. Fallamos con un mensaje claro.
    if (!merchantId) {
      throw new Error(`merchantId is empty while building trace request for orderId=${orderId}`);
    }
    try {
      const response = await this.httpClient.request<TransactionTraceResponse[]>({
        url: EndpointConfig.getEndpoint('transactionTrace', 'traceLogs'),
        method: 'GET',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        headers: {
          'X-Merchant-Id': merchantId,
        },
        pathParams: {
          order_id: orderId,
          sub_type: subType,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Get transaction visibility logs failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async getTraceLogsV2(
    transactionIds: string[],
    merchantId: string,
    merchantToken: string
  ): Promise<ApiResponse<TraceLogV2[]>> {
    const ids = [...new Set(transactionIds)];
    if (ids.length === 0 || ids.length > 3 || ids.some((id) => !id)) {
      throw new Error('Trace Logs V2 requires one to three non-empty transaction IDs');
    }
    try {
      const response = await this.httpClient.request<TraceLogV2[]>({
        url: EndpointConfig.getEndpoint('transactionTrace', 'traceLogsV2'),
        method: 'GET',
        params: {
          transaction_id: ids.join(','),
          sub_type: 'timeline,transaction_visibility',
        },
        headers: {
          Authorization: `Bearer ${merchantToken}`,
          'x-merchant-id': merchantId,
        },
        logging: { logHeaders: false, logData: false },
      });
      return response;
    } catch (error) {
      throw new Error(`Get Trace Logs V2 failed: ${describeApiError(error)}`);
    }
  }

  /**
   * Reads the transaction visibility logs until validateResponse() accepts them. The events are
   * written one by one after the purchase: getTransactionVisibilityLogs() returns as soon as there
   * is any, and a read 3 s after a purchase still lacked the merchant_user ones (PI-T618, run
   * regression-stg-41ba24a8), which were all there when read again later.
   */
  async waitForValidTransactionVisibilityLogs(
    orderId: string,
    merchantId: string,
    merchantToken: string,
    timeout = 30_000
  ): Promise<void> {
    await expect(async () => {
      this.validateResponse(
        await this.getTransactionVisibilityLogs(
          orderId,
          'transaction_visibility',
          merchantId,
          merchantToken
        )
      );
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout });
  }

  /**
   * Validates transaction trace response (replicates Postman script validations)
   * @param response - API response to validate
   * @param baseUrl - Base URL to skip validations for local env
   */
  validateResponse(response: ApiResponse<TransactionTraceResponse[]>): void {
    const data = response.data;

    // Validate status 200
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    // Validate non-empty array
    if (!data || data.length === 0) {
      throw new Error('Response must contain at least one event');
    }

    // Validate required object exists
    const hasRequired = data.some(
      (item) =>
        item.message === 'transaction_visibility' &&
        item.sub_type === 'transaction_visibility' &&
        item.audience === 'merchant_user'
    );
    if (!hasRequired) {
      throw new Error('Required transaction_visibility object not found');
    }

    // Validate content inside each item
    const skipDestinationEvents = [
      'tv_processing_purchase',
      'tv_processing_capture',
      'tv_processing_refund',
      'tv_processing_void',
      'tv_emit_event',
    ];

    for (const item of data) {
      const metadata = item.metadata;
      const tv = metadata.transaction_visibility;

      const needsDestination = !skipDestinationEvents.includes(tv.event_name);
      const eventId = tv.event_Id || tv.event_id || ''; // some services haven't upgraded to latest go-kit/checkpoint yet
      const isValid =
        metadata.contain_data &&
        eventId.length > 0 &&
        (!needsDestination || tv.destination.length > 0);

      if (!isValid) {
        throw new Error(`Invalid metadata for event: ${tv.event_name}`);
      }
    }
  }
}
