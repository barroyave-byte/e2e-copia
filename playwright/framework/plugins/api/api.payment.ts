import { Context, FrameworkPlugin } from '../interface';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import {
  CreditCard,
  MethodType,
  PurchaseRequest,
  PurchaseRequestV2,
  PurchaseResponse,
} from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { resolveMerchantId, resolveOrderToken, resolvePrivateKey } from '../../resolve';
import { assertHttpResponse, ExpectedResponse } from '../../httpContract';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { FraudExpectation } from '@support/api_sup/global_assert/fraudAnalysis';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';

export interface PurchaseV2WithCreditCardParams {
  creditCard: BaseCreditCard;
  processorName: string;
  /** Selects the card address fields `buildPurchaseV2Payload` sends for that country. */
  country: CountryCodes;
  email?: string;
  merchantId?: string;
  privateKey?: string;
  /** Defaults to the order created by a previous setup.order action. */
  orderToken?: string;
  expectError?: boolean;
}

export interface PurchaseWithCreditCardParams {
  creditCard: BaseCreditCard;
  processorName: string;
  email?: string;
  merchantId?: string;
  privateKey?: string;
  /** Defaults to the order created by a previous setup.order action. */
  orderToken?: string;
  expectError?: boolean;
  /** Sent as `transaction_id`. Reuse the same order with a different one to re-purchase it. */
  transactionId?: string;
  /**
   * Raw fields written on top of what `mapBaseCreditCardToCreditCard` derives from the
   * fixture, e.g. `{ expiry_year: '30' }`.
   */
  cardOverrides?: Partial<CreditCard>;
}

/**
 * A saved-card checkout: purchase V2 with `card_info.card_id`, authenticated as the registered
 * shopper who owns the card rather than as a guest.
 */
export interface SavedCardPurchase {
  /** Bearer token of the registered shopper who owns the card. */
  userToken: string;
  /** Saved-card id (`data.data.id` of a `setup.user.enrollCard` response). */
  cardId: string;
  /** CVV the shopper re-enters for the saved card. Left out of the request when omitted. */
  cardCvv?: string;
  processorName: string;
  email?: string;
  privateKey?: string;
  expectError?: boolean;
}

export interface PurchaseWithSavedCardParams extends SavedCardPurchase {
  /** Defaults to the order created by a previous setup.order action. */
  orderToken?: string;
}

/**
 * One purchase inside a {@link PurchaseConcurrentParams} batch — a saved-card checkout that
 * triggers vault-api → VGS detokenization on the server side. Sending several of these in
 * parallel is what forces the server to detokenize distinct vault tokens near-simultaneously,
 * which is the codepath a concurrent-detokenization regression test needs to reach.
 */
export interface ConcurrentPurchaseSpec extends SavedCardPurchase {
  /** Order token to charge; each spec must reference a distinct tokenized order. */
  orderToken: string;
}

export interface PurchaseConcurrentParams {
  purchases: ConcurrentPurchaseSpec[];
}

function mapBaseCreditCardToCreditCard(card: BaseCreditCard): CreditCard {
  const month = card.expiration_date.slice(0, 2);
  const year = '20' + card.expiration_date.slice(2, 4);

  return {
    card_number: card.number,
    expiry_month: month,
    expiry_year: year,
    card_cvv: card.cvv_code,
    card_holder: card.cardholder_name,
    card_holder_dni: card.document_number,
    address1: 'Test Address 123',
    zip: '00000',
    city: 'Test City',
    state: 'TS',
    country: 'MX',
    phone: '5500000000',
  };
}

export class PluginApiPayment extends FrameworkPlugin {
  pluginBaseName = 'api.payment';

  /** The last purchase response and the action that made it, so assertions can name it. */
  private lastPurchase: { action: string; response: ApiResponse<PurchaseResponse> } | null = null;

  private globalAssert = new GlobalAssert();

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.lastPurchase = null;
  }

  /** @description Processes a payment via API without opening the checkout UI. Performs a guest login and calls the purchase endpoint with the given credit card and processor name. orderToken, merchantId and privateKey all default to what a previous setup.order / setup.merchant action produced. Pass cardOverrides to send raw card fields the fixture mapping would otherwise normalize (e.g. a 2-digit expiry_year) and transactionId to send a specific transaction_id. Returns the purchase response — add saveAs to reference it from a later step. */
  async $tf_purchaseWithCreditCard(params: PurchaseWithCreditCardParams) {
    const {
      creditCard,
      processorName,
      email = 'test@deuna.com',
      expectError = false,
      cardOverrides,
      transactionId,
    } = params;
    const action = 'api.payment.purchaseWithCreditCard';
    const merchantId = resolveMerchantId(this.context, action, params.merchantId);
    const privateKey = resolvePrivateKey(this.context, action, params.privateKey);
    const orderToken = resolveOrderToken(this.context, action, params.orderToken);

    const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

    const guestLoginResponse = await userAuthService.loginAsGuest(merchantId, privateKey);
    const userToken = guestLoginResponse.data.token;

    const purchaseRequest: PurchaseRequest = {
      token: orderToken,
      email,
      processor_name: processorName,
      method_type: MethodType.CREDIT_CARD,
      ...(transactionId !== undefined && { transaction_id: transactionId }),
      credit_card: { ...mapBaseCreditCardToCreditCard(creditCard), ...cardOverrides },
    };

    const response = await paymentService.purchase(
      privateKey,
      userToken,
      purchaseRequest,
      expectError
    );

    this.lastPurchase = { action, response };
    return response;
  }

  /** @description Pays the order through purchase V2 (POST /v2/merchants/orders/purchase) as a guest, with the given credit card and processor name. The payload is built by `buildPurchaseV2Payload`, so the card address fields are the ones registered for `country`. Use it instead of api.payment.purchaseWithCreditCard when the case covers the V2 endpoint. orderToken, merchantId and privateKey all default to what a previous setup.order / setup.merchant action produced. Returns the purchase response, which api.payment.assertPurchaseStatus then checks. */
  async $tf_purchaseV2WithCreditCard(params: PurchaseV2WithCreditCardParams) {
    const { creditCard, processorName, country, email, expectError = false } = params;
    const action = 'api.payment.purchaseV2WithCreditCard';
    const merchantId = resolveMerchantId(this.context, action, params.merchantId);
    const privateKey = resolvePrivateKey(this.context, action, params.privateKey);
    const orderToken = resolveOrderToken(this.context, action, params.orderToken);

    const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

    const guestLoginResponse = await userAuthService.loginAsGuest(merchantId, privateKey);
    const userToken = guestLoginResponse.data.token;

    const response = await paymentService.purchaseV2(
      privateKey,
      userToken,
      buildPurchaseV2Payload({
        country,
        processorName,
        card: creditCard,
        token: orderToken,
        ...(email !== undefined && { email }),
      }),
      expectError
    );

    this.lastPurchase = { action, response };
    return response;
  }

  /** @description Pays the order with a card the registered shopper already saved (purchase V2 with card_info.card_id), authenticating as that shopper rather than as a guest. Pass cardCvv to send the CVV the shopper re-enters at checkout. orderToken and privateKey default to what a previous setup.order / setup.merchant action produced. Returns the purchase response, which api.payment.assertPurchaseStatus then checks. */
  async $tf_purchaseWithSavedCard(params: PurchaseWithSavedCardParams) {
    const action = 'api.payment.purchaseWithSavedCard';
    const orderToken = resolveOrderToken(this.context, action, params.orderToken);

    const response = await this.purchaseSavedCard(
      action,
      { ...params, orderToken },
      `${Date.now()}.saved-card@deuna.com`
    );

    this.lastPurchase = { action, response };
    return response;
  }

  /** Sends one saved-card purchase; `defaultEmail` is the payer email when the spec has none. */
  private async purchaseSavedCard(
    action: string,
    purchase: SavedCardPurchase & { orderToken: string },
    defaultEmail: string
  ): Promise<ApiResponse<PurchaseResponse>> {
    const { userToken, cardId, cardCvv, processorName, orderToken } = purchase;
    const privateKey = resolvePrivateKey(this.context, action, purchase.privateKey);

    const request: PurchaseRequestV2 = {
      order_token: orderToken,
      payer_info: { email: purchase.email ?? defaultEmail },
      payment_source: {
        method_type: MethodType.CREDIT_CARD,
        processor: processorName,
        card_info: { card_id: cardId, ...(cardCvv !== undefined && { card_cvv: cardCvv }) },
      },
    };

    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
    return await paymentService.purchaseV2(
      privateKey,
      userToken,
      request,
      purchase.expectError ?? false
    );
  }

  private requireLastPurchase(action: string) {
    if (!this.lastPurchase) {
      throw new Error(
        `${action}: no purchase response found. Call api.payment.purchaseWithCreditCard, purchaseWithSavedCard or purchaseConcurrent first.`
      );
    }
    return this.lastPurchase;
  }

  /** @description Asserts the HTTP status code — and optionally a subset of the body — of the last purchase response. Throws if no purchase has been made yet. */
  async $tf_assertPurchaseStatus(params: { expectedStatus: number; expectedBody?: unknown }) {
    const { expectedStatus, expectedBody } = params;

    const { action, response } = this.requireLastPurchase('api.payment.assertPurchaseStatus');

    const expected: ExpectedResponse = { status: expectedStatus, body: expectedBody };
    assertHttpResponse(
      { method: 'POST', operation: action },
      { status: response.status, body: response.data },
      expected
    );
  }

  /**
   * @description Fires several saved-card purchases at the payment service at the same time
   * (Promise.all), so the server has to detokenize several vault tokens concurrently. Each
   * spec must reference a distinct `orderToken` and a saved `cardId` — build them with
   * `setup.user.enrollCard` and `setup.order.createOrder` — and may set `cardCvv` to send the
   * CVV the shopper re-enters. Each purchase is sent like api.payment.purchaseWithSavedCard
   * sends its single one. Returns the array of purchase responses in the same order as the
   * input specs, so a later step can pair each response with its expected card; the first one
   * is what api.payment.assertPurchaseStatus checks. Fails a purchase-by-purchase check via
   * `api.orders.assertPurchaseCardIntegrity`, not here — this action only orchestrates the
   * fan-out.
   */
  async $tf_purchaseConcurrent(params: PurchaseConcurrentParams) {
    const { purchases } = params;
    if (!Array.isArray(purchases) || purchases.length < 2) {
      throw new Error(
        `api.payment.purchaseConcurrent: expected an array of at least 2 purchase specs, got ${
          Array.isArray(purchases) ? purchases.length : typeof purchases
        }.`
      );
    }

    const action = 'api.payment.purchaseConcurrent';

    const results = await Promise.all(
      purchases.map((spec, index) =>
        this.purchaseSavedCard(`${action}[${index}]`, spec, `${Date.now()}.${index}@deuna.com`)
      )
    );

    this.lastPurchase = { action: `${action}[0]`, response: results[0] };
    return results;
  }

  /** @description Asserts the antifraud analysis the last purchase response exposes under order.fraud: the object is present, carries every documented field, and matches the expected processor, risk level, decision and manual-review status. Returns the analysis — add saveAs to compare it against GET Order later. */
  async $tf_assertPurchaseFraudAnalysis(params: FraudExpectation = {}) {
    const { response } = this.requireLastPurchase('api.payment.assertPurchaseFraudAnalysis');
    return this.globalAssert.assertFraudAnalysis(
      'purchase response',
      response.data?.order?.fraud,
      params
    );
  }
}
