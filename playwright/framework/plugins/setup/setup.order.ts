import { Context, FrameworkPlugin } from '../interface';
import { STATE_KEYS, publish, resolveOrderToken, resolvePrivateKey } from '../../resolve';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { EmaService } from '@support/http/services/EmaService';
import {
  TokenizeOrderRequest,
  TokenizeOrderRequestData,
  TokenizeOrderResponse,
} from '@support/http/models/order';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { assertHttpResponse } from '../../httpContract';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';

/**
 * The subset of order options every template understands. Fields specific to one order type
 * (airline legs, checkout modules, ...) go through `setup.order.tokenizeOrder` with a full body.
 */
export interface CreateOrderOptions {
  order_id?: string;
  store_code?: string;
  user_email?: string;
  amount?: number;
}

/**
 * Order templates `createOrder` can build, mapped to the EmaService method that tokenizes
 * each one. Adding a template is one entry here, and the union below keeps the DSL parameter
 * and the runtime lookup from drifting apart.
 */
const ORDER_TEMPLATES = {
  deuna_now: (ema: EmaService, country: CountryCodes, key: string, options: CreateOrderOptions) =>
    ema.tokenizeDeunaNowOrder(country, key, options),
  deuna_checkout: (
    ema: EmaService,
    country: CountryCodes,
    key: string,
    options: CreateOrderOptions
  ) => ema.tokenizeDeunaCheckoutOrder(country, key, options),
  payment_link: (
    ema: EmaService,
    country: CountryCodes,
    key: string,
    options: CreateOrderOptions
  ) => ema.tokenizeDeunaPaymentLinkOrder(country, key, options),
} as const;

export type OrderTemplate = keyof typeof ORDER_TEMPLATES;

export class PluginSetupOrder extends FrameworkPlugin {
  pluginBaseName = 'setup.order';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  /**
   * Publishes the tokenize result to the step store so later actions (admin.orders.goToOrder,
   * api.payment.*) can resolve the order without a global.
   */
  private storeOrder(response: unknown) {
    const order = (response as { data?: { token?: string; order?: { order_id?: string } } })?.data;
    publish(this.context, STATE_KEYS.orderToken, order?.token);
    publish(this.context, STATE_KEYS.orderId, order?.order?.order_id);
    return response;
  }

  /** @description Tokenizes an order using the EMA service. Accepts a full order data body and an optional private key (defaults to the merchant created by a previous setup.merchant action). Publishes the resulting order token and id to the step store. Returns the full tokenize response — add saveAs to reference it from a later step. */
  async $tf_tokenizeOrder({
    orderData,
    privateKey,
    expectError,
  }: {
    orderData: TokenizeOrderRequestData;
    privateKey?: string;
    expectError?: boolean;
  }) {
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);

    const request: TokenizeOrderRequest = {
      privateKey: resolvePrivateKey(this.context, 'setup.order.tokenizeOrder', privateKey),
      orderData,
    };

    return this.storeOrder(await emaService.tokenizeOrder(request, expectError ?? false));
  }

  /** @description Creates a new tokenized order for the given country using a predefined order builder. Accepts an optional orderType to select the order template (deuna_now, deuna_checkout, or payment_link; defaults to deuna_now) and optional order options such as user_email or amount. The private key defaults to the merchant created by a previous setup.merchant action. Publishes the resulting order token and id to the step store. Returns the full tokenize response — add saveAs to reference it from a later step. */
  async $tf_createOrder({
    country,
    privateKey,
    orderType,
    options = {},
  }: {
    country: CountryCodes;
    privateKey?: string;
    orderType?: OrderTemplate;
    options?: CreateOrderOptions;
  }) {
    const resolvedPrivateKey = resolvePrivateKey(
      this.context,
      'setup.order.createOrder',
      privateKey
    );
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);

    const type = orderType ?? 'deuna_now';
    const tokenize = ORDER_TEMPLATES[type];

    // TypeScript already rejects an unknown template; this guards values built dynamically.
    if (!tokenize) {
      throw new Error(
        `setup.order.createOrder: unknown orderType "${type}". Expected one of: ${Object.keys(ORDER_TEMPLATES).join(', ')}.`
      );
    }

    return this.storeOrder(await tokenize(emaService, country, resolvedPrivateKey, options));
  }

  /**
   * The token check is separate from `assertHttpResponse` because "non-empty" is not a value
   * the `equals` matcher can express.
   *
   * @description Asserts that a setup.order.tokenizeOrder / setup.order.createOrder response
   * was accepted: the expected HTTP status (default 200), a non-empty data.token, and
   * optionally a subset of the body.
   */
  async $tf_assertOrderTokenized({
    response,
    expectedStatus,
    expectedBody,
  }: {
    response: ApiResponse<TokenizeOrderResponse>;
    expectedStatus?: number;
    expectedBody?: Partial<TokenizeOrderResponse>;
  }) {
    const action = 'setup.order.assertOrderTokenized';

    assertHttpResponse(
      { method: 'POST', operation: 'setup.order.tokenizeOrder' },
      { status: response.status, body: response.data },
      { status: expectedStatus ?? 200, body: expectedBody }
    );

    const token = response.data?.token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error(
        `${action}: HTTP ${response.status} but the response has no usable data.token ` +
          `(got ${JSON.stringify(token)}).`
      );
    }
  }

  /** @description Returns the current order token, published by a previous setup.order action in this run. Throws with the available step-store keys if none is found. */
  async $tf_getOrderToken(): Promise<string> {
    return resolveOrderToken(this.context, 'setup.order.getOrderToken');
  }
}
