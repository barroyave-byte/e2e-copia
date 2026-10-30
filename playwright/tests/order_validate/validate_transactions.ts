import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect } from '@support/fixtures';
import { retryUntil } from '@support/utils/retries';

export enum TypeTransaction {
  Purchase = 'purchase',
  Refund = 'refund',
  Void = 'void',
  Capture = 'capture',
  Authorize = 'authorize',
}

export enum StatusTransaction {
  Processing = 'processing',
  Processed = 'processed',
  Authorized = 'authorized',
  Authorizing = 'authorizing',
  Captured = 'captured',
  Capturing = 'capturing',
  Refunded = 'refunded',
  Refunding = 'refunding',
  Voided = 'voided',
  Denied = 'denied',
  PartialRefunding = 'partial_refunding',
}

export async function validateTransaction(
  invoiceId: string,
  indexTransaction: number,
  typeTransaction: TypeTransaction,
  statusTransaction: StatusTransaction
): Promise<apiCallNewman.Transaction> {
  const expectedLength = indexTransaction + 1;
  const transactions = await retryUntil(
    () => apiCallNewman.getTransactions(invoiceId),
    (result) => Array.isArray(result) && result.length === expectedLength,
    12,
    3000
  );
  expect(transactions).toBeDefined();
  expect(transactions).toHaveLength(expectedLength);
  const transaction = transactions[indexTransaction];
  expect(transaction.type).toEqual(typeTransaction);
  expect(transaction.status).toEqual(statusTransaction);
  expect(transaction.raw_request).not.toBeFalsy();
  expect(transaction.raw_response).not.toBeFalsy();
  //expect(transaction.conciliation_id).not.toBeFalsy(); // TODO: Jean Rolan remove temporary
  transaction.allTransactions = transactions;
  return transaction;
}

export async function validateSizeTransactions(invoiceId: string, size: number): Promise<void> {
  const transactions = await apiCallNewman.getTransactions(invoiceId);
  expect(transactions).toBeDefined();
  expect(transactions).toHaveLength(size);
}
