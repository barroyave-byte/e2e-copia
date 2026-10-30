import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect } from '@support/fixtures';
import { StatusTransaction } from './validate_transactions';
import { validateUUID } from '@tests/order_builder/order_functions';
import { retryUntil } from '@support/utils/retries';

export enum StatusSettlement {
  Unsettled = 'unsettled',
  Unsettleable = 'unsettleable',
  Settled = 'settled',
}

export async function validateSettlement(
  orderToken: string,
  indexSettlement: number,
  transaction_status: StatusTransaction,
  settlement_status: StatusSettlement
): Promise<apiCallNewman.TransactionSettlement> {
  const expectedLength = indexSettlement + 1;
  // Poll on the statuses too, not only on the length: after a refund the settlement row
  // already exists and flips to `unsettleable` asynchronously, so a length-only predicate
  // returned the row while it still read `unsettled`.
  const settlements = await retryUntil(
    () => apiCallNewman.getTransactionsSettlement(orderToken),
    (result) =>
      Array.isArray(result) &&
      result.length === expectedLength &&
      result[indexSettlement]?.transaction_status === transaction_status &&
      result[indexSettlement]?.settlement_status === settlement_status,
    12,
    3000
  );
  expect(settlements).toBeDefined();
  expect(settlements).toHaveLength(expectedLength);
  const settlement = settlements[indexSettlement];
  expect(settlement.order_id).not.toBeFalsy();
  expect(settlement.transaction_status).toEqual(transaction_status);
  expect(settlement.settlement_status).toEqual(settlement_status);
  expect(settlement.raw_request).not.toBeFalsy();
  expect(settlement.raw_response).not.toBeFalsy();
  expect(settlement.conciliation_id).not.toBeFalsy();
  expect(settlement.card_token).not.toBeFalsy();
  // Validate UUID format
  expect(validateUUID(settlement.transaction_id)).toBe(true);
  expect(validateUUID(settlement.invoice_id)).toBe(true);
  expect(validateUUID(settlement.order_token)).toBe(true);
  return settlement;
}

export async function validateSizeSettlements(orderToken: string, size: number): Promise<void> {
  const settlements = await apiCallNewman.getTransactionsSettlement(orderToken);
  expect(settlements).toBeDefined();
  expect(settlements).toHaveLength(size);
}
