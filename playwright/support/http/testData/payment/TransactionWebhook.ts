import { TransactionWebHookData } from '@support/http/models/payment';

const SIGNATURE = 'FB5DEA8F84DE1F8C9DBBF33E4900ECA1A143BFEEA44CCED5011CF15D25AE64D5';
const API_KEY = '064520298754c5391f55a7ca5eaa5b67';
const PAYMENT_REFERENCE_NO = '589184';

export const buildWebhookPayment = (): TransactionWebHookData => ({
  ApiKey: API_KEY,
  RequestDateTime: '2025-03-25T14:43:10',
  MerchantSalesID: '<Merchant ID>',
  ReferenceNo: '<External Transaction ID>',
  CreationDateTime: '2025-03-25T14:40:46',
  Amount: '30.00',
  CurrencyID: 'USD',
  PaymentReferenceNo: PAYMENT_REFERENCE_NO,
  Status: '102',
  Signature: SIGNATURE,
});
