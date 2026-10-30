import { BaseValidationRefundV2 } from './baseValidationRefundV2';

const errorRefundOrderRefunded: BaseValidationRefundV2 = {
  statusCode: 422,
  errorCode: 'DP-6005',
  errorDescription: 'invoice already refunded',
};

const errorRefundExceededTransactionAmount: BaseValidationRefundV2 = {
  statusCode: 422,
  errorCode: 'DP-9006',
  errorDescription: 'refund exceeded transaction amount',
};

const errorRefundAmountNotAvailable: BaseValidationRefundV2 = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription: 'no amount is available on the transaction to be refunded',
};

const errorRefundOrderAuthorizedBeforeCapture: BaseValidationRefundV2 = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription: 'invoice has not enough captures',
};

const errorRefundOrderAuthorized: BaseValidationRefundV2 = {
  statusCode: 409,
  errorCode: 'EMA-6000',
  errorDescription: 'cannot refund the order',
};

const errorRefundOrderVoided: BaseValidationRefundV2 = {
  statusCode: 409,
  errorCode: 'EMA-6000',
  errorDescription: 'cannot refund the order',
};

const errorPartialRefundHigherPartialCapture: BaseValidationRefundV2 = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription: 'no amount is available on the transaction to be refunded',
};

const errorPartialRefundOrderDenied: BaseValidationRefundV2 = {
  statusCode: 422,
  errorCode: 'DP-6005',
  errorDescription: 'cannot refund transaction',
};

const errorPartialRefundOrderVoided: BaseValidationRefundV2 = {
  statusCode: 409,
  errorCode: 'EMA-6000',
  errorDescription: 'cannot refund the order',
};

const errorRefundForPostTransactionAPI: BaseValidationRefundV2 = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription: 'no amount is available on the transaction to be refunded',
};

export {
  errorRefundOrderRefunded,
  errorRefundExceededTransactionAmount,
  errorRefundAmountNotAvailable,
  errorRefundOrderAuthorizedBeforeCapture,
  errorRefundOrderAuthorized,
  errorRefundOrderVoided,
  errorPartialRefundHigherPartialCapture,
  errorPartialRefundOrderDenied,
  errorPartialRefundOrderVoided,
  errorRefundForPostTransactionAPI,
};
