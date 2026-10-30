import { NavitaireSoapBodyBuilder } from '@support/http/testData/navitaire/NavitaireSoapBodyBuilder';
import { ApiResponse } from '../BaseHttpClient';
import { EndpointConfig } from '../config/EndpointConfig';
import { RegisterService } from '../decorators/ServiceDecorator';
import {
  CreateNavitaireMerchantRequest,
  CreateNavitaireMerchantResponse,
  NavitaireAuthorizeParams,
  NavitaireReverseParams,
  UpdateNavitaireMerchantRequest,
} from '../models/navitaire';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';

const SOAP_CONTENT_TYPE = 'text/xml; charset=utf-8';
const SOAP_NAMESPACE = 'http://skypay.navitaire.com/universal_1_0/';
const AUTHORIZE_SOAP_ACTION = `${SOAP_NAMESPACE}Authorize`;
const REVERSE_SOAP_ACTION = `${SOAP_NAMESPACE}Reverse`;

@RegisterService(SERVICE_KEYS.NAVITAIRE)
export class NavitaireService extends BaseService {
  async createMerchant(
    authToken: string,
    body: CreateNavitaireMerchantRequest
  ): Promise<ApiResponse<CreateNavitaireMerchantResponse>> {
    try {
      return await this.httpClient.request<CreateNavitaireMerchantResponse>({
        url: EndpointConfig.getEndpoint('navitaire', 'createMerchant'),
        method: 'POST',
        data: body,
        auth: { type: 'bearer', token: authToken },
      });
    } catch (error) {
      throw new Error(`NavitaireService.createMerchant failed: ${JSON.stringify(error)}`);
    }
  }

  async updateMerchant(
    authToken: string,
    merchantId: string,
    body: UpdateNavitaireMerchantRequest
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('navitaire', 'merchantById'),
        method: 'PATCH',
        pathParams: { merchantId },
        data: body,
        auth: { type: 'bearer', token: authToken },
      });
    } catch (error) {
      throw new Error(`NavitaireService.updateMerchant failed: ${JSON.stringify(error)}`);
    }
  }

  async getMerchant(authToken: string, merchantId: string): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('navitaire', 'merchantById'),
        method: 'GET',
        pathParams: { merchantId },
        auth: { type: 'bearer', token: authToken },
      });
    } catch (error) {
      throw new Error(`NavitaireService.getMerchant failed: ${JSON.stringify(error)}`);
    }
  }

  async authorize(params: NavitaireAuthorizeParams): Promise<ApiResponse<string>> {
    try {
      return await this.httpClient.request<string>({
        url: EndpointConfig.getEndpoint('navitaire', 'soap'),
        method: 'POST',
        headers: {
          'Content-Type': SOAP_CONTENT_TYPE,
          SOAPAction: AUTHORIZE_SOAP_ACTION,
        },
        data: NavitaireSoapBodyBuilder.buildAuthorizeXml(params),
      });
    } catch (error) {
      throw new Error(`NavitaireService.authorize failed: ${JSON.stringify(error)}`);
    }
  }

  async reverse(params: NavitaireReverseParams): Promise<ApiResponse<string>> {
    try {
      return await this.httpClient.request<string>({
        url: EndpointConfig.getEndpoint('navitaire', 'soap'),
        method: 'POST',
        headers: {
          'Content-Type': SOAP_CONTENT_TYPE,
          SOAPAction: REVERSE_SOAP_ACTION,
        },
        data: NavitaireSoapBodyBuilder.buildReverseXml(params),
      });
    } catch (error) {
      throw new Error(`NavitaireService.reverse failed: ${JSON.stringify(error)}`);
    }
  }
}
