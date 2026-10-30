import { expect } from '@playwright/test';
import {
  isV2PurchaseRequest,
  IBillingFieldAsserter,
  PurchaseRequest,
  PurchaseRequestV1,
} from './purchase-contracts';

/**
 * Asserter V1: campos en billing_address top-level del request body.
 * DDD: Value Object que encapsula las reglas de aserción para el contrato V1.
 */
class V1BillingAsserter implements IBillingFieldAsserter {
  constructor(private readonly payload: { billing_address?: Record<string, string> }) {}

  assertEmail(expected: string)   { expect(this.payload.billing_address?.email).toContain(expected); }
  assertCity(expected: string)    { expect(this.payload.billing_address?.city).toContain(expected); }
  assertZipCode(expected: string) { expect(this.payload.billing_address?.zipcode).toContain(expected); }
  assertAddress(expected: string) { expect(this.payload.billing_address?.address1).toContain(expected); }
  assertPhone(expected: string)   { expect(this.payload.billing_address?.phone).toContain(expected); }
  assertFirstLastName(fn: string, ln: string) {
    expect(this.payload.billing_address?.first_name).toContain(fn);
    expect(this.payload.billing_address?.last_name).toContain(ln);
  }
  assertCountry(country: string) {
    expect(this.payload.billing_address?.country).toContain(country);
    expect(this.payload.billing_address?.country_code).toContain(country);
    expect(this.payload.billing_address?.state_code).toBeDefined();
    expect(this.payload.billing_address?.city).toBeDefined();
  }
}

/**
 * Asserter V2: email en payer_info, resto en order.billing_address.
 * DDD: Value Object para el contrato V2.
 *
 * NOTA CLAVE: en V2, email del pagador NO está en billing_address
 * sino en payer_info.email — esta es la única divergencia estructural.
 */
class V2BillingAsserter implements IBillingFieldAsserter {
  constructor(
    private readonly payload: {
      payer_info?: { email?: string };
      order?: { billing_address?: Record<string, string> };
    }
  ) {}

  private get billing() { return this.payload.order?.billing_address ?? {}; }

  assertEmail(expected: string)   { expect(this.payload.payer_info?.email).toContain(expected); }
  assertCity(expected: string)    { expect(this.billing.city).toContain(expected); }
  assertZipCode(expected: string) { expect(this.billing.zipcode).toContain(expected); }
  assertAddress(expected: string) { expect(this.billing.address1).toContain(expected); }
  assertPhone(expected: string)   { expect(this.billing.phone).toContain(expected); }
  assertFirstLastName(fn: string, ln: string) {
    expect(this.billing.first_name).toContain(fn);
    expect(this.billing.last_name).toContain(ln);
  }
  assertCountry(country: string) {
    expect(this.billing.country).toContain(country);
    expect(this.billing.country_code).toContain(country);
    expect(this.billing.state_code).toBeDefined();
    expect(this.billing.city).toBeDefined();
  }
}

/**
 * Factory (DIP): recibe el raw body y retorna el asserter correcto.
 * Los page objects usan esto — nunca instancian V1/V2 directamente.
 *
 * Fail fast: si el payload tiene campos V2 pero no pasa isV2PurchaseRequest,
 * lanza un error explícito en lugar de degradar silenciosamente a V1.
 * Un silencioso fallback a V1 enmascararía regresiones V2 de forma permanente.
 */
export class PurchasePayloadAsserter {
  static from(payload: PurchaseRequest): IBillingFieldAsserter {
    if (isV2PurchaseRequest(payload)) {
      return new V2BillingAsserter(payload);
    }

    // Guard: if payload has V2 sentinel fields but failed the type guard,
    // it's a malformed V2 response — do NOT silently fall back to V1.
    const p = payload as Record<string, unknown>;
    if ('payment_source' in p || 'order_token' in p) {
      const keys = Object.keys(p).join(', ');
      throw new Error(
        `PurchasePayloadAsserter: payload has V2 fields but failed isV2PurchaseRequest — ` +
        `check the type guard or the intercepted endpoint. Keys present: [${keys}]`,
      );
    }

    return new V1BillingAsserter(payload as PurchaseRequestV1);
  }
}
