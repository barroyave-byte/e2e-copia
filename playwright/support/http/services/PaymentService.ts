import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import { buildWorldpayWebhookXml } from '@support/http/testData/payment';
import {
  CaptureRequestV2,
  CaptureResponseV2,
  ConfigurationMerchantPaymentsRequest,
  ConfigurationMerchantPaymentsResponse,
  ConfigurationMerchantPaymentsData,
  PurchaseRequestV2,
  PurchaseRequest,
  PurchaseResponse,
  RefundBodyV2,
  RefundResponseV2,
  TransactionWebHookData,
  TransactionWebHookResponse,
  VerifierCredentialsRequest,
  VerifierCredentialsResponse,
  VoidAsyncResponse,
} from '../models/payment';
import { ApiError, ApiResponse } from '../BaseHttpClient';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { DEFAULT_VERIFY_CREDENTIALS_AMEX } from '../testData/payment/VerifyCredentials';
import {
  BaseProcessor,
  ConnectionProcessorData,
} from '@support/interfaces/payment_processors/baseProcessor';
import { redact } from 'playwright/framework/redact';
import { describeApiError } from '../utils/describeApiError';
import { SAFE_RETRY_STATUSES_FOR_PURCHASE } from '../utils/retryPolicy';

/**
 * A processor creation the API rejected inside an HTTP 200 (`{"data": null, "error": {...}}`).
 * Carries the API's error code and description, so callers decide on them instead of parsing
 * the message.
 */
export class ProcessorCreationError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly description?: string
  ) {
    super(message);
    this.name = 'ProcessorCreationError';
  }
}

@RegisterService(SERVICE_KEYS.PAYMENT)
export class PaymentService extends BaseService {
  constructor(httpClient: any) {
    super(httpClient);
  }

  async purchase(
    privateKey: string,
    userToken: string,
    purchaseRequest: PurchaseRequest,
    expectError: boolean = false
  ): Promise<ApiResponse<PurchaseResponse>> {
    try {
      const response = await this.httpClient.request<PurchaseResponse>({
        url: EndpointConfig.getEndpoint('payment', 'purchase'),
        retryOn: SAFE_RETRY_STATUSES_FOR_PURCHASE,
        data: purchaseRequest,
        method: 'POST',
        auth: {
          type: 'bearer',
          token: userToken,
        },
        headers: {
          'x-api-key': privateKey,
        },
        expectError: expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Purchase failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async purchaseV2(
    privateKey: string,
    userToken: string,
    purchaseRequest: PurchaseRequestV2,
    expectError: boolean = false
  ): Promise<ApiResponse<PurchaseResponse>> {
    try {
      const response = await this.httpClient.request<PurchaseResponse>({
        url: EndpointConfig.getEndpoint('payment', 'purchaseV2'),
        retryOn: SAFE_RETRY_STATUSES_FOR_PURCHASE,
        data: purchaseRequest,
        method: 'POST',
        auth: {
          type: 'bearer',
          token: userToken,
        },
        expectError: expectError,
        headers: {
          'x-api-key': privateKey,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Purchase V2 failed: ${JSON.stringify(error)}`);
    }
  }

  async captureV2(
    privateKey: string,
    orderToken: string,
    options?: {
      amount?: number;
      reason?: string;
      final_capture?: boolean;
      expectError?: boolean;
    }
  ): Promise<ApiResponse<CaptureResponseV2>> {
    try {
      const captureRequest: CaptureRequestV2 = {
        reason: options?.reason ?? 'capture reason',
        ...(options?.amount !== undefined ? { amount: options.amount } : {}),
        ...(options?.final_capture !== undefined ? { final_capture: options.final_capture } : {}),
      };

      const response = await this.httpClient.request<CaptureResponseV2>({
        url: EndpointConfig.getEndpoint('payment', 'captureV2'),
        data: captureRequest,
        method: 'POST',
        expectError: options?.expectError ?? false,
        headers: {
          'x-api-key': privateKey,
        },
        pathParams: {
          orderToken: orderToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Capture V2 failed: ${JSON.stringify(error)}`);
    }
  }

  /** @internal Use apiCallNewman.refundOrderV2 instead of calling this directly from specs. */
  async refundV2(
    privateKey: string,
    orderToken: string,
    options: RefundBodyV2 = {}
  ): Promise<ApiResponse<RefundResponseV2>> {
    const { expectError = false, ...bodyFields } = options;

    const body = {
      reason: bodyFields.reason ?? 'refund reason',
      ...(bodyFields.amount !== undefined && { amount: bodyFields.amount }),
      ...(bodyFields.is_final !== undefined && { final_refund: bodyFields.is_final }),
    };

    try {
      return await this.httpClient.request<RefundResponseV2>({
        url: EndpointConfig.getEndpoint('payment', 'refundV2'),
        method: 'POST',
        pathParams: { orderToken },
        data: body,
        expectError,
        auth: { type: 'api-key', apiKey: privateKey },
      });
    } catch (error) {
      throw new Error(`refundV2 failed: ${JSON.stringify(error)}`);
    }
  }

  async refundAsync(
    orderToken: string,
    privateKey: string,
    amount: number,
    reason: string
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('payment', 'refundAsync'),
        method: 'POST',
        pathParams: { order_token: orderToken },
        auth: { type: 'api-key', apiKey: privateKey },
        data: { amount, reason },
      });
    } catch (error) {
      throw new Error(`refundAsync failed: ${JSON.stringify(error)}`);
    }
  }

  async voidAsync(
    orderToken: string,
    privateKey: string,
    amount: number,
    reason: string
  ): Promise<ApiResponse<VoidAsyncResponse>> {
    try {
      return await this.httpClient.request<VoidAsyncResponse>({
        url: EndpointConfig.getEndpoint('payment', 'voidAsync'),
        method: 'POST',
        pathParams: { order_token: orderToken },
        auth: { type: 'api-key', apiKey: privateKey },
        data: { amount, reason },
      });
    } catch (error) {
      throw new Error(`voidAsync failed: ${JSON.stringify(error)}`);
    }
  }

  async captureAsync(
    orderToken: string,
    privateKey: string,
    amount: number,
    reason: string
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('payment', 'captureAsync'),
        method: 'POST',
        pathParams: { order_token: orderToken },
        auth: { type: 'api-key', apiKey: privateKey },
        data: { amount, reason },
      });
    } catch (error) {
      throw new Error(`captureAsync failed: ${JSON.stringify(error)}`);
    }
  }

  async getBinInfo(bin: string, privateKey: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('payment', 'binDetector'),
        method: 'GET',
        pathParams: { bin },
        auth: { type: 'api-key', apiKey: privateKey },
      });
    } catch (error) {
      throw new Error(`getBinInfo failed: ${JSON.stringify(error)}`);
    }
  }

  async configurationMerchantPayments(
    configMerchantPaymentsRequest: ConfigurationMerchantPaymentsRequest
  ): Promise<ApiResponse<ConfigurationMerchantPaymentsResponse>> {
    try {
      const response = await this.httpClient.request<ConfigurationMerchantPaymentsResponse>({
        url: EndpointConfig.getEndpoint('payment', 'configMerchantPayments'),
        data: configMerchantPaymentsRequest.configurationMerchantPaymentsData,
        method: 'POST',
        auth: {
          type: 'bearer',
          token: configMerchantPaymentsRequest.merchantToken,
        },
        pathParams: {
          merchantId: configMerchantPaymentsRequest.merchantId,
          storeId: configMerchantPaymentsRequest.storeId,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Configuration merchant payments failed: ${describeApiError(error)}`);
    }
  }

  async deleteConfigMerchantPayments(
    merchantToken: string,
    merchantId: string,
    configId: string,
    storeId: string = 'all'
  ): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('payment', 'deleteConfigMerchantPayments'),
        method: 'DELETE',
        pathParams: {
          merchantId: merchantId,
          storeId: storeId,
          configId: configId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Delete config merchant payments failed: ${describeApiError(error)}`);
    }
  }

  async createConfigMerchantPayments(
    createConfigMerchantPaymentsData: ConfigurationMerchantPaymentsData,
    merchantId: string,
    merchantToken: string
  ): Promise<ApiResponse<ConfigurationMerchantPaymentsResponse>> {
    try {
      const response = await this.httpClient.request<ConfigurationMerchantPaymentsResponse>({
        url: EndpointConfig.getEndpoint('payment', 'createConfigMerchantPayments'),
        data: createConfigMerchantPaymentsData,
        method: 'POST',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        pathParams: {
          merchantId: merchantId,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Create config merchant payments failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async createVerifierCredentials(
    createVerifierCredentialsRequest: VerifierCredentialsRequest
  ): Promise<ApiResponse<VerifierCredentialsResponse>> {
    try {
      const response = await this.httpClient.request<VerifierCredentialsResponse>({
        url: EndpointConfig.getEndpoint('payment', 'createVerifierCredentials'),
        data: createVerifierCredentialsRequest.verifierCredentialsData,
        method: 'POST',
        auth: {
          type: 'bearer',
          token: createVerifierCredentialsRequest.merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Create verifier credentials failed: ${describeApiError(error)}`);
    }
  }

  async deleteVerifierCredentials(
    merchantToken: string,
    verifierCredentialsId: string
  ): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('payment', 'deleteVerifierCredentials'),
        method: 'DELETE',
        pathParams: {
          verifierCredentialsId: verifierCredentialsId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Delete verifier credentials failed: ${describeApiError(error)}`);
    }
  }

  async enableVerifierCredentials(
    merchantToken: string,
    verifierCredentialsId: string
  ): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('payment', 'enableVerifierCredentials'),
        method: 'PATCH',
        pathParams: {
          verifierCredentialsId: verifierCredentialsId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Enable verifier credentials failed: ${describeApiError(error)}`);
    }
  }

  async paymentProcessor(merchantId: string, merchantToken: string): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('payment', 'processors'),
        method: 'GET',
        pathParams: {
          merchantId: merchantId,
          storeCode: 'all',
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        logging: {
          logRequest: true,
          logResponse: false,
          logHeaders: false,
          logData: false,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Payment processor failed: ${describeApiError(error)}`);
    }
  }

  async createPaymentProcessor(
    merchantId: string,
    merchantToken: string,
    processorData: ConnectionProcessorData
  ): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('payment', 'processors'),
        method: 'POST',
        pathParams: {
          merchantId: merchantId,
          storeCode: 'all',
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        data: processorData,
        logging: {
          logRequest: true,
          logResponse: true,
          logHeaders: false,
          logData: false,
        },
      });
      const id = response.data?.data?.id;
      if (!id) {
        const body = response.data as { error?: Partial<ApiError> } | null;
        // A 200 without an id used to surface as "Create payment processor failed: {}" (the
        // TypeError of reading data.id serialises to {}): show what came back instead.
        throw new ProcessorCreationError(
          `Create payment processor failed: HTTP ${response.status} without data.id: ${JSON.stringify(redact(response.data))}`,
          body?.error?.code,
          body?.error?.description
        );
      }
      return id;
    } catch (error) {
      if (error instanceof ProcessorCreationError) throw error;
      const detail =
        error instanceof Error ? error.message : JSON.stringify(redact(error), null, 2);
      throw new Error(`Create payment processor failed: ${detail}`);
    }
  }

  async deletePaymentProcessor(
    processorId: string,
    merchantId: string,
    merchantToken: string,
    storeCode: string = 'all'
  ): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('payment', 'deletePaymentProcessor'),
        method: 'DELETE',
        pathParams: {
          processorId: processorId,
          merchantId: merchantId,
          storeCode: storeCode,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        // The response echoes the deleted processor, PSP credentials included.
        logging: { logData: false },
      });
      return response;
    } catch (error) {
      throw new Error(`Delete payment processor failed: ${describeApiError(error)}`);
    }
  }

  async runPaymentCron(): Promise<void> {
    try {
      const response = await this.httpClient.request({
        url: EndpointConfig.getEndpoint('payment', 'runCron'),
        method: 'GET',
        expectError: true,
      });
      console.log('paymentCron executed:', JSON.stringify(response.data));
    } catch (error) {
      throw new Error(`runPaymentCron failed: ${JSON.stringify(error)}`);
    }
  }

  async sendSpeiOpmWebhook(body: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const response = await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('payment', 'sendSpeiOpmWebhook'),
        method: 'POST',
        data: body,
      });
      return response;
    } catch (error) {
      throw new Error(`Send SPEI OPM webhook failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async simulateWorldpayWebhook(
    orderToken: string,
    processorName: string,
    merchantId: string,
    paymentStatus: string,
    privateKey: string
  ): Promise<void> {
    try {
      // Step 1: get external_transaction_id from order
      const orderResp = await this.httpClient.request({
        url: EndpointConfig.getEndpoint('ema', 'getOrder'),
        method: 'GET',
        pathParams: { order_token: orderToken },
        auth: { type: 'api-key', apiKey: privateKey },
      });
      const externalTxId = (orderResp.data as any).order.payment.data.external_transaction_id;

      // Step 2: send XML webhook
      const xmlBody = buildWorldpayWebhookXml({
        merchantId,
        externalTxId,
        paymentStatus,
      });

      await this.httpClient.request({
        url: EndpointConfig.getEndpoint('payment', 'worldpayWebhook'),
        method: 'POST',
        pathParams: { processorName },
        data: xmlBody,
        headers: { 'Content-Type': 'application/xml' },
      });
    } catch (error) {
      throw new Error(`simulateWorldpayWebhook failed: ${JSON.stringify(error)}`);
    }
  }

  async sendPaymentWebhook<T>(
    merchantId: string,
    merchantPaymentProcessorId: string,
    data: T | TransactionWebHookData
  ): Promise<TransactionWebHookResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse<TransactionWebHookResponse>>({
        url: EndpointConfig.getEndpoint('payment', 'sendPaymentWebhook'),
        method: 'POST',
        pathParams: {
          merchant_payment_processor_id: merchantPaymentProcessorId,
        },
        headers: {
          'X-Merchant-Id': merchantId,
        },
        data: data,
      });
      return response;
    } catch (error) {
      throw new Error(`Send webhook failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async sendWebhookByProcessorName(
    processorName: string,
    body: Record<string, unknown>
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('payment', 'worldpayWebhook'),
        method: 'POST',
        pathParams: { processorName },
        data: body,
      });
    } catch (error) {
      throw new Error(`sendWebhookByProcessorName failed: ${JSON.stringify(error)}`);
    }
  }

  async sendWebhookByProcessorId(
    merchantToken: string,
    processorId: string,
    body: Record<string, unknown>
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('payment', 'xmlWebhookByProcessorId'),
        method: 'POST',
        auth: { type: 'bearer', token: merchantToken },
        data: body,
        pathParams: { processorId },
      });
    } catch (error) {
      throw new Error(`sendWebhookByProcessorId failed: ${JSON.stringify(error)}`);
    }
  }

  async sendXmlWebhookByProcessorId(
    merchantToken: string,
    processorId: string,
    xmlBody: string
  ): Promise<ApiResponse<string>> {
    try {
      return await this.httpClient.request<string>({
        url: EndpointConfig.getEndpoint('payment', 'xmlWebhookByProcessorId'),
        method: 'POST',
        auth: { type: 'bearer', token: merchantToken },
        headers: { 'Content-Type': 'application/xml' },
        data: xmlBody,
        pathParams: { processorId },
      });
    } catch (error) {
      throw new Error(`sendXmlWebhookByProcessorId failed: ${JSON.stringify(error)}`);
    }
  }

  async sendXmlWebhookByProcessorName(
    merchantToken: string,
    processorName: string,
    xmlBody: string
  ): Promise<ApiResponse<string>> {
    try {
      return await this.httpClient.request<string>({
        url: EndpointConfig.getEndpoint('payment', 'xmlWebhookByProcessorName'),
        method: 'POST',
        auth: { type: 'bearer', token: merchantToken },
        headers: { 'Content-Type': 'application/xml' },
        data: xmlBody,
        pathParams: { processorName },
      });
    } catch (error) {
      throw new Error(`sendXmlWebhookByProcessorName failed: ${JSON.stringify(error)}`);
    }
  }

  async purchaseFraude(
    merchantId: string,
    userToken: string,
    body: Record<string, unknown>,
    expectError: boolean = true
  ): Promise<ApiResponse<unknown>> {
    try {
      const response = await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('payment', 'purchaseFraude'),
        retryOn: SAFE_RETRY_STATUSES_FOR_PURCHASE,
        method: 'POST',
        data: body,
        auth: { type: 'bearer', token: userToken },
        headers: { 'X-Merchant-Id': merchantId, 'X-Store-Code': 'all' },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`purchaseFraude failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Applies three PSP tokenization configurations to a merchant's store:
   * USE_PSP_TOKENIZATION, USE_FRANCHISE_MODEL, and PSP_SEND_METADATA.
   */
  async configMerchantPspTokenization(merchantId: string, merchantToken: string): Promise<void> {
    const configs: ConfigurationMerchantPaymentsData[] = [
      { config_code: 'USE_PSP_TOKENIZATION', config_value: 'ENABLED' },
      { config_code: 'USE_FRANCHISE_MODEL', config_value: 'gdaiaqxeebrqkemc62xv' },
      { config_code: 'PSP_SEND_METADATA', config_value: 'ENABLED' },
    ];

    for (const config of configs) {
      await this.configurationMerchantPayments({
        merchantId,
        storeId: 'all',
        merchantToken,
        configurationMerchantPaymentsData: config,
      });
    }
  }
}
