import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect } from '@support/fixtures';
import { StatusTransaction } from './validate_transactions';
import { StatusInvoice } from './validate_invoice';

export interface ParamsCaptureV2 {
  result: apiCallNewman.ResultCaptureV2;
  invoiceStatus: StatusInvoice;
  transactionAmount: number;
  transactionCurrency: string;
  transactionStatus: StatusTransaction;
  indexCapture: number;
  skipTransactionId?: boolean; // use in case the processor does not return external_transaction_id
}

export function validateCaptureV2(args: ParamsCaptureV2): void {
  expect(args.result.status).toEqual(args.invoiceStatus);
  expect(args.result.captures.length).toEqual(args.indexCapture + 1);
  expect(args.result.captures[args.indexCapture].status).toEqual(args.transactionStatus);
  expect(args.result.captures[args.indexCapture].capture_id).not.toBeFalsy();

  if (!args.skipTransactionId) {
    expect(args.result.captures[args.indexCapture].external_transaction_id).not.toBeFalsy();
  }

  expect(args.result.captures[args.indexCapture].captured_amount.amount).toEqual(
    args.transactionAmount.toString()
  );
  expect(args.result.captures[args.indexCapture].captured_amount.currency).toEqual(
    args.transactionCurrency
  );
}
