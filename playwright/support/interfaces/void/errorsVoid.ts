import { BaseValidationVoid } from './baseValidationVoid';

/**
 * @description This error is returned when the order is already refunded you want to void
 */
const errorVoidOrderRefunded: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'transaction already processed',
};

/**
 * @description This error is returned when the order is partially refunded you want to void
 */
const errorVoidOrderPartialRefunded: BaseValidationVoid = {
  statusCode: 409,
  errorCode: 'EMA-6001',
  errorDescription: 'cannot void the order',
};

/**
 * @description This error is returned when the order is processed you want to void
 */
const errorVoidOrderProcessed: BaseValidationVoid = {
  statusCode: 409,
  errorCode: 'EMA-6001',
  errorDescription: 'cannot void the order',
};

/**
 * @description This error is returned when the order is processed you want to void in MercadoPago
 */
const errorVoidOrderProcessedMercadoPago: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-4015',
  errorDescription: 'cannot void a processed transaction for this processor',
};

/**
 * @description This error is returned when the order is processed you want to void in MercadoPago
 */
const errorVoidOrderProcessedKushki: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-4015',
  errorDescription: 'cannot void a processed transaction for this processor',
};

/**
 * @description This error is returned when the order is captured you want to void
 */
const errorVoidOrderCaptured: BaseValidationVoid = {
  statusCode: 409,
  errorCode: 'EMA-6001',
  errorDescription: 'cannot void the order',
};

/**
 * @description This error is returned when the order is partial captured you want to void
 */
const errorVoidOrderPartialCaptured: BaseValidationVoid = {
  statusCode: 409,
  errorCode: 'EMA-6001',
  errorDescription: 'cannot void the order',
};

/**
 * @description This error is returned when the order is captured and you want void with a higher amount
 */
const errorHigherAmountVoidOrderCaptured: BaseValidationVoid = {
  statusCode: 409,
  errorCode: 'EMA-6001',
  errorDescription: 'cannot void the order',
};

/**
 * @description This error is returned when the order is captured and you want void with a lower amount
 */
const errorLowerAmountVoidOrderCaptured: BaseValidationVoid = {
  statusCode: 409,
  errorCode: 'EMA-6001',
  errorDescription: 'cannot void the order',
};

/**
 * @description This error is returned when the order is processed and you want void with a higher amount
 */
const errorHigherAmountVoidOrderProcessed: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-4015',
  errorDescription: 'cannot void a processed transaction for this processor',
};

/**
 * @description This error is returned when the order is processed and you want void with a lower amount
 */
const errorLowerAmountVoidOrderProcessed: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-4015',
  errorDescription: 'cannot void a processed transaction for this processor',
};

const errorVoidOrderVoided: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'transaction already processed',
};

/**
 * @description This error is returned when the order is processed you want to void in Getnet
 */
const errorVoidOrderProcessedGetnet: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-4015',
  errorDescription: 'cannot void a processed transaction for this processor',
};

const errorVoidOrderProcessedPayu: BaseValidationVoid = {
  statusCode: 422,
  errorCode: 'DP-4015',
  errorDescription: 'cannot void a processed transaction for this processor',
};

export {
  errorVoidOrderRefunded,
  errorVoidOrderProcessed,
  errorVoidOrderCaptured,
  errorVoidOrderPartialCaptured,
  errorVoidOrderPartialRefunded,
  errorHigherAmountVoidOrderCaptured,
  errorLowerAmountVoidOrderCaptured,
  errorHigherAmountVoidOrderProcessed,
  errorLowerAmountVoidOrderProcessed,
  errorVoidOrderProcessedMercadoPago,
  errorVoidOrderProcessedKushki,
  errorVoidOrderVoided,
  errorVoidOrderProcessedGetnet,
  errorVoidOrderProcessedPayu,
};
