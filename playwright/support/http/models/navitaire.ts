export interface NavitaireMerchantConfig {
  channel_market_type_mapping?: Record<string, string>;
  location_channel_type_mapping?: Record<string, string>;
  channel_type_mapping?: Record<string, string>;
  installments_url?: string;
}

export interface CreateNavitaireMerchantRequest {
  username: string;
  password: string;
  name: string;
  merchant_id: string;
  private_api_key: string;
  configuration: NavitaireMerchantConfig;
}

export interface CreateNavitaireMerchantResponse {
  id: string;
}

export interface UpdateNavitaireMerchantRequest {
  username: string;
  password: string;
}

export interface NavitaireAuthorizeParams {
  username: string;
  password: string;
  paymentId: string;
  confirmationId: string;
  paymentMethod: 'CreditCardPaymentMethod' | 'GenericPaymentMethod';
  cardNumber?: string;
  userEmail?: string;
  installments?: string;
  amount?: string;
  currencyCode?: string;
  orderToken?: string;
  contactEmail?: string;
  splitPaymentSequence?: string;
}

export interface NavitaireReverseParams {
  username: string;
  password: string;
  paymentId: string;
  confirmationId: string;
  originalPaymentId: string;
  refundAmount?: string;
}
