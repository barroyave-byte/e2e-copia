import { BaseValidationRefund } from './baseValidationRefund';

/**
 * @description This error is returned when the order is already refunded you want to refund
 */
const errorRefundOrderRefunded: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'transaction already refunded',
};

/**
 * @description This error is returned when the refund value is higher than the transaction amount
 */
const errorRefundExceededTransactionAmount: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-9006',
  errorDescription: 'refund exceeded transaction amount',
};

const errorRefundAmountNotAvailableV2: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription: 'no amount is available on the transaction to be refunded',
};

/**
 * @description This error is returned when the refund value is higher than the transaction amount
 */
const errorRefundExceededTransactionAmountV2: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription:
    '{\"code\":\"DP-9006\",\"status_code\":400,\"description\":\"refund exceeded transaction amount\"}',
};

/**
 * @description This error is returned when the order is authorized you want to refund
 */

const errorRefundHigherProcessed: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-9006',
  errorDescription: 'cannot make refund because the total amounts exceeded the transaction amount',
};

/**
 * @description This error is returned when the order is authorized you want to refund
 */
const errorRefundOrderAuthorized: BaseValidationRefund = {
  statusCode: 409,
  errorCode: 'EMA-6000',
  errorDescription: 'cannot refund the order',
};

/**
 * @description This error is returned when the order is authorized you want to refund
 */
const errorRefundOrderAuthorizedBeforeCapture: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription: 'invoice has not enough captures',
};

const errorRefundOrderAuthorizedBeforeCaptureV2: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-6008',
  errorDescription:
    '{"code\":\"DP-6008\",\"status_code\":422,\"description\":\"invoice has not enough captures\"}',
};

/**
 * @description This error is returned when the order is voided you want to refund
 */
const errorRefundOrderVoided: BaseValidationRefund = {
  statusCode: 409,
  errorCode: 'EMA-6000',
  errorDescription: 'cannot refund the order',
};

/**
 * @description This error is returned when the order is voided and you want to partially refund
 */
const errorPartialRefundOrderVoided: BaseValidationRefund = {
  statusCode: 409,
  errorCode: 'EMA-6000',
  errorDescription: 'cannot refund the order',
};

/**
 * @description This error is returned when the order is denied and you want to partially refund
 */
const errorPartialRefundOrderDenied: BaseValidationRefund = {
  statusCode: 409,
  errorCode: 'EMA-6000',
  errorDescription: 'cannot refund the order',
};

/**
 * @description This error is returned when partial refund value is higher than partial capture
 */
const errorPartialRefundHigherPartialCapture: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-9006',
  errorDescription:
    'cannot make partial refund because the total partial amounts exceeded the transaction amount',
};

/**
 * @description This error is returned when refund value is higher than partial capture
 */
const errorRefundHigherPartialCapture: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-9006',
  errorDescription: 'cannot make refund because the total amounts exceeded the transaction amount',
};

/**
 * @description This error is returned when the refund value is higher than the transaction amount and the transaction is already refunded
 */
const errorRefundForPostTransactionAPI: BaseValidationRefund = {
  statusCode: 422,
  errorCode: 'DP-9006',
  errorDescription: 'cannot make refund because the total amounts exceeded the transaction amount',
};

export {
  errorRefundOrderRefunded,
  errorRefundOrderAuthorized,
  errorRefundOrderVoided,
  errorPartialRefundOrderVoided,
  errorPartialRefundOrderDenied,
  errorPartialRefundHigherPartialCapture,
  errorRefundHigherPartialCapture,
  errorRefundHigherProcessed,
  errorRefundExceededTransactionAmount,
  errorRefundExceededTransactionAmountV2,
  errorRefundOrderAuthorizedBeforeCapture,
  errorRefundOrderAuthorizedBeforeCaptureV2,
  errorRefundForPostTransactionAPI,
  errorRefundAmountNotAvailableV2,
};
