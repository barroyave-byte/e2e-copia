import { Context, FrameworkPlugin } from '../interface';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { GetOrderResponse, PaymentData } from '@support/http/models/order';
import { resolveOrderToken, resolvePrivateKey } from '../../resolve';
import { assertHttpResponse, ExpectedResponse } from '../../httpContract';
import { retryUntil } from '@support/utils/retries';

/**
 * BAZ's validators for the two fields this action checks at their source, translated from
 * the errors reported in RIS-491 / INCS-2909:
 *
 *   - "Digits only"                         → afiliacion
 *   - "Digits only, maximum length 4"       → anio
 *
 * They are asserted against the fields EMA exposes on GET Order, which is what the outbound
 * payload is rendered from (`PayloadTransform` in ema/api/clients/webhook receives the order
 * as its template data). A value that fails here fails on BAZ's side too.
 *
 * The third rule — "Digits, letters and hyphen only" on `id` — is deliberately left out. The
 * incident's value (`baz_japay_01`) is the order's store code, and the underscore is replaced
 * after the order, further down the sync flow: at the source it is legitimately there. Checking
 * it needs the rendered payload, which this suite cannot read yet.
 */
const BAZ_RULES = {
  numericOnly: { pattern: /^[0-9]+$/, text: 'solo caracteres numéricos' },
  numericMaxLength4: {
    pattern: /^[0-9]{1,4}$/,
    text: 'solo caracteres numéricos con una longitud máxima de 4',
  },
} as const;

type BazRule = (typeof BAZ_RULES)[keyof typeof BAZ_RULES];

export interface AssertTransactionPayloadParams {
  /**
   * The `external_merchant_id` operations configured on the BAZ processor — the only value
   * `comercio.afiliacion` may carry.
   */
  expectedAffiliationCode: string;
  /**
   * The 4-digit year BAZ must receive. Pass it even when the card sent 2 digits: normalizing
   * that is the platform's job, and the incident is precisely that it did not happen.
   */
  expectedExpiryYear: string;
  /** The store_code the order was created with, when the spec set one explicitly. */
  expectedStoreCode?: string;
  privateKey?: string;
  orderToken?: string;
}

/** True once either field the assertion reads carries a value — not necessarily a valid one. */
function isPaymentDataSynced(paymentData?: PaymentData): boolean {
  return Boolean(paymentData?.merchant?.affiliation_code || paymentData?.from_card?.expiry_year);
}

export interface AssertOrderAffiliationParams {
  /** Status GET Order must report for the order, e.g. "succeeded". */
  expectedStatus: string;
  /** The `external_merchant_id` configured on the BAZ processor. */
  expectedAffiliationCode: string;
  /** The merchant_payment_processor_id returned by setup.processor.createProcessor. */
  expectedMerchantPaymentProcessorId: string;
  privateKey?: string;
  orderToken?: string;
}

const NULL_UUID = '00000000-0000-0000-0000-000000000000';

export class PluginApiBazSync extends FrameworkPlugin {
  pluginBaseName = 'api.bazSync';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  /** @description Fetches the order via GET Order and asserts the merchant and card fields of its payment data: merchant.affiliation_code equals expectedAffiliationCode and is numeric; from_card.expiry_year equals expectedExpiryYear and is numeric (up to 4 digits); merchant.store_code equals expectedStoreCode when given. Also fails when affiliation_code equals the transaction's external_transaction_id or the order's store_code. Polls until the payment data is populated. privateKey and orderToken default to what a previous setup.merchant / setup.order action produced. Returns the validated values — add saveAs to reference them from a later step. */
  async $tf_assertTransactionPayload(params: AssertTransactionPayloadParams) {
    const action = 'api.bazSync.assertTransactionPayload';
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
    const privateKey = resolvePrivateKey(this.context, action, params.privateKey);
    const orderToken = resolveOrderToken(this.context, action, params.orderToken);

    // The platform does emit this block with its fields still empty — the purchase response
    // carries `merchant.affiliation_code: ""` and `from_card.expiry_year: ""` — so the block
    // merely existing is not enough to read it. Waiting for the fields to be non-empty, not
    // correct, still fails a wrong value on the first read; and if they never fill in,
    // retryUntil returns the last read and the rules below report the empty values.
    const response = await retryUntil(
      () => emaService.getOrder(privateKey, orderToken),
      (result) => isPaymentDataSynced(result.data?.order?.payment?.data)
    );

    // Rules first: when the fallback from RIS-491 comes back, the failure should name it,
    // not surface as a generic "affiliation_code: expected X, got Y" diff.
    const snapshot = this.assertBazRules(response, params, action);
    this.assertExpectedValues(response, params);
    return snapshot;
  }

  /**
   * The exact values operations configured, as a subset match on the response body: a
   * mismatch is reported as a structural diff by the shared HTTP contract rather than as a
   * hand-rolled message per field.
   */
  private assertExpectedValues(
    response: { status: number; data?: GetOrderResponse },
    params: AssertTransactionPayloadParams
  ) {
    const merchant: Record<string, string> = { affiliation_code: params.expectedAffiliationCode };
    if (params.expectedStoreCode !== undefined) merchant.store_code = params.expectedStoreCode;

    const expected: ExpectedResponse = {
      status: 200,
      body: {
        order: {
          payment: {
            data: { merchant, from_card: { expiry_year: params.expectedExpiryYear } },
          },
        },
      },
    };

    assertHttpResponse(
      { method: 'GET', operation: 'api.bazSync.assertTransactionPayload' },
      { status: response.status, body: response.data },
      expected
    );
  }

  /**
   * BAZ's own validators, plus the regression guards for the affiliation errors behind RIS-491.
   *
   * Runs before the exact-value assertion, not instead of it: this one proves that whatever
   * value ends up there is one BAZ can accept — and names the RIS-491 mechanism when that is
   * what broke — while the other proves the values are the ones operations configured.
   */
  private assertBazRules(
    response: { data?: GetOrderResponse },
    params: AssertTransactionPayloadParams,
    action: string
  ) {
    const paymentData = response.data?.order?.payment?.data;
    if (!paymentData?.merchant || !paymentData?.from_card) {
      throw new Error(
        `${action}: the order has no payment data to validate — GET Order returned ` +
          `order.payment.data = ${JSON.stringify(paymentData)}. The purchase either never ` +
          `settled or the order token belongs to a different order.`
      );
    }

    const { merchant, from_card: fromCard } = paymentData;
    const failures: string[] = [];

    this.checkRule(
      failures,
      'comercio.afiliacion',
      merchant.affiliation_code,
      BAZ_RULES.numericOnly
    );
    this.checkRule(
      failures,
      'tarjeta.expiracion.anio',
      fromCard.expiry_year,
      BAZ_RULES.numericMaxLength4
    );

    // The incident's actual mechanism: when the gateway response carries no affiliation,
    // `assignAffiliationCode` (payments/api/services/transaction/purchase.go) fills it with the
    // invoice's external_transaction_id — an alphanumeric id such as "m9ghgfc2kbtmukvk71yz" in
    // production. In staging BAZ's transaction id is numeric, so the rule above alone would let
    // the fallback through; comparing the two fields catches it whatever shape the id takes.
    if (
      merchant.affiliation_code &&
      merchant.affiliation_code === paymentData.external_transaction_id
    ) {
      failures.push(
        `comercio.afiliacion (${merchant.affiliation_code}) is the transaction's ` +
          `external_transaction_id, not the processor's external_merchant_id — the ` +
          `affiliation fallback from RIS-491 is back`
      );
    }

    // The incident's second affiliation error (`afiliacion = baz_japay_01`) was the merchant's
    // own store identifier taking the affiliation's place.
    if (merchant.affiliation_code && merchant.affiliation_code === merchant.store_code) {
      failures.push(
        `comercio.afiliacion (${merchant.affiliation_code}) is the order's store_code, not the ` +
          `processor's external_merchant_id`
      );
    }

    if (failures.length > 0) {
      throw new Error(
        `${action}: the transaction payload would be rejected by BAZ:\n` +
          failures.map((failure) => `  - ${failure}`).join('\n')
      );
    }

    return this.payloadSnapshot(paymentData, params);
  }

  private checkRule(failures: string[], field: string, value: unknown, rule: BazRule) {
    if (typeof value !== 'string' || !rule.pattern.test(value)) {
      failures.push(`${field} = ${JSON.stringify(value)} fails BAZ's rule "${rule.text}"`);
    }
  }

  /** What the assertion validated, so a later step can `ref()` it instead of re-fetching. */
  private payloadSnapshot(paymentData: PaymentData, params: AssertTransactionPayloadParams) {
    return {
      afiliacion: paymentData.merchant.affiliation_code,
      anio: paymentData.from_card.expiry_year,
      storeCode: paymentData.merchant.store_code,
      externalTransactionId: paymentData.external_transaction_id,
      expected: params,
    };
  }

  /**
   * @description Fetches the order via GET Order (polling until it reaches expectedStatus) and
   * asserts the fields baz-middleware builds `afiliacion` from: payment.data.merchant.affiliation_code
   * equals expectedAffiliationCode and is digits only (BAZ rule); it is not the transaction's
   * external_transaction_id; and merchant_payment_processor_id equals
   * expectedMerchantPaymentProcessorId and is never the null UUID. privateKey and orderToken
   * default to what a previous setup.merchant / setup.order action produced; pass orderToken
   * explicitly when the spec created more than one order.
   */
  async $tf_assertOrderAffiliation(params: AssertOrderAffiliationParams) {
    const action = 'api.bazSync.assertOrderAffiliation';
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
    const privateKey = resolvePrivateKey(this.context, action, params.privateKey);
    const orderToken = resolveOrderToken(this.context, action, params.orderToken);

    const response = await retryUntil(
      () => emaService.getOrder(privateKey, orderToken),
      (result) => result.data?.order?.status === params.expectedStatus
    );

    const order = response.data?.order;
    const paymentData = order?.payment?.data;
    const failures: string[] = [];

    if (response.status !== 200) failures.push(`GET Order returned HTTP ${response.status}`);
    if (order?.status !== params.expectedStatus) {
      failures.push(`order status is "${order?.status}", expected "${params.expectedStatus}"`);
    }

    const affiliation = paymentData?.merchant?.affiliation_code;
    this.checkRule(failures, 'comercio.afiliacion', affiliation, BAZ_RULES.numericOnly);
    if (affiliation !== params.expectedAffiliationCode) {
      failures.push(
        `affiliation_code is ${JSON.stringify(affiliation)}, expected the processor's external_merchant_id ${JSON.stringify(params.expectedAffiliationCode)}`
      );
    }
    if (affiliation && affiliation === paymentData?.external_transaction_id) {
      failures.push(
        `affiliation_code (${affiliation}) is the transaction's external_transaction_id, not the processor's external_merchant_id`
      );
    }

    const mppId = paymentData?.merchant_payment_processor_id;
    if (mppId === NULL_UUID || !mppId) {
      failures.push(
        `merchant_payment_processor_id is ${JSON.stringify(mppId)} (null UUID or empty)`
      );
    } else if (mppId !== params.expectedMerchantPaymentProcessorId) {
      failures.push(
        `merchant_payment_processor_id is ${mppId}, expected ${params.expectedMerchantPaymentProcessorId}`
      );
    }

    if (failures.length > 0) {
      throw new Error(
        `${action}: the order would feed BAZ an invalid affiliation:\n` +
          failures.map((failure) => `  - ${failure}`).join('\n')
      );
    }
  }
}
