export interface TelcelInquiryMetadata {
  'additional_data.telcel_transaction_id': string;
  'additional_data.terminal': string;
  'additional_data.business_chain': string;
  'additional_data.phone_number': string;
  'additional_data.store_code': string;
  'additional_data.cur': string;
}

export interface TelcelInquiryRequest {
  Order: {
    transaction_id: string;
    store_code: string;
    billing_address: { phone: string };
    created_at: string;
    items: Array<{ category: string }>;
    metadata: TelcelInquiryMetadata;
    payment: Record<string, unknown>;
    payment_method: string;
    total_amount: number;
  };
}

export interface TelcelInquiryResponseMetadata {
  'additional_data.telcel_transaction_id': string;
  'additional_data.current_balance': string;
  'additional_data.estimated_balance': string;
  'additional_data.phone': string;
  'additional_data.phone_number': string;
  'additional_data.store_code': string;
  'additional_data.business_chain': string;
  'additional_data.terminal': string;
}

export interface TelcelInquiryResponse {
  order: {
    order_id: string;
    metadata: TelcelInquiryResponseMetadata;
  };
}

export interface TelcelOrderParams {
  merchantId: string;
  privateKey: string;
  balance: number;
  telcelTransactionId: string;
  businessChain: string;
  phoneNumber: string;
  storeCode: string;
}

export interface TelcelOrderResult {
  token: string;
  orderId: string;
  transactionId: string;
}
