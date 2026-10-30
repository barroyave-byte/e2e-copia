import { randomUUID } from 'crypto';
import { RegisterService } from '../decorators/ServiceDecorator';
import {
  ExpireOrderResponse,
  GetOrderResponse,
  GetOrdersListResponse,
  TokenizeOrderRequest,
  TokenizeOrderRequestData,
  TokenizeOrderResponse,
} from '../models/order';

export interface NavitaireOrderOptions {
  order_id?: string;
  amount: number;
  currency: string;
  countryCode: string;
  userEmail: string;
}
import { EndpointConfig } from '../config/EndpointConfig';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { getTokenizeOrderBody, type TokenizeOrderBodyType } from '../testData/ema';
import { DeunanowOrderBuilder, type DeunanowOrderOptions } from '../testData/ema/DEUNANOW';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import envConfig from '@support/envConfig';
import {
  DeunacheckoutOrderBuilder,
  type DeunacheckoutOrderOptions,
} from '../testData/ema/DEUNA_CHECKOUT';
import { ApiResponse } from '../BaseHttpClient';
import {
  DeunaPaymentLinkOrderBuilder,
  type DeunaPaymentLinkOrderOptions,
} from '../testData/ema/DEUNA_PAYMENTLINK';
import { NupayOrderBuilder, type NupayOrderOptions } from '../testData/ema/NUPAY';
import { AirlineOrderBuilder, type AirlineOrderOptions } from '../testData/ema/AIRLINE_ORDER';
import { describeApiError } from '../utils/describeApiError';

@RegisterService(SERVICE_KEYS.EMA)
export class EmaService extends BaseService {
  async tokenizeOrder(
    tokenizeOrderData: TokenizeOrderRequest,
    expectError: boolean = false
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    try {
      const response = await this.httpClient.request<TokenizeOrderResponse>({
        url: EndpointConfig.getEndpoint('ema', 'tokenizeOrder'),
        data: tokenizeOrderData.orderData,
        method: 'POST',
        auth: {
          type: 'api-key',
          apiKey: tokenizeOrderData.privateKey,
        },
        expectError: expectError,
        logging: {
          logResponse: false,
          logRequest: false,
          logData: false,
          logHeaders: false,
        },
      });
      if (!expectError) {
        const responseTokenized = response.data;
        console.log(
          `Order Tokenized successfully \n order token ---> ${responseTokenized.token} \n order id ---> ${responseTokenized.order.order_id} \n `
        );
      }

      return response;
    } catch (error) {
      throw new Error(`Tokenize order failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Tokenize order using a predefined body type
   * Test cases can use this method to avoid creating complex bodies manually
   *
   * @param privateKey - The merchant's private key for authentication
   * @param bodyType - The type of predefined body to use
   * @returns TokenizeOrderResponse
   */
  async tokenizeOrderWithPredefinedBody(
    privateKey: string,
    bodyType: TokenizeOrderBodyType
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    const orderData = getTokenizeOrderBody(bodyType);

    return await this.tokenizeOrder({
      privateKey,
      orderData,
    });
  }

  async tokenizeOrderWithCustomBody(
    privateKey: string,
    orderData: TokenizeOrderRequestData,
    expectError: boolean = false
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    return await this.tokenizeOrder(
      {
        privateKey,
        orderData,
      },
      expectError
    );
  }

  /**
   * Tokenize DEUNA_NOW order with country-specific data
   * Test cases can specify country and get automatically localized data
   *
   * @param privateKey - The merchant's private key for authentication
   * @param country - The country code for localization
   * @param options - Optional customizations for the order
   * @returns TokenizeOrderResponse
   */
  async tokenizeDeunaNowOrder(
    country: CountryCodes,
    privateKey: string,
    options: DeunanowOrderOptions = {}
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    const orderData = DeunanowOrderBuilder.createOrder(country, options);

    return await this.tokenizeOrder({
      privateKey,
      orderData,
    });
  }

  async tokenizeDeunaCheckoutOrder(
    country: CountryCodes,
    privateKey: string,
    options: DeunacheckoutOrderOptions = {}
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    const orderData = DeunacheckoutOrderBuilder.createOrder(country, options);

    return await this.tokenizeOrder({
      privateKey,
      orderData,
    });
  }

  /**
   * Tokenize a PAYMENT_LINK order with a fully custom body.
   * Use `DeunaPaymentLinkOrderBuilder.createBody(params)` to build the body
   *
   * @example
   * const body = DeunaPaymentLinkOrderBuilder.createBody({ amount: 500000 });
   * await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(privateKey, body);
   */
  async tokenizeDeunaPaymentLinkOrderWithCustomBody(
    privateKey: string,
    body: TokenizeOrderRequestData
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    return await this.tokenizeOrder({ privateKey, orderData: body });
  }

  /**
   * Tokenize a NuPay order.
   *
   * - `variant: 'debit'`   → PAYMENT_LINK order with PaymentFormPattern; enables nupay_debit
   * - `variant: 'default'` → standard credit order (default)
   *
   * @example
   * await emaService.tokenizeNupayOrder()                        // credit
   * await emaService.tokenizeNupayOrder({ variant: 'debit' })    // debit
   * await emaService.tokenizeNupayOrder({ totalAmount: 25000 })  // 3 installments
   * await emaService.tokenizeNupayOrder({ cpf: '55784343637' })  // CPF without account
   */
  async tokenizeNupayOrder(
    privateKey: string,
    options: NupayOrderOptions = {}
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    const { variant = 'default', ...rest } = options;
    const orderData =
      variant === 'debit'
        ? NupayOrderBuilder.createDebitOrder(rest.order_id)
        : NupayOrderBuilder.createOrder(rest);

    return await this.tokenizeOrder({
      privateKey,
      orderData,
    });
  }

  async tokenizeDeunaPaymentLinkOrder(
    country: CountryCodes,
    privateKey: string,
    options: DeunaPaymentLinkOrderOptions = {}
  ) {
    const orderData = DeunaPaymentLinkOrderBuilder.createOrder(country, options);

    return await this.tokenizeOrder({
      privateKey,
      orderData,
    });
  }

  /**
   * Tokenize an AIRLINE_ORDER with airline-specific data.
   *
   * @param privateKey - The merchant's private key for authentication
   * @param options - Optional customizations (amounts, currency, billing address, passenger, legs, ancillaries)
   * @returns TokenizeOrderResponse
   *
   * @example
   * await emaService.tokenizeAirlineOrder();
   *
   * @example Override amounts and passenger
   * await emaService.tokenizeAirlineOrder(privateKey, {
   *   total_amount: 5000,
   *   currency: 'USD',
   *   passenger: { first_name: 'Jane', last_name: 'Doe' },
   * });
   */
  async tokenizeAirlineOrder(
    country: CountryCodes,
    privateKey: string,
    options: AirlineOrderOptions = {}
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    const orderData = AirlineOrderBuilder.createOrder(country, options);

    return await this.tokenizeOrder({
      privateKey,
      orderData,
    });
  }

  /**
   * Updates the order_id of a pending NuPay order.
   * Sends a NuPay order body with the existing order token (upsert semantics).
   *
   * @param privateKey - Merchant private key for authentication
   * @param orderToken - Token of the existing order to update
   * @param newOrderId - The new order_id to set
   * @param expectError - Set to true when a 4xx response is expected (e.g. already-processed orders)
   */
  async updateNupayOrderId(
    privateKey: string,
    orderToken: string,
    newOrderId: string,
    expectError = false
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    const orderData = NupayOrderBuilder.createOrder({ order_id: newOrderId });
    (orderData as any).order.token = orderToken;

    try {
      const response = await this.httpClient.request<TokenizeOrderResponse>({
        url: EndpointConfig.getEndpoint('ema', 'tokenizeOrder'),
        data: orderData,
        method: 'POST',
        auth: { type: 'api-key', apiKey: privateKey },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Update NuPay order ID failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Partially updates an order via PATCH using a custom body.
   *
   * @param privateKey - Merchant private key for authentication
   * @param orderToken - Token of the order to update
   * @param body - Partial order fields to update
   * @param expectError - Set to true when a 4xx response is expected
   */
  async updateOrder(
    privateKey: string,
    orderToken: string,
    body: Record<string, unknown>,
    expectError = false
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    try {
      const response = await this.httpClient.request<TokenizeOrderResponse>({
        url: EndpointConfig.getEndpoint('ema', 'updateOrder'),
        pathParams: { order_token: orderToken },
        data: body,
        method: 'PATCH',
        auth: { type: 'api-key', apiKey: privateKey },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Update order failed: ${JSON.stringify(error)}`);
    }
  }

  async cancelOrder(
    orderToken: string,
    privateKey: string,
    reason = 'orden de prueba',
    expectError = false
  ): Promise<ApiResponse<unknown>> {
    try {
      const response = await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('ema', 'cancelOrder'),
        pathParams: { order_token: orderToken },
        method: 'POST',
        data: { reason },
        auth: { type: 'api-key', apiKey: privateKey },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Cancel order failed: ${JSON.stringify(error)}`);
    }
  }

  async expireOrder(
    orderToken: string,
    privateKey: string,
    expectError = false
  ): Promise<ApiResponse<ExpireOrderResponse>> {
    try {
      const response = await this.httpClient.request<ExpireOrderResponse>({
        url: EndpointConfig.getEndpoint('ema', 'expireOrder'),
        pathParams: { order_token: orderToken },
        method: 'POST',
        auth: {
          type: 'api-key',
          apiKey: privateKey,
        },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Expire order failed: ${JSON.stringify(error)}`);
    }
  }

  async getOrder(privateKey: string, orderToken: string): Promise<ApiResponse<GetOrderResponse>> {
    try {
      const response = await this.httpClient.request<GetOrderResponse>({
        url: EndpointConfig.getEndpoint('ema', 'getOrder'),
        pathParams: {
          order_token: orderToken,
        },
        method: 'GET',
        auth: {
          type: 'api-key',
          apiKey: privateKey,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Get order failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Creates a bare airline order for use with navitaire middleware authorize flows.
   * Uses the AIRLINE_ORDER order type with minimal airline_information (empty object).
   *
   * @param privateKey - Merchant private key for authentication
   * @param options - Order parameters: amount (in cents), currency, countryCode, userEmail
   * @returns Tokenized order response containing `token` and `order`
   */
  async createNavitaireOrder(
    privateKey: string,
    options: NavitaireOrderOptions
  ): Promise<ApiResponse<TokenizeOrderResponse>> {
    const { order_id = randomUUID(), amount, currency, countryCode, userEmail } = options;

    const orderData = {
      order_type: 'AIRLINE_ORDER',
      order: {
        order_id,
        currency,
        items_total_amount: amount,
        total_amount: amount,
        sub_total: amount,
        store_code: 'all',
        payer_info: { email: userEmail },
        billing_address: { email: userEmail, country_code: countryCode },
        airline_information: {},
        items: [],
      },
    };

    try {
      return await this.httpClient.request<TokenizeOrderResponse>({
        url: EndpointConfig.getEndpoint('ema', 'tokenizeOrder'),
        method: 'POST',
        data: orderData,
        auth: { type: 'api-key', apiKey: privateKey },
      });
    } catch (error) {
      throw new Error(`EmaService.createNavitaireOrder failed: ${JSON.stringify(error)}`);
    }
  }

  async executeDynamicWebhook(
    orderToken: string,
    privateKey: string,
    eventName: string,
    body: Record<string, unknown> = {},
    expectError = false
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('ema', 'executeDynamicWebhook'),
        method: 'POST',
        pathParams: { orderToken, eventName },
        data: body,
        auth: { type: 'api-key', apiKey: privateKey },
        expectError,
      });
    } catch (error) {
      throw new Error(`executeDynamicWebhook failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Retrieves merchant orders filtered by a given query parameter.
   * Returns the first matching order token, or empty string if none found.
   */
  async getOrdersWithFilters(
    queryName: string,
    queryValue: string,
    privateKey: string
  ): Promise<{ order_token: string }> {
    try {
      const baseUrl = EndpointConfig.getEndpoint('ema', 'getOrders');
      const url = `${baseUrl}?${queryName}=${encodeURIComponent(queryValue)}`;

      const response = await this.httpClient.request<{ orders: Array<{ token: string }> }>({
        url,
        method: 'GET',
        auth: { type: 'api-key', apiKey: privateKey },
      });

      const orders = response.data?.orders ?? [];
      return { order_token: orders[0]?.token ?? '' };
    } catch (error) {
      throw new Error(`getOrdersWithFilters failed: ${describeApiError(error)}`);
    }
  }

  /**
   * Lists merchant orders via GET /merchants/orders (the endpoint backing the ADMIN panel's
   * order list and pagination). Pass `cursor` from a previous call's response to fetch the
   * next page. `expectError` mirrors the other EmaService methods — set it to true to get the
   * error response back instead of a thrown exception.
   */
  async getOrders(
    privateKey: string,
    params: { pageSize?: number; cursor?: string } = {},
    expectError = false
  ): Promise<ApiResponse<GetOrdersListResponse>> {
    const queryParams: Record<string, string | number> = {};
    if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;
    if (params.cursor) queryParams.cursor = params.cursor;

    try {
      return await this.httpClient.request<GetOrdersListResponse>({
        url: EndpointConfig.getEndpoint('ema', 'getOrders'),
        method: 'GET',
        params: queryParams,
        auth: { type: 'api-key', apiKey: privateKey },
        expectError,
      });
    } catch (error) {
      throw new Error(`getOrders failed: ${JSON.stringify(error)}`);
    }
  }
}
