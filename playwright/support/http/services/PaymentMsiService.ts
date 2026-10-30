import {
  CampaignData,
  GetInstallmentsParams,
  GetInstallmentsResponse,
  InstallmentsCampaignData,
  InstallmentsCampaignRequest,
  InstallmentsCampaignResponse,
  GetCampaignsQueryParams,
  GetCampaignsResponse,
} from '../models/paymentMsi';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import { ServiceFactory } from '@support/http';
import { PaymentService } from './PaymentService';
import { CampaignMsiBuilder } from '../testData/payment_msi/CampaignMsiBuilder';
import { CampaignMciBuilder } from '../testData/payment_msi/CampaignMciBuilder';
import { ApiResponse } from '../BaseHttpClient';
import { expect } from '@playwright/test';
@RegisterService(SERVICE_KEYS.PAYMENT_MSI)
export class PaymentMsiService extends BaseService {
  private paymentService: PaymentService;

  constructor(httpClient: any) {
    super(httpClient);
    // Initialize dependent service
    this.paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  }

  async createInstallmentCampaign(
    installmentsCampaign: InstallmentsCampaignRequest,
    expectError: boolean = false
  ): Promise<ApiResponse<InstallmentsCampaignResponse>> {
    try {
      const response = await this.httpClient.request<InstallmentsCampaignResponse>({
        url: EndpointConfig.getEndpoint('paymentMsi', 'createInstallmentCampaign'),
        method: 'POST',
        data: installmentsCampaign.installmentsCampaignData,
        pathParams: {
          merchantId: installmentsCampaign.merchantId,
        },
        auth: {
          type: 'bearer',
          token: installmentsCampaign.merchantToken,
        },
        expectError: expectError,
      });
      return response;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async updateInstallmentCampaign(
    merchantId: string,
    merchantToken: string,
    campaignId: string,
    body: InstallmentsCampaignRequest,
    expectError: boolean = false
  ): Promise<ApiResponse<InstallmentsCampaignResponse>> {
    try {
      const response = await this.httpClient.request<InstallmentsCampaignResponse>({
        url: EndpointConfig.getEndpoint('paymentMsi', 'updateInstallmentCampaign'),
        method: 'PATCH',
        data: body,
        pathParams: {
          merchantId: merchantId,
          campaignId: campaignId,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        expectError: expectError,
      });
      return response;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getCampaigns(
    merchantId: string,
    merchantToken: string,
    queryParams?: GetCampaignsQueryParams,
    expectError: boolean = false
  ): Promise<ApiResponse<GetCampaignsResponse>> {
    try {
      const response = await this.httpClient.request<GetCampaignsResponse>({
        url: EndpointConfig.getEndpoint('paymentMsi', 'getCampaigns'),
        method: 'GET',
        pathParams: {
          merchantId: merchantId,
        },
        params: queryParams,
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        expectError: expectError,
      });
      return response;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getCampaignById(
    merchantId: string,
    merchantToken: string,
    campaignId: string,
    expectError = false
  ): Promise<ApiResponse<CampaignData>> {
    try {
      const response = await this.httpClient.request<CampaignData>({
        url: EndpointConfig.getEndpoint('paymentMsi', 'getCampaignById'),
        method: 'GET',
        pathParams: { merchantId, campaignId },
        auth: { type: 'bearer', token: merchantToken },
        expectError,
      });
      return response;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async deleteCampaign(
    merchantId: string,
    merchantToken: string,
    campaignId: string,
    expectError = false
  ): Promise<ApiResponse<void>> {
    try {
      const response = await this.httpClient.request<void>({
        url: EndpointConfig.getEndpoint('paymentMsi', 'deleteCampaign'),
        method: 'DELETE',
        pathParams: { merchantId, campaignId },
        auth: { type: 'bearer', token: merchantToken },
        expectError,
      });
      return response;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getInstallments(params: GetInstallmentsParams): Promise<ApiResponse<GetInstallmentsResponse>> {
    const { merchantId, storeCode, merchantToken, amount, currency, bin, transactionId, country } = params;
    try {
      const response = await this.httpClient.request<GetInstallmentsResponse>({
        url: EndpointConfig.getEndpoint('paymentMsi', 'getInstallments'),
        method: 'GET',
        headers: {
          'X-Merchant-Id': merchantId,
          'X-Store-Code': storeCode,
        },
        params: { amount, currency, bin, transaction_id: transactionId, country },
        auth: { type: 'bearer', token: merchantToken },
      });
      return response;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  // TODO: Remove this method when the migration to the new API is completed
  validateUpdateInstallmentCampaignResponse( respStatusCode: number, respCode: number, respStatusMsg: string, response: ApiResponse) {
    const errorExist = response.data.error;
    expect(response.status).toBe(respStatusCode);
    expect(response.data.code).toBe(respCode);
    if (errorExist) {
      expect(response.data.error).toBe(respStatusMsg);
    } else {
      expect(response.data.data.status).toBe(respStatusMsg);
    }
    

  }

  async createPaypalWalletCampaign(
    merchantId: string,
    merchantToken: string,
    currency: string
  ): Promise<void> {
    const body = {
      name: 'PayPal Wallet Campaign',
      status: 'active',
      display_label_template: {
        language: 'es',
        MSI: '{installments} de ${amount} sin interés',
        MCI: '{installments} de ${amount} con interés del {rate}%',
      },
      processors: [{ id: 56, name: 'PAYPAL_WALLET' }],
      options: [
        { card_branch: [{ isActive: true, cost: 0, name: 'wallet' }], currency, installments: 1, installments_type: 'MSI' },
        { card_branch: [{ isActive: true, cost: 0, name: 'wallet' }], currency, installments: 3, installments_type: 'MCI' },
        { card_branch: [{ isActive: true, cost: 0, name: 'wallet' }], currency, installments: 6, installments_type: 'MCI' },
        { card_branch: [{ isActive: true, cost: 0, name: 'wallet' }], currency, installments: 9, installments_type: 'MCI' },
        { card_branch: [{ isActive: true, cost: 0, name: 'wallet' }], currency, installments: 12, installments_type: 'MCI' },
      ],
    };
    await this.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: body as any,
    });
  }

  async configCampaignWithError(
    merchantId: string,
    merchantToken: string,
    currency: string
  ): Promise<void> {
    const responseGetProcessors = await this.paymentService.paymentProcessor(merchantId, merchantToken);
    const processorId = responseGetProcessors.data[0].payment_processor.id;
    const processorName = responseGetProcessors.data[0].payment_processor.name;
    await this.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: {
        name: 'campaña test',
        description: 'campaña de test para mercadopago credit',
        status: 'active',
        processors: [{ id: processorId, name: processorName }],
        display_label_template: {
          language: 'es',
          MSI: '{installments} de ${amount} sin interés',
          MCI: '{installments} meses de ${amount}',
        },
        options: [{
          installments: 2,
          installments_type: 'MSI',
          currency,
          card_branch: ['visa', 'mastercard', 'amex', 'diners'].map((name) => ({
            amount_min: 500, name, cost: 0, installment_rate: 0, installments_interest_formula: '',
          })),
        }],
      },
    }, true);
  }

  async configCampaign(
    merchantId: string,
    merchantToken: string,
    currency: string,
    installmentsType: 'MSI' | 'MCI',
    cardBrands?: string[],
    displayLabelTemplate?: { language: string; MSI: string; MCI?: string; one_or_no_installment_option?: string }
  ) {
    const responseGetProcessors = await this.paymentService.paymentProcessor(
      merchantId,
      merchantToken
    );
    const processorId = responseGetProcessors.data[0].payment_processor.id;
    const processorName = responseGetProcessors.data[0].payment_processor.name;
    let installmentsCampaignData: InstallmentsCampaignData;
    if (installmentsType === 'MSI') {
      installmentsCampaignData = CampaignMsiBuilder.createCampaignMsi({
        currency_code: currency,
        processor_id: processorId,
        processor_name: processorName,
        card_brands: cardBrands,
        display_label_template: displayLabelTemplate,
      });
    } else {
      installmentsCampaignData = CampaignMciBuilder.createCampaignMci({
        currency_code: currency,
        processor_id: processorId,
        processor_name: processorName,
      });
    }
    await this.createInstallmentCampaign({
      merchantId: merchantId,
      merchantToken: merchantToken,
      installmentsCampaignData: installmentsCampaignData,
    });
  }

  async getOrderInstallments(
    orderToken: string,
    publicKey: string,
    bin: string,
    expectError = false,
    cardId?: string
  ): Promise<ApiResponse<{ installments: unknown[] }>> {
    try {
      const response = await this.httpClient.request<{ installments: unknown[] }>({
        url: EndpointConfig.getEndpoint('paymentMsi', 'getOrderInstallments'),
        method: 'GET',
        pathParams: { order_token: orderToken },
        params: { bin, card_id: cardId },
        auth: { type: 'api-key', apiKey: publicKey },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Get order installments failed: ${JSON.stringify(error)}`);
    }
  }
}
