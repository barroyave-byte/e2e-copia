import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect } from '@support/fixtures';
import { StatusTransaction } from './validate_transactions';

export interface ParamsRefundV2 {
  result: apiCallNewman.ResultRefundV2;
  transactionAmount: number;
  transactionCurrency: string;
  transactionStatus: StatusTransaction;
  indexRefund: number;
  skipTransactionId?: boolean;
}

export function validateRefundV2(args: ParamsRefundV2): void {
  expect(args.result.refunds.length).toEqual(args.indexRefund + 1);
  expect(args.result.refunds[args.indexRefund].status).toEqual(args.transactionStatus);
  expect(args.result.refunds[args.indexRefund].refund_id).not.toBeFalsy();

  if (!args.skipTransactionId) {
    expect(args.result.refunds[args.indexRefund].external_transaction_id).not.toBeFalsy();
  }

  expect(args.result.refunds[args.indexRefund].refund_amount.amount).toEqual(
    args.transactionAmount.toString()
  );
  expect(args.result.refunds[args.indexRefund].refund_amount.currency).toEqual(
    args.transactionCurrency
  );
}
