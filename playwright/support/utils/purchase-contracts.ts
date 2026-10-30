import { expect, Request } from '@playwright/test';

export { PURCHASE_URL_PATTERN } from './purchase';

// ─── Shape types (mirror of C04-e2e-purchase-capture.contract.ts) ────────────

export interface PurchaseRequestV1 {
  billing_address?: Record<string, string>;
  [key: string]: unknown;
}

export interface PurchaseRequestV2 {
  payment_source: {
    card_info?: {
      card_holder?: string;
      card_holder_dni?: string;
      card_holder_dni_type?: string;
      card_number?: string;
      card_cvv?: string;
      expiry_month?: string;
      expiry_year?: string;
      installments?: number;
      installments_type?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  payer_info: { email?: string; [key: string]: unknown };
  order_token: string;
  order?: { billing_address?: Record<string, string>; [key: string]: unknown };
  anti_fraud_info?: {
    device?: { id?: string };
    session_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type PurchaseRequest = PurchaseRequestV1 | PurchaseRequestV2;

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isV2PurchaseRequest(payload: unknown): payload is PurchaseRequestV2 {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return 'payment_source' in p && 'payer_info' in p && 'order_token' in p;
}

// ─── Device fingerprint assertion ─────────────────────────────────────────────

/**
 * Validates that the purchase request carries a device fingerprint for the
 * given anti-fraud provider(s). The fingerprint travels as a base64-encoded
 * JSON in `device_id` (v1) or `anti_fraud_info.device.id` (v2); once decoded
 * it must contain the provider key (e.g. "STRIPE").
 *
 * Takes the captured purchase request, so each page object passes whatever it
 * armed before the pay click (a `waitForRequest` promise, or `response.request()`).
 */
export function assertDeviceIdInPurchaseRequest(
  request: Request,
  options?: { antiFraudProvider?: string[] }
) {
  let payload: any = null;
  try {
    payload =
      typeof request.postDataJSON === 'function'
        ? request.postDataJSON()
        : request.postData()
          ? JSON.parse(request.postData())
          : null;
  } catch {
    payload = null;
  }
  expect(payload, 'purchase request payload').toBeTruthy();

  const deviceIdInRequest = isV2PurchaseRequest(payload)
    ? payload.anti_fraud_info?.device?.id
    : payload?.device_id;
  expect(deviceIdInRequest, 'device_id in purchase payload').toBeDefined();

  const deviceIdInRequestDecoded = Buffer.from(deviceIdInRequest, 'base64').toString('utf-8');
  expect(
    options?.antiFraudProvider?.every((provider) =>
      deviceIdInRequestDecoded.includes(provider.toUpperCase())
    ),
    `device_id "${deviceIdInRequestDecoded}" does not contain ${options?.antiFraudProvider}`
  ).toBeTruthy();
}

// ─── Asserter interface (IBillingFieldAsserter from C04) ──────────────────────

export interface IBillingFieldAsserter {
  assertEmail(expected: string): void;
  assertCity(expected: string): void;
  assertZipCode(expected: string): void;
  assertAddress(expected: string): void;
  assertPhone(expected: string): void;
  assertFirstLastName(firstName: string, lastName: string): void;
  assertCountry(country: string): void;
}
