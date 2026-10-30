import { BaseValidationCapture } from './baseValidationCapture';

const errorCaptureAmountGreater: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-4018',
  errorDescription: 'cannot capture an amount greater than the authorized amount',
};

const errorCaptureAmountGreaterV2: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-4018',
  errorDescription: 'would exceed the authorized amount',
};

const errorCaptureExceededTransactionAmount: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-4018',
  errorDescription: 'capture exceeded transaction amount',
};

const errorCaptureOrderCaptured: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'cannot capture the transaction, is already captured',
};

const errorPartialCaptureToPartialCaptured: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'cannot capture the transaction, is already captured',
};

const errorCaptureOrderVoided: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'cannot capture the transaction, is already voided',
};

const errorCaptureOrderRefunded: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'cannot capture the transaction, is already refunded',
};

const errorCaptureOrderDenided: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-6000',
  errorDescription: 'cannot capture the transaction, is already denied',
};

const errorCapturePartialWithInstallments: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-7052',
  errorDescription:
    'partial refunds and partial captures are not allowed in transactions with installments',
};

const errorRefundPartialWithInstallments: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-7053',
  errorDescription:
    'partial refunds and partial captures are not allowed in transactions with installments',
};

const errorPurchaseKueskiPay: BaseValidationCapture = {
  statusCode: 422,
  errorCode: 'DP-7100',
  errorDescription: 'Kueski Pay purchase error',
};

export {
  errorCaptureAmountGreater,
  errorCaptureAmountGreaterV2,
  errorCaptureOrderCaptured,
  errorPartialCaptureToPartialCaptured,
  errorCaptureOrderVoided,
  errorCaptureOrderRefunded,
  errorCaptureOrderDenided,
  errorCapturePartialWithInstallments,
  errorRefundPartialWithInstallments,
  errorCaptureExceededTransactionAmount,
  errorPurchaseKueskiPay,
};
