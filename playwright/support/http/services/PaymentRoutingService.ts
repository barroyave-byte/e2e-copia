import { ApiResponse } from '../BaseHttpClient';
import { BaseService } from './BaseService';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import {
  MerchantRoutingData,
  ProcessorRoutingData,
  ProcessorRoutingResponse,
  MerchantRoutingResponse,
  StoreRoutingData,
  StoreRoutingResponse,
  StoreRoutingActiveData,
  StoreRoutingActiveResponse,
  MerchantRuleResponse,
  MerchantRuleGetResponse,
} from '../models/paymentRouting';
import { EndpointConfig } from '../config/EndpointConfig';
import { ServiceFactory } from '../ServiceFactory';
import { PaymentService } from './PaymentService';
import {
  BODY_MERCHANT_ROUTING_DEFAULT,
  BODY_PROCESSOR_CONEKTA_ROUTING_DEFAULT,
  BODY_PROCESSOR_KUSHKI_ROUTING_DEFAULT,
  BODY_PROCESSOR_STRIPE_ROUTING_DEFAULT,
  BODY_STORE_ROUTING_DEFAULT,
  buildStoreRoutingDefault,
} from '../testData/paymentRouting/SmartRoutingConfig';

@RegisterService(SERVICE_KEYS.PAYMENT_ROUTING)
export class PaymentRoutingService extends BaseService {
  private paymentService: PaymentService;
  constructor(httpClient: any) {
    super(httpClient);
    // Initialize dependent service
    this.paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  }
  async createMerchantRouting(
    merchantId: string,
    merchantToken: string,
    merchantRouting: MerchantRoutingData
  ): Promise<ApiResponse<MerchantRoutingResponse>> {
    try {
      const response = await this.httpClient.request<MerchantRoutingResponse>({
        url: EndpointConfig.getEndpoint('paymentRouting', 'merchantRouting'),
        method: 'POST',
        data: merchantRouting,
        pathParams: {
          merchantId: merchantId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Merchant creation failed: ${JSON.stringify(error)}`);
    }
  }

  async createProcessorRouting(
    merchantId: string,
    merchantToken: string,
    processorRoutingData: ProcessorRoutingData
  ): Promise<ApiResponse<ProcessorRoutingResponse>> {
    try {
      const response = await this.httpClient.request<ProcessorRoutingResponse>({
        url: EndpointConfig.getEndpoint('paymentRouting', 'processorRouting'),
        method: 'POST',
        data: processorRoutingData,
        pathParams: {
          merchantId: merchantId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Processor creation failed: ${JSON.stringify(error)}`);
    }
  }

  async createStoreRouting(
    merchantId: string,
    merchantToken: string,
    storeRoutingData: StoreRoutingData
  ): Promise<ApiResponse<StoreRoutingResponse>> {
    try {
      const response = await this.httpClient.request<StoreRoutingResponse>({
        url: EndpointConfig.getEndpoint('paymentRouting', 'storeRouting'),
        method: 'POST',
        data: storeRoutingData,
        pathParams: {
          merchantId: merchantId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Store creation failed: ${JSON.stringify(error)}`);
    }
  }

  async activeRoutingService(
    merchantId: string,
    merchantToken: string,
    storeRoutingActiveData: StoreRoutingActiveData
  ): Promise<ApiResponse<StoreRoutingActiveResponse>> {
    try {
      const response = await this.httpClient.request<StoreRoutingActiveResponse>({
        url: EndpointConfig.getEndpoint('paymentRouting', 'activeRouting'),
        method: 'PATCH',
        data: storeRoutingActiveData,
        pathParams: {
          merchantId: merchantId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Store creation failed: ${JSON.stringify(error)}`);
    }
  }

  async createMerchantRule(
    merchantId: string,
    merchantToken: string,
    body: Record<string, unknown>
  ): Promise<ApiResponse<MerchantRuleResponse>> {
    try {
      const response = await this.httpClient.request<MerchantRuleResponse>({
        url: EndpointConfig.getEndpoint('paymentRouting', 'createMerchantRule'),
        method: 'POST',
        data: body,
        pathParams: { merchantId },
        auth: { type: 'bearer', token: merchantToken },
        expectError: true
      });
      return response;
    } catch (error) {
      throw new Error(`createMerchantRule failed: ${JSON.stringify(error)}`);
    }
  }

  async updateMerchantRule(
    merchantId: string,
    ruleId: string,
    merchantToken: string,
    body: Record<string, unknown>
  ): Promise<ApiResponse<MerchantRuleResponse>> {
    try {
      const response = await this.httpClient.request<MerchantRuleResponse>({
        url: EndpointConfig.getEndpoint('paymentRouting', 'updateMerchantRule'),
        method: 'PUT',
        data: body,
        pathParams: { merchantId, ruleId },
        auth: { type: 'bearer', token: merchantToken },
      });
      return response;
    } catch (error) {
      throw new Error(`updateMerchantRule failed: ${JSON.stringify(error)}`);
    }
  }

  async getMerchantRule(
    merchantId: string,
    ruleId: string,
    merchantToken: string
  ): Promise<ApiResponse<MerchantRuleGetResponse>> {
    try {
      const response = await this.httpClient.request<MerchantRuleGetResponse>({
        url: EndpointConfig.getEndpoint('paymentRouting', 'getMerchantRule'),
        method: 'GET',
        pathParams: { merchantId, ruleId },
        auth: { type: 'bearer', token: merchantToken },
      });
      return response;
    } catch (error) {
      throw new Error(`getMerchantRule failed: ${JSON.stringify(error)}`);
    }
  }

  async getMerchantRules(
    merchantId: string,
    merchantToken: string
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('paymentRouting', 'getMerchantRules'),
        method: 'GET',
        pathParams: { merchantId },
        auth: { type: 'bearer', token: merchantToken },
      });
    } catch (error) {
      throw new Error(`getMerchantRules failed: ${JSON.stringify(error)}`);
    }
  }

  async deleteMerchantRule(
    merchantId: string,
    ruleId: string,
    merchantToken: string
  ): Promise<void> {
    try {
      await this.httpClient.request({
        url: EndpointConfig.getEndpoint('paymentRouting', 'deleteMerchantRule'),
        method: 'DELETE',
        pathParams: { merchantId, ruleId },
        auth: { type: 'bearer', token: merchantToken },
      });
    } catch (error) {
      throw new Error(`deleteMerchantRule failed: ${JSON.stringify(error)}`);
    }
  }

  async consultationTrigger(
    merchantId: string,
    merchantToken: string,
    body: Record<string, unknown>,
    ignoredRuleOptions: string
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: `${EndpointConfig.getEndpoint('paymentRouting', 'consultationTrigger')}?ignored_rule_options=${ignoredRuleOptions}`,
        method: 'POST',
        data: body,
        pathParams: { merchantId },
        auth: { type: 'bearer', token: merchantToken },
      });
    } catch (error) {
      throw new Error(`consultationTrigger failed: ${JSON.stringify(error)}`);
    }
  }

  async createMerchantStore(
    merchantId: string,
    merchantToken: string,
    name: string
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('merchant', 'store'),
        method: 'POST',
        data: {
          name,
          latitude: 19.3600265,
          longitude: -99.1574174,
          address: 'Alberca Olímpica Francisco Márquez',
        },
        pathParams: { merchantId },
        auth: { type: 'bearer', token: merchantToken },
      });
    } catch (error) {
      throw new Error(`createMerchantStore failed: ${JSON.stringify(error)}`);
    }
  }

  // TODO: Improve this method after migration is finished
  async configSmartRouting(
    merchantId: string,
    merchantToken: string,
    processorQuantity: string
  ): Promise<void> {
    const merchantRoutingData = {...BODY_MERCHANT_ROUTING_DEFAULT, id: merchantId};
    await this.createMerchantRouting(merchantId, merchantToken, merchantRoutingData);
    await this.createProcessorRouting(
      merchantId,
      merchantToken,
      BODY_PROCESSOR_STRIPE_ROUTING_DEFAULT
    );

    if (processorQuantity === '2'){
      console.log('Creating Kushki processor');
      await this.createProcessorRouting(
        merchantId,
        merchantToken,
        BODY_PROCESSOR_KUSHKI_ROUTING_DEFAULT
      );
    } else {
      console.log('Creating Conekta processor');
      await this.createProcessorRouting(
        merchantId,
        merchantToken,
        BODY_PROCESSOR_CONEKTA_ROUTING_DEFAULT
      );
      console.log('Creating Kushki processor');
      await this.createProcessorRouting(
        merchantId,
        merchantToken,
        BODY_PROCESSOR_KUSHKI_ROUTING_DEFAULT
      );
    }
    const configuationId = (
      await this.createStoreRouting(merchantId, merchantToken, buildStoreRoutingDefault(processorQuantity))
    ).data?.id;
    await this.activeRoutingService(merchantId, merchantToken, { id: configuationId });
    await this.paymentService.configurationMerchantPayments({
      merchantToken: merchantToken,
      merchantId: merchantId,
      storeId: 'all',
      configurationMerchantPaymentsData: {
        config_code: 'USE_ROUTING',
        config_value: 'ENABLED',
      },
    });
  }

  async evaluateTrigger(
    merchantId: string,
    body: Record<string, unknown>,
    merchantToken?: string
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request({
        url: EndpointConfig.getEndpoint('paymentRouting', 'evaluateTrigger'),
        method: 'POST',
        data: body,
        pathParams: { merchantId },
        ...(merchantToken && { auth: { type: 'bearer', token: merchantToken } }),
      });
    } catch (error) {
      throw new Error(`evaluateTrigger failed: ${JSON.stringify(error)}`);
    }
  }
}
