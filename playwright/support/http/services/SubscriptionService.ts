import { faker } from '@faker-js/faker';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import { ApiResponse } from '../BaseHttpClient';

export interface CreateSubscriptionResponse {
  id: string;
  external_subscription_id: string;
  plan_id: string;
  merchant_id: string;
  user_id: string;
  currency: string;
  name: string;
  amount: number;
  genesis_invoice_id: string;
  order_id: string;
  status: string;
  card_id: string;
  subscription_end_date: string;
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  description: string;
  plan_group: string;
  plan_code: string;
  interval_unit: string;
  price_model: 'FIXED';
  auto_renew: boolean;
  currency: string;
  amount: number;
  tags: string[];
}

export interface CreateSubscriptionPlanResponse {
  plan_id: string;
}

interface SubscriptionPlansResponse {
  data: Array<{ plan_id?: string }>;
}

const SUBSCRIPTION_ADDRESS = {
  email: 'shipping@maxipago.com',
  identification: '12334568799',
  first_name: 'Name',
  last_name: 'Comprador',
  phone: '1122334455',
  address1: 'Avenida Paulista',
  address2: '123, 11º Andar',
  city: 'São Paulo',
  zipcode: '01311000',
  state_code: 'SP',
  country_code: 'BR',
  additional_description: 'Descripción adicional',
  address_type: 'home',
  is_default: false,
} as const;

const SUBSCRIPTION_CARD = {
  expiry_month: '11',
  expiry_year: '2027',
  card_holder: 'APRO',
  card_holder_dni: '12345678',
  card_number: '5031755734530604',
  card_cvv: '123',
} as const;

@RegisterService(SERVICE_KEYS.SUBSCRIPTION)
export class SubscriptionService extends BaseService {
  async getFirstActivePlanId(merchantId: string, merchantToken: string): Promise<string> {
    const response = await this.httpClient.request<SubscriptionPlansResponse>({
      url: EndpointConfig.getEndpoint('subscription', 'getPlans'),
      method: 'GET',
      auth: { type: 'bearer', token: merchantToken },
      headers: {
        'X-Merchant-ID': merchantId,
      },
      params: { page: 1, size: 1, status: 'active' },
    });
    const planId = response.data.data[0]?.plan_id;

    if (!planId) {
      throw new Error('getPlans failed: response does not contain an active plan');
    }

    return planId;
  }

  async createPlan(
    merchantId: string,
    merchantToken: string,
    planData: CreateSubscriptionPlanRequest
  ): Promise<ApiResponse<CreateSubscriptionPlanResponse>> {
    const response = await this.httpClient.request<CreateSubscriptionPlanResponse>({
      url: EndpointConfig.getEndpoint('subscription', 'createPlan'),
      method: 'POST',
      auth: { type: 'bearer', token: merchantToken },
      headers: {
        'X-Merchant-ID': merchantId,
      },
      data: planData,
    });

    if (!response.data.plan_id) {
      throw new Error('createPlan failed: response does not contain plan_id');
    }

    return response;
  }

  async createSubscription(
    merchantId: string,
    merchantToken: string,
    planId: string,
    currency: string,
    orderToken: string,
    cardId: string
  ): Promise<ApiResponse<CreateSubscriptionResponse>> {
    try {
      const response = await this.httpClient.request<CreateSubscriptionResponse>({
        url: EndpointConfig.getEndpoint('subscription', 'create'),
        method: 'POST',
        auth: { type: 'bearer', token: merchantToken },
        headers: {
          'X-Merchant-ID': merchantId,
        },
        data: {
          plan_id: planId,
          order_token: orderToken,
          card_id: cardId,
          payer_info: {
            email: `${faker.person.firstName()}@testuser.com`,
            name: 'Esteban',
            last_name: 'Posada',
            phone: '+52557658999',
          },
          payment_source: {
            card_info: SUBSCRIPTION_CARD,
            currency,
            method_type: 'credit_card',
          },
          shipping_address: SUBSCRIPTION_ADDRESS,
          billing_address: SUBSCRIPTION_ADDRESS,
          webhooks_urls: {
            notify_order: 'https://example.com/notify-order',
            notify_update_subscription: 'https://example.com/notify-update',
          },
        },
      });
      return response;
    } catch (error) {
      throw new Error(`createSubscription failed: ${JSON.stringify(error)}`);
    }
  }
}
