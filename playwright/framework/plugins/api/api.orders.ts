import { Context, FrameworkPlugin } from '../interface';
import {
  resolveMerchantId,
  resolveMerchantToken,
  resolveOrderId,
  resolveOrderToken,
} from '../../resolve';
import {
  captureV2,
  getInvoicePayment,
  getTransactions,
  getTransactionsSettlement,
  refundOrderV2,
  Transaction,
  TransactionSettlement,
  voidOrder,
} from '@support/newman/apiCallNewman';
import { BaseValidationCapture } from '@support/interfaces/capture/baseValidationCapture';
import { BaseValidationRefund } from '@support/interfaces/refund/baseValidationRefund';
import { BaseValidationVoid } from '@support/interfaces/void/baseValidationVoid';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { TransactionTraceResponse } from '@support/http/models/transactionTrace';
import { FraudAnalysis, GetOrderResponse, GetOrdersListResponse } from '@support/http/models/order';
import {
  retryApiCall,
  retryGetFraudAnalysis,
  retryGetOrderStatus,
  retryUntil,
} from '@support/utils/retries';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { FraudExpectation } from '@support/api_sup/global_assert/fraudAnalysis';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { assertHttpResponse, checkHttpResponse, ExpectedResponse } from '../../httpContract';
import { Matchers } from '../../matchers';

/** Operation types whose request carries the card: authorize, or purchase on automatic capture. */
const CARD_OPERATION_TYPES = ['authorize', 'purchase'];

/** Operation statuses that mean the processor did not charge the card. */
const DECLINED_STATUSES = ['denied', 'declined', 'failed', 'error', 'rejected'];

/** Fields of Bamboo's `CardData` object that an accepted authorization sends. */
const BAMBOO_CARD_DATA_FIELDS = ['CVV', 'CardHolderName', 'Email', 'Expiration', 'Pan'];

export interface AssertOrderFraudAnalysisParams extends FraudExpectation {
  /**
   * Analysis already asserted on another source — pass `ref()` to the value saved by
   * `api.payment.assertPurchaseFraudAnalysis` to prove GET Order agrees with the purchase
   * response.
   */
  matches?: FraudAnalysis;
  privateKey?: string;
  orderToken?: string;
}

/**
 * One order's expected card data, checked against sources chosen so a concurrent
 * detokenization race cannot hide behind any of them. For each order the assertion pulls
 * two independent references and compares them:
 *   - `settlement.card_token` (Metabase column) — the vault token DEUNA recorded for the
 *     transaction. Stored before the outgoing request to the vault proxy, so it stays
 *     correct even when the race fires.
 *   - `settlement.raw_request.field_63_reserved_private_data["02"]` — the vault token
 *     actually embedded in the ISO-8583 message shipped to the processor. This is the
 *     surface the URL-object race corrupts: on regression it carries another concurrent
 *     order's vault token instead of this order's.
 * These two must agree. It also asserts `raw_request.card_brand` matches the enrolled
 * brand, and — through `cardGroupLabel` — that no vault token bleeds between shoppers.
 */
export interface ExpectedOrderCard {
  /** Order token whose transaction is being checked. */
  orderToken: string;
  /** Expected BIN (first six digits) of the card enrolled by the shopper. */
  expectedFirstSix: string;
  /** Expected last four digits of the card enrolled by the shopper. */
  expectedLastFour: string;
  /**
   * Expected brand string as the processor's raw_request reports it — Elavon labels 6011
   * as "diners", not "discover"; a Visa comes back as "visa", a Mastercard as "master".
   * Assert once per settlement so a swap into another brand's PAN is caught even when the
   * VGS token comparison alone happens to line up.
   */
  expectedCardBrand: string;
  /**
   * Arbitrary label that identifies which enrolled card this order used. All orders that
   * share a label MUST share the same `settlement.card_token`, and orders with different
   * labels MUST have different tokens. This is what turns a per-order internal-consistency
   * check into a cross-order crosstalk check.
   */
  cardGroupLabel: string;
}

export interface AssertPurchaseCardIntegrityParams {
  transactions: ExpectedOrderCard[];
  privateKey?: string;
}

export interface AssertOrderShippingContactParams {
  /** A `api.orders.getOrder` response, passed with `ref()`. */
  response: ApiResponse<GetOrderResponse>;
  /** Expected phone, as the string the order is expected to expose. */
  expectedPhone: string;
  expectedName?: string;
  expectedStoreName?: string;
  /** Defaults to 200. */
  expectedStatus?: number;
}

/** One processor operation by type and status, e.g. `{ type: 'capture', status: 'captured' }`. */
export interface ExpectedProcessorOperation {
  type: string;
  status: string;
}

export interface AssertBambooCardDataParams {
  /** An `api.orders.getProcessorTransactions` result, passed with `ref()`. */
  transactions: Transaction[];
  /** Every operation the invoice must hold, in order. */
  expectedOperations: ExpectedProcessorOperation[];
}

/** Names the type of a CardData value without printing it. */
function describeCardDataValue(value: unknown): string {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (typeof value === 'string') return 'a blank string';
  if (Array.isArray(value)) return 'an array';
  return typeof value === 'object' ? 'an object' : `a ${typeof value}`;
}

/** One event of GET /trace/logs?sub_type=transaction_visibility. */
export type TransactionVisibilityEvent = TransactionTraceResponse;

const visibilityEventName = (event: TransactionVisibilityEvent): string =>
  event?.metadata?.transaction_visibility?.event_name ?? '';

const CARD_NUMBER_KEY = /^(number|card_?number|pan)$/i;
const CARD_SECRET_KEY = /^(cvv2?|cvc2?|card_?cvv|security_?code)$/i;

/**
 * Walks a Transaction Visibility event and describes (path and rule, never the value) every
 * card-number field holding 12+ digits and every CVV field holding a 3–4 digit value.
 */
function findUnmaskedCardFields(node: unknown, path = '$'): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => findUnmaskedCardFields(item, `${path}[${i}]`));
  }
  if (typeof node !== 'object' || node === null) return [];

  return Object.entries(node).flatMap(([key, value]) => {
    const here = `${path}.${key}`;
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value);
      if (CARD_NUMBER_KEY.test(key) && text.replace(/[ -]/g, '').match(/\d{12,}/)) {
        return [`${here} holds an unmasked card number.`];
      }
      if (CARD_SECRET_KEY.test(key) && /^\d{3,4}$/.test(text)) {
        return [`${here} holds an unmasked security code.`];
      }
      return [];
    }
    return findUnmaskedCardFields(value, here);
  });
}

export class PluginApiOrders extends FrameworkPlugin {
  pluginBaseName = 'api.orders';

  private globalAssert = new GlobalAssert();

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  private resolvePrivateKey(action: string, privateKey?: string): string {
    const resolved = privateKey ?? this.context.merchant?.privateKey;
    if (!resolved) {
      throw new Error(
        `${action}: privateKey is required — pass it in params or run a setup.merchant action first`
      );
    }
    return resolved;
  }

  /**
   * @description Fetches the Metabase settlements rows for an order token via
   * `getTransactionsSettlement`. Polls until at least `minCount` rows are indexed (Metabase
   * is eventually consistent — a call right after a purchase can return an empty list).
   * Each row carries the fields the concurrent-detokenization assertion needs:
   * `card_token` (which saved card the transaction claims) and `raw_request` (the exact
   * payload sent to the processor, i.e. the only surface where a vault-detokenization race
   * is observable). Returns the array of settlement rows — add `saveAs` to reference it
   * from a later step.
   */
  async $tf_getSettlements(
    params: {
      orderToken?: string;
      minCount?: number;
      retries?: number;
      delayMs?: number;
    } = {}
  ): Promise<TransactionSettlement[]> {
    const action = 'api.orders.getSettlements';
    const orderToken = resolveOrderToken(this.context, action, params.orderToken);
    const minCount = params.minCount ?? 1;

    return await retryUntil(
      () => getTransactionsSettlement(orderToken),
      (rows) => Array.isArray(rows) && rows.length >= minCount,
      params.retries ?? 12,
      params.delayMs ?? 3000
    );
  }

  /**
   * @description Asserts, for every order in `transactions`, that the card data is coherent
   * across the sources a concurrent-detokenization race can make disagree:
   *   - GET Order's `from_card.first_six` / `last_four` match the expected card.
   *   - Every settlement row has a `card_token`, and its `raw_request` parses as JSON with
   *     a `card_brand` matching `expectedCardBrand`. The processor's brand string is what
   *     it saw on the detokenized PAN — a swap into another card's PAN changes it (Visa
   *     4000-… reports "visa"; Discover 6011-… reports "diners").
   *   - The vault token DEUNA recorded (`settlement.card_token`) equals the vault token
   *     actually shipped in the outgoing message
   *     (`raw_request.message.field_63_reserved_private_data["02"]`, stripped of the
   *     `.CardCVV` suffix). A vault-URL race's fingerprint is exactly this pair
   *     disagreeing: DEUNA recorded card A's token but shipped card B's.
   *   - Cross-order: settlements sharing a `cardGroupLabel` MUST share one `card_token`,
   *     and settlements from different labels MUST have different `card_token`s. This is
   *     what catches token bleed between concurrent shoppers.
   * Collects every discrepancy across all transactions before throwing, so a regression
   * run reports every affected order at once rather than only the first one.
   */
  async $tf_assertPurchaseCardIntegrity(params: AssertPurchaseCardIntegrityParams) {
    const action = 'api.orders.assertPurchaseCardIntegrity';
    const { transactions } = params;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error(`${action}: "transactions" must be a non-empty array.`);
    }

    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
    const privateKey = this.resolvePrivateKey(action, params.privateKey);

    const failures: string[] = [];
    const tokensByGroup = new Map<string, Set<string>>();
    const groupsByToken = new Map<string, Set<string>>();

    for (const expected of transactions) {
      const { orderToken, expectedFirstSix, expectedLastFour, expectedCardBrand, cardGroupLabel } =
        expected;
      const orderLabel = `order ${orderToken} [${cardGroupLabel}]`;

      const orderResponse = await emaService.getOrder(privateKey, orderToken);
      const fromCard = orderResponse.data?.order?.payment?.data?.from_card;
      if (!fromCard) {
        failures.push(`${orderLabel}: GET Order response has no order.payment.data.from_card.`);
      } else {
        if (fromCard.first_six !== expectedFirstSix) {
          failures.push(
            `${orderLabel}: from_card.first_six is "${fromCard.first_six}", expected "${expectedFirstSix}".`
          );
        }
        if (fromCard.last_four !== expectedLastFour) {
          failures.push(
            `${orderLabel}: from_card.last_four is "${fromCard.last_four}", expected "${expectedLastFour}".`
          );
        }
      }

      const settlements = await retryUntil(
        () => getTransactionsSettlement(orderToken),
        (rows) => Array.isArray(rows) && rows.length >= 1,
        12,
        3000
      );

      if (settlements.length === 0) {
        failures.push(`${orderLabel}: no settlement rows found for the transaction.`);
        continue;
      }

      for (const [index, settlement] of settlements.entries()) {
        const settlementLabel = `${orderLabel} settlement[${index}]`;

        if (!settlement.card_token) {
          failures.push(`${settlementLabel}: settlement.card_token is empty.`);
        } else {
          if (!tokensByGroup.has(cardGroupLabel)) tokensByGroup.set(cardGroupLabel, new Set());
          tokensByGroup.get(cardGroupLabel)!.add(settlement.card_token);
          if (!groupsByToken.has(settlement.card_token)) {
            groupsByToken.set(settlement.card_token, new Set());
          }
          groupsByToken.get(settlement.card_token)!.add(cardGroupLabel);
        }

        let parsedRawRequest: Record<string, unknown> | null = null;
        try {
          parsedRawRequest = JSON.parse(settlement.raw_request ?? '') as Record<string, unknown>;
        } catch {
          failures.push(`${settlementLabel}: raw_request is not valid JSON.`);
          continue;
        }

        const authorizeRequest =
          (parsedRawRequest?.['raw_purchase_authorize_request'] as
            | Record<string, unknown>
            | undefined) ?? undefined;
        if (!authorizeRequest) {
          failures.push(
            `${settlementLabel}: raw_request has no "raw_purchase_authorize_request" object.`
          );
          continue;
        }

        const actualBrand = authorizeRequest['card_brand'];
        if (actualBrand !== expectedCardBrand) {
          failures.push(
            `${settlementLabel}: raw_request.card_brand is "${String(actualBrand)}", expected "${expectedCardBrand}" — a different card's PAN was sent to the processor.`
          );
        }

        const message = authorizeRequest['message'] as Record<string, unknown> | undefined;
        const field63 = message?.['field_63_reserved_private_data'] as
          | Record<string, unknown>
          | undefined;
        const field63Slot02 = field63?.['02'];
        if (typeof field63Slot02 !== 'string') {
          failures.push(
            `${settlementLabel}: raw_request.message.field_63_reserved_private_data["02"] is missing or not a string.`
          );
        } else {
          const shippedToken = field63Slot02.replace(/\.CardCVV$/, '');
          if (shippedToken !== settlement.card_token) {
            failures.push(
              `${settlementLabel}: vault token shipped to the processor ("${shippedToken}") does not match settlement.card_token ("${settlement.card_token}") — a concurrent detokenization overwrote the token in the outgoing request.`
            );
          }
        }
      }
    }

    for (const [label, tokens] of tokensByGroup) {
      if (tokens.size > 1) {
        failures.push(
          `card group "${label}": settlements report multiple distinct card_tokens (${[...tokens].map((t) => `"${t}"`).join(', ')}) — a concurrent shopper's vault token bled into this group.`
        );
      }
    }
    for (const [token, groups] of groupsByToken) {
      if (groups.size > 1) {
        failures.push(
          `card_token "${token}": appears in more than one card group (${[...groups].map((g) => `"${g}"`).join(', ')}) — the same vault token was reused across shoppers.`
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${action}: card data was not coherent across GET Order, settlements.card_token and settlements.raw_request:\n` +
          failures.map((f) => `  - ${f}`).join('\n')
      );
    }
  }

  /**
   * @description Reads every `transaction_visibility` event of an order from GET /trace/logs (the
   * feed the Admin's Transaction Visibility screen renders). Polls until an event named
   * `untilEvent` (default `tv_continue_three_ds_called`, the 3DS Evaluation Update) is indexed;
   * if it never shows up the events read so far are returned, so the assertion that consumes
   * them reports the missing event. orderId, merchantId and merchantToken default to what a
   * previous setup.order / setup.merchant action produced. Returns the events — add saveAs to
   * pass them to api.orders.assertTransactionVisibilityMasksCard with ref().
   */
  async $tf_getTransactionVisibility(
    params: {
      orderId?: string;
      merchantId?: string;
      merchantToken?: string;
      untilEvent?: string;
      retries?: number;
      delayMs?: number;
    } = {}
  ): Promise<TransactionVisibilityEvent[]> {
    const action = 'api.orders.getTransactionVisibility';
    const orderId = resolveOrderId(this.context, action, params.orderId);
    const merchantId = resolveMerchantId(this.context, action, params.merchantId);
    const merchantToken = resolveMerchantToken(this.context, action, params.merchantToken);
    const untilEvent = params.untilEvent ?? 'tv_continue_three_ds_called';
    const traceService = ServiceFactory.getService(SERVICE_KEYS.TRANSACTION_TRACE);

    return await retryUntil(
      async () =>
        (
          await traceService.getTransactionVisibilityLogs(
            orderId,
            'transaction_visibility',
            merchantId,
            merchantToken
          )
        ).data ?? [],
      (events) => events.some((event) => visibilityEventName(event) === untilEvent),
      params.retries ?? 10,
      params.delayMs ?? 3000
    );
  }

  /**
   * Reports event names and JSON paths only: the payload under test holds the card data.
   *
   * @description Asserts that no Transaction Visibility event (saved via
   * api.orders.getTransactionVisibility, pass with ref()) exposes the card (RIS-482). Fails when
   * (1) a `requiredEvents` name is missing, so the check cannot pass on an empty feed;
   * (2) the full PAN — also with spaces or dashes between digits — appears anywhere in any
   * event; (3) the first or last 10 PAN digits appear, i.e. a defective partial mask such as the
   * first 12 digits left visible (BIN + last 4 stay allowed); (4) a field named number,
   * cardNumber, card_number or similar holds 12+ digits, or a cvv / cvc / cvv2 / securityCode
   * field holds a 3–4 digit value.
   */
  async $tf_assertTransactionVisibilityMasksCard(params: {
    events: TransactionVisibilityEvent[];
    pan: string;
    requiredEvents?: string[];
  }) {
    const action = 'api.orders.assertTransactionVisibilityMasksCard';
    const { events, pan, requiredEvents = [] } = params;

    if (!Array.isArray(events)) {
      throw new Error(
        `${action}: "events" must be the array returned by api.orders.getTransactionVisibility, got ${typeof events}.`
      );
    }
    if (!/^\d{13,19}$/.test(pan)) {
      throw new Error(`${action}: "pan" must be 13 to 19 digits.`);
    }

    const failures: string[] = [];
    const names = events.map(visibilityEventName);

    for (const required of requiredEvents) {
      if (!names.includes(required)) {
        failures.push(
          `event ${required} was not found (events read: ${names.join(', ') || 'none'}).`
        );
      }
    }

    // Prefix and suffix, not every window: a PAN such as 4000000000002701 has all-zero windows
    // that match nil UUIDs.
    const panEdges = [pan.slice(0, 10), pan.slice(-10)];
    const spacedPan = new RegExp(pan.split('').join('[ -]?'));

    events.forEach((event, index) => {
      const label = `${visibilityEventName(event) || 'unnamed event'} #${index}`;
      const serialized = JSON.stringify(event);

      if (serialized.includes(pan) || spacedPan.test(serialized)) {
        failures.push(`${label}: the full PAN is exposed.`);
      } else if (panEdges.some((edge) => serialized.includes(edge))) {
        failures.push(`${label}: the first or last 10 PAN digits are exposed (partial mask).`);
      }

      for (const field of findUnmaskedCardFields(event)) {
        failures.push(`${label}: ${field}`);
      }
    });

    if (failures.length > 0) {
      throw new Error(
        `${action}: card data is exposed in Transaction Visibility:\n` +
          failures.map((f) => `  - ${f}`).join('\n')
      );
    }
  }

  /** @description Fetches an order via GET /v2/orders using the EMA service. privateKey and orderToken default to the merchant and order stored in the test context. Returns the full order response — add saveAs to reference it from a later step. */
  async $tf_getOrder(params: { privateKey?: string; orderToken?: string } = {}) {
    const action = 'api.orders.getOrder';
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);

    return await emaService.getOrder(
      this.resolvePrivateKey(action, params.privateKey),
      resolveOrderToken(this.context, action, params.orderToken)
    );
  }

  /** @description Polls GET Order until the payment reaches `status` (e.g. authorized, partial_captured, captured, voided, refunded, processed) and fails with the last status read when the retries run out. Use it after a purchase, capture, void or refund, whose status change EMA reflects asynchronously. privateKey and orderToken default to the merchant and order stored in the test context; pass orderToken explicitly when the spec created more than one order. */
  async $tf_waitForOrderStatus(params: {
    status: OrderStatusTypes;
    privateKey?: string;
    orderToken?: string;
  }) {
    const action = 'api.orders.waitForOrderStatus';
    await retryGetOrderStatus(
      ServiceFactory.getService(SERVICE_KEYS.EMA),
      this.resolvePrivateKey(action, params.privateKey),
      resolveOrderToken(this.context, action, params.orderToken),
      params.status
    );
  }

  /** @description Fetches the order and asserts the antifraud analysis it exposes under order.fraud. Polls until the fraud engine has written the analysis, so it is safe to call right after a purchase. Pass `matches` with the analysis saved from the purchase response to prove both sources agree. */
  async $tf_assertOrderFraudAnalysis(params: AssertOrderFraudAnalysisParams = {}) {
    const action = 'api.orders.assertOrderFraudAnalysis';
    const { matches, privateKey, orderToken, ...expected } = params;

    const fraud = await retryGetFraudAnalysis(
      ServiceFactory.getService(SERVICE_KEYS.EMA),
      this.resolvePrivateKey(action, privateKey),
      resolveOrderToken(this.context, action, orderToken)
    );

    const analysis = this.globalAssert.assertFraudAnalysis('GET Order', fraud, expected);

    if (matches) {
      this.globalAssert.assertFraudAnalysisMatches('GET Order', analysis, matches);
    }

    return analysis;
  }

  /** @description Captures an order via API using the v2 capture endpoint. Optionally provide a partial capture amount and whether it is the final capture. Uses the given privateKey and orderToken, or falls back to the merchant and order stored in the test context. */
  async $tf_captureViaAPI(params: {
    validation: BaseValidationCapture;
    amount?: number;
    isFinal?: boolean;
    privateKey?: string;
    orderToken?: string;
  }) {
    const { validation, amount = 0, isFinal, privateKey, orderToken } = params;
    return await captureV2(
      validation,
      this.resolvePrivateKey('captureViaAPI', privateKey),
      amount,
      isFinal,
      { orderToken: resolveOrderToken(this.context, 'api.orders.captureViaAPI', orderToken) }
    );
  }

  /** @description Refunds an order via API using the Newman/Postman collection runner. Optionally provide a partial refund amount. Uses the given privateKey or falls back to the merchant stored in the test context. */
  async $tf_refundViaAPI(params: {
    validation: BaseValidationRefund;
    amount?: number;
    privateKey?: string;
    orderToken?: string;
  }) {
    const { validation, amount = 0, privateKey, orderToken } = params;
    await refundOrderV2(
      validation,
      this.resolvePrivateKey('refundViaAPI', privateKey),
      amount,
      false,
      {
        orderToken: resolveOrderToken(this.context, 'api.orders.refundViaAPI', orderToken),
      }
    );
  }

  /** @description Voids an order via API using the Newman/Postman collection runner. Optionally provide a partial void amount. Uses the given privateKey or falls back to the merchant stored in the test context. */
  async $tf_voidViaAPI(params: {
    validation: BaseValidationVoid;
    amount?: number;
    privateKey?: string;
    orderToken?: string;
  }) {
    const { validation, amount = 0, privateKey, orderToken } = params;
    await voidOrder(
      validation,
      this.resolvePrivateKey('voidViaAPI', privateKey),
      amount,
      resolveOrderToken(this.context, 'api.orders.voidViaAPI', orderToken)
    );
  }

  /** @description Lists merchant orders via GET /merchants/orders — the endpoint behind the ADMIN panel's order list and pagination (PLAT-T1623 / EMA-9999). Pass `cursor` from a previous call's response to fetch the next page. privateKey defaults to the merchant stored in the test context. Set expectError to true to get an error response back instead of a thrown exception. Pass minTotal to poll (OpenSearch indexes purchased orders asynchronously — a call right after a purchase can undercount until indexing catches up) until `total` reaches it or retries are exhausted. Returns the full response — add saveAs to reference it from a later step (its cursor, or an assertion action). */
  async $tf_listOrders(
    params: {
      pageSize?: number;
      cursor?: string;
      privateKey?: string;
      expectError?: boolean;
      minTotal?: number;
    } = {}
  ): Promise<ApiResponse<GetOrdersListResponse>> {
    const action = 'api.orders.listOrders';
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
    const privateKey = this.resolvePrivateKey(action, params.privateKey);
    const query = { pageSize: params.pageSize, cursor: params.cursor };
    const expectError = params.expectError ?? false;

    if (params.minTotal === undefined) {
      return await emaService.getOrders(privateKey, query, expectError);
    }

    return await retryUntil(
      () => emaService.getOrders(privateKey, query, expectError),
      (response) => {
        const total = response.data?.total;
        if (typeof total !== 'number') {
          throw new Error(
            `${action}: response body has no numeric "total" field (status ${response.status}, body ${JSON.stringify(response.data)}) — minTotal expects a successful listing response, not an error one.`
          );
        }
        return total >= params.minTotal!;
      },
      5,
      2000
    );
  }

  /** @description Asserts the HTTP status — and optionally a subset of the body, e.g. { total, there_are_more_records } — of a GET /merchants/orders response saved via api.orders.listOrders (pass it with ref()). */
  async $tf_assertOrdersResponse(params: {
    response: ApiResponse<GetOrdersListResponse>;
    expectedStatus: number;
    expectedBody?: Partial<GetOrdersListResponse>;
  }) {
    const { response, expectedStatus, expectedBody } = params;
    const expected: ExpectedResponse = { status: expectedStatus, body: expectedBody };

    assertHttpResponse(
      { method: 'GET', operation: 'api.orders.listOrders' },
      { status: response.status, body: response.data },
      expected
    );
  }

  /** @description Asserts that two consecutive GET /merchants/orders pages (saved via api.orders.listOrders, pass with ref()) together contain exactly the given order ids once each — no order_id missing, none repeated across pages. Compares by order.order_id. */
  async $tf_assertOrdersPagesCoverOrderIds(params: {
    firstPage: ApiResponse<GetOrdersListResponse>;
    secondPage: ApiResponse<GetOrdersListResponse>;
    expectedOrderIds: string[];
  }) {
    const { firstPage, secondPage, expectedOrderIds } = params;

    const orderIdsOf = (page: ApiResponse<GetOrdersListResponse>, label: string): string[] => {
      if (!Array.isArray(page.data?.orders)) {
        throw new Error(
          `api.orders.assertOrdersPagesCoverOrderIds: ${label} has no "orders" array (status ${page.status}, body ${JSON.stringify(page.data)}) — assert its status with api.orders.assertOrdersResponse first.`
        );
      }
      return page.data.orders.map((entry) => entry.order.order_id);
    };

    const firstIds = orderIdsOf(firstPage, 'firstPage');
    const secondIds = orderIdsOf(secondPage, 'secondPage');
    const combined = [...firstIds, ...secondIds];

    const repeated = firstIds.filter((id) => secondIds.includes(id));
    const missing = expectedOrderIds.filter((id) => !combined.includes(id));
    const unexpected = combined.filter((id) => !expectedOrderIds.includes(id));

    const problems: string[] = [];
    if (repeated.length > 0)
      problems.push(`order_id(s) repeated across both pages: ${repeated.join(', ')}`);
    if (missing.length > 0)
      problems.push(`expected order_id(s) missing from both pages: ${missing.join(', ')}`);
    if (unexpected.length > 0)
      problems.push(`unexpected order_id(s) not in the expected set: ${unexpected.join(', ')}`);

    if (problems.length > 0) {
      throw new Error(
        `api.orders.assertOrdersPagesCoverOrderIds: pagination mismatch:\n` +
          problems.map((p) => `  - ${p}`).join('\n')
      );
    }
  }

  /**
   * Uses `checkHttpResponse` rather than `assertHttpResponse` so the value diff and the type
   * check are reported together instead of one hiding the other.
   *
   * @description Asserts the shipping contact of a GET Order response (saved via
   * api.orders.getOrder, pass with ref()): the expected HTTP status, the contact phone value,
   * and that the phone is a JSON string rather than a number. Also checks contact.name and
   * details.store_name when given.
   */
  async $tf_assertOrderShippingContact(params: AssertOrderShippingContactParams) {
    const action = 'api.orders.assertOrderShippingContact';
    const { response, expectedPhone, expectedName, expectedStoreName, expectedStatus } = params;

    const contact: Record<string, unknown> = { phone: expectedPhone };
    if (expectedName !== undefined) contact.name = expectedName;

    const details: Record<string, unknown> = { contact };
    if (expectedStoreName !== undefined) details.store_name = expectedStoreName;

    const check = checkHttpResponse(
      { method: 'GET', operation: 'api.orders.getOrder' },
      { status: response.status, body: response.data },
      { status: expectedStatus ?? 200, body: { order: { shipping_options: { details } } } }
    );

    const failures = [...check.failures];

    // Read as `unknown`: the model types it `string`, and this check exists for the case
    // where the response does not honour that.
    const actualPhone: unknown = response.data?.order?.shipping_options?.details?.contact?.phone;

    if (actualPhone !== undefined && typeof actualPhone !== 'string') {
      failures.push(
        `body: order.shipping_options.details.contact.phone is a JSON ${typeof actualPhone} ` +
          `(${JSON.stringify(actualPhone)}), expected a string.`
      );
    }

    if (failures.length > 0) {
      throw new Error(
        `${action}: GET Order did not expose the shipping contact as expected:\n` +
          failures.map((f) => `  - ${f}`).join('\n')
      );
    }
  }

  /**
   * @description Reads from Metabase the operations the payment service recorded for the
   * order's invoice (authorize, capture, refund, void…), each with the raw request it sent to
   * the processor and the raw response it got back. Polls until there is a row for every type
   * in `untilTypes`, and returns what it has once the retries run out, so the assertion that
   * reads it reports what is missing. orderToken defaults to the order from a previous
   * setup.order action. Returns the rows — add saveAs to pass them to an assertion with ref().
   */
  async $tf_getProcessorTransactions(
    params: {
      orderToken?: string;
      untilTypes?: string[];
      retries?: number;
      delayMs?: number;
    } = {}
  ): Promise<Transaction[]> {
    const action = 'api.orders.getProcessorTransactions';
    const orderToken = resolveOrderToken(this.context, action, params.orderToken);
    const untilTypes = params.untilTypes ?? [];

    // An empty order id makes the invoice query match by order token alone.
    const invoice = await retryApiCall(
      () => getInvoicePayment(orderToken, ''),
      (found) => Boolean(found?.id)
    );

    return await retryUntil(
      () => getTransactions(invoice.id),
      (rows) => untilTypes.every((type) => rows.some((row) => row.type === type)),
      params.retries ?? 10,
      params.delayMs ?? 3000
    );
  }

  /**
   *
   * @description Asserts that an order paid through a cascade of affiliations was charged exactly
   * once (RIS-147). `order` is a GET Order response (api.orders.getOrder, pass with ref()) and
   * `transactions` the operations of its invoice (api.orders.getProcessorTransactions, pass with
   * ref()). Fails when (1) GET Order is not HTTP 200 with the expected payment status; (2) the
   * payment was not made through `expectedMerchantPaymentProcessorId`, the first affiliation of
   * the cascade; (3) the invoice holds more or fewer than `expectedAttempts` purchase/authorize
   * operations, i.e. a later affiliation was also attempted; (4) more than one of those
   * operations was not declined, i.e. the customer was charged twice. The failure lists every
   * operation read, so the message shows what the second affiliation did.
   */
  async $tf_assertSingleSuccessfulCharge(params: {
    order: ApiResponse<GetOrderResponse>;
    transactions: Transaction[];
    expectedMerchantPaymentProcessorId: string;
    expectedStatus: string;
    /** Charge attempts the cascade must have made. 1 when the first affiliation approves. */
    expectedAttempts?: number;
  }) {
    const action = 'api.orders.assertSingleSuccessfulCharge';
    const {
      order,
      transactions,
      expectedMerchantPaymentProcessorId,
      expectedStatus,
      expectedAttempts = 1,
    } = params;

    if (!Array.isArray(transactions)) {
      throw new Error(
        `${action}: "transactions" must be the array returned by api.orders.getProcessorTransactions, got ${typeof transactions}.`
      );
    }

    const payment = order?.data?.order?.payment?.data;
    const failures: string[] = [];

    const http = checkHttpResponse(
      { method: 'GET', operation: 'getOrder' },
      { status: order.status, body: order.data },
      { status: 200, body: { order: { payment: { data: { status: expectedStatus } } } } }
    );
    failures.push(...http.failures);

    if (payment?.merchant_payment_processor_id !== expectedMerchantPaymentProcessorId) {
      failures.push(
        `the order was paid through merchant_payment_processor_id ${payment?.merchant_payment_processor_id}, expected the first affiliation ${expectedMerchantPaymentProcessorId}.`
      );
    }

    const attempts = transactions.filter((t) => CARD_OPERATION_TYPES.includes(t.type));
    const charges = attempts.filter((t) => !DECLINED_STATUSES.includes(t.status));
    const read = attempts.map((t) => `${t.type}:${t.status}`).join(', ') || 'none';

    if (attempts.length !== expectedAttempts) {
      failures.push(
        `expected ${expectedAttempts} charge attempt(s) for the order, found ${attempts.length} (${read}).`
      );
    }
    if (charges.length > 1) {
      failures.push(
        `the customer was charged ${charges.length} times (${read}), at most 1 allowed.`
      );
    }

    if (failures.length > 0) {
      throw new Error(`${action}: ${failures.join(' ')}`);
    }
  }

  /**
   * Reports CardData fields by name and value type only: their values are card data.
   *
   * @description Asserts the processor operations of a Bamboo order (saved via
   * api.orders.getProcessorTransactions, pass with ref()): their types and statuses match
   * `expectedOperations` in order, and the request of the operation that carried the card
   * (authorize, or purchase on automatic capture) sent a CardData object whose CVV,
   * CardHolderName, Email, Expiration and Pan are all non-blank strings.
   */
  async $tf_assertBambooCardData(params: AssertBambooCardDataParams) {
    const action = 'api.orders.assertBambooCardData';
    const { transactions, expectedOperations } = params;

    if (!Array.isArray(transactions)) {
      throw new Error(
        `${action}: "transactions" must be the array returned by api.orders.getProcessorTransactions, got ${typeof transactions}.`
      );
    }

    const failures: string[] = [];

    const operations = Matchers.equals.evaluate(
      transactions.map(({ type, status }) => ({ type, status })),
      expectedOperations
    );
    if (!operations.passed) failures.push(`operations: ${operations.message}`);

    const cardOperation = transactions.find((t) => CARD_OPERATION_TYPES.includes(t.type));
    if (!cardOperation) {
      failures.push(
        `no ${CARD_OPERATION_TYPES.join(' or ')} operation to read CardData from ` +
          `(operations: ${transactions.map((t) => t.type).join(', ') || 'none'}).`
      );
    } else {
      const cardData: unknown = (cardOperation.raw_request as Record<string, unknown> | null)
        ?.CardData;

      if (typeof cardData !== 'object' || cardData === null || Array.isArray(cardData)) {
        failures.push(
          `${cardOperation.type} request: CardData is ${describeCardDataValue(cardData)}, expected an object.`
        );
      } else {
        const fields = cardData as Record<string, unknown>;
        for (const field of BAMBOO_CARD_DATA_FIELDS) {
          const value = fields[field];
          if (typeof value === 'string' && value.trim() !== '') continue;
          failures.push(
            `${cardOperation.type} request: CardData.${field} is ${describeCardDataValue(value)}, ` +
              `expected a non-blank string (CardData fields: ${Object.keys(fields).join(', ') || 'none'}).`
          );
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${action}: the requests sent to Bamboo did not match:\n` +
          failures.map((f) => `  - ${f}`).join('\n')
      );
    }
  }
}
