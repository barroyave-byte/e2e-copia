import envConfig from '@support/envConfig';
import { SabreSoapBodyBuilder } from '@support/http/testData/sabre/SabreSoapBodyBuilder';
import { ApiResponse } from '../BaseHttpClient';
import { EndpointConfig } from '../config/EndpointConfig';
import { RegisterService } from '../decorators/ServiceDecorator';
import {
  CreateSabreMerchantRequest,
  CreateSabreMerchantResponse,
  SabreAuthorizeParams,
  SabreCancelOrRefundParams,
  SabreCaptureParams,
  SabreSoapResult,
  UpdateSabreMerchantRequest,
} from '../models/sabre';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';

const SOAP_CONTENT_TYPE = 'text/xml; charset=utf-8';

@RegisterService(SERVICE_KEYS.SABRE)
export class SabreService extends BaseService {
  private get apiKey(): string {
    return envConfig.SABRE_API_KEY;
  }

  async createMerchant(
    authToken: string,
    body: CreateSabreMerchantRequest
  ): Promise<ApiResponse<CreateSabreMerchantResponse>> {
    try {
      return await this.httpClient.request<CreateSabreMerchantResponse>({
        url: EndpointConfig.getEndpoint('sabre', 'createMerchant'),
        method: 'POST',
        data: body,
        auth: { type: 'bearer', token: authToken },
        headers: { 'x-api-key': this.apiKey },
      });
    } catch (error) {
      throw new Error(`SabreService.createMerchant failed: ${JSON.stringify(error)}`);
    }
  }

  async updateMerchant(
    authToken: string,
    merchantId: string,
    body: UpdateSabreMerchantRequest
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('sabre', 'merchantById'),
        method: 'PATCH',
        pathParams: { merchantId },
        data: body,
        auth: { type: 'bearer', token: authToken },
        headers: { 'x-api-key': this.apiKey },
      });
    } catch (error) {
      throw new Error(`SabreService.updateMerchant failed: ${JSON.stringify(error)}`);
    }
  }

  async getMerchant(authToken: string, merchantId: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('sabre', 'merchantById'),
        method: 'GET',
        pathParams: { merchantId },
        auth: { type: 'bearer', token: authToken },
        headers: { 'x-api-key': this.apiKey },
      });
    } catch (error) {
      throw new Error(`SabreService.getMerchant failed: ${JSON.stringify(error)}`);
    }
  }

  async authorize(params: SabreAuthorizeParams): Promise<SabreSoapResult> {
    const requestXml = SabreSoapBodyBuilder.buildAuthorizeXml(params);
    try {
      const response = await this.httpClient.request<string>({
        url: EndpointConfig.getEndpoint('sabre', 'soap'),
        method: 'POST',
        headers: { 'Content-Type': SOAP_CONTENT_TYPE },
        data: requestXml,
      });
      return { requestXml, responseXml: response.data };
    } catch (error) {
      throw new Error(`SabreService.authorize failed: ${JSON.stringify(error)}`);
    }
  }

  async capture(params: SabreCaptureParams): Promise<SabreSoapResult> {
    const requestXml = SabreSoapBodyBuilder.buildCaptureXml(params);
    try {
      const response = await this.httpClient.request<string>({
        url: EndpointConfig.getEndpoint('sabre', 'soap'),
        method: 'POST',
        headers: { 'Content-Type': SOAP_CONTENT_TYPE },
        data: requestXml,
      });
      return { requestXml, responseXml: response.data };
    } catch (error) {
      throw new Error(`SabreService.capture failed: ${JSON.stringify(error)}`);
    }
  }

  async cancelOrRefund(params: SabreCancelOrRefundParams): Promise<SabreSoapResult> {
    const requestXml = SabreSoapBodyBuilder.buildCancelOrRefundXml(params);
    try {
      const response = await this.httpClient.request<string>({
        url: EndpointConfig.getEndpoint('sabre', 'soap'),
        method: 'POST',
        headers: { 'Content-Type': SOAP_CONTENT_TYPE },
        data: requestXml,
      });
      return { requestXml, responseXml: response.data };
    } catch (error) {
      throw new Error(`SabreService.cancelOrRefund failed: ${JSON.stringify(error)}`);
    }
  }
}
