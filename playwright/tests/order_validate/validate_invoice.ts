import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect } from '@support/fixtures';
import { retryUntil } from '@support/utils/retries';

export enum StatusInvoice {
  Pending = 'pending',
  Processing = 'processing',
  Processed = 'processed',
  Authorized = 'authorized',
  Captured = 'captured',
  Capturing = 'capturing',
  PartialCaptured = 'partial_captured',
  PartialCapturing = 'partial_capturing',
  Refunded = 'refunded',
  Refunding = 'refunding',
  PartialRefunded = 'partial_refunded',
  PartialRefunding = 'partial_refunding',
  Voided = 'voided',
  Denied = 'denied',
}

export async function validateInvoice(
  orderToken: string,
  orderId: string,
  statusInvoice: StatusInvoice,
  validateCard = true
): Promise<apiCallNewman.Invoice> {
  // Invoice status updates asynchronously after capture/refund operations, so a
  // single read can race ahead of the backend write. Poll until it converges.
  const invoice = await retryUntil(
    () => apiCallNewman.getInvoicePayment(orderToken, orderId),
    (current) => current?.status === statusInvoice
  );
  expect(invoice).toBeDefined();
  expect(invoice.status).toEqual(statusInvoice);

  if (statusInvoice !== StatusInvoice.Denied && validateCard) {
    expect(invoice.card_token).not.toBeFalsy();
    expect(invoice.card_id).not.toBeFalsy();
  }

  if (validateCard) {
    expect(invoice.card_expiration).not.toBeFalsy();
    expect(invoice.card_expiration).toHaveLength(5);
  }
  expect(invoice.raw_response).not.toBeFalsy();
  return invoice;
}

export function getDateCutoffAt(): string {
  const now = new Date();
  const newDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    2, // hours
    0, // minutes
    0, // seconds
    0 // milliseconds
  );

  const year = newDate.getUTCFullYear();
  const month = String(newDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(newDate.getUTCDate()).padStart(2, '0');
  const hour = String(newDate.getUTCHours()).padStart(2, '0');
  const minute = String(newDate.getUTCMinutes()).padStart(2, '0');
  const second = String(newDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
