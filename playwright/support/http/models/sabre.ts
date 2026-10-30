export interface CreateSabreMerchantRequest {
  deuna_merchant_id: string;
  deuna_private_api_key: string;
  sabre_merchant_account_code: string;
  sabre_username: string;
  sabre_password: string;
  sabre_secret_key: string;
  configuration: SabreMerchantConfiguration;
}

export interface SabreMerchantConfiguration {
  apm_url: string;
  statement_descriptor: string;
  notification: {
    merchant_return_data: string;
  };
  payment_methods: {
    default_code: string;
    code_configuration: Record<string, SabrePaymentMethodConfig>;
  };
}

export interface SabrePaymentMethodConfig {
  middleware_method: string;
  successful_response: string;
  successful_description: string;
}

export interface UpdateSabreMerchantRequest {
  sabre_username: string;
  sabre_password: string;
  configuration: SabreMerchantConfiguration;
}

export interface CreateSabreMerchantResponse {
  id: string;
}

export interface SabreAuthorizeParams {
  merchantAccountCode: string;
  username: string;
  password: string;
  cardNumber?: string;
  paymentMethodCode: string;
  installments: string;
  amount: string;
  currencyCode: string;
  countryCode: string;
  stateCode: string;
}

export interface SabrePassenger {
  nameInPnr: string;
  firstName: string;
  lastName: string;
  type: string;
  gender: string;
  docType: string;
  docNumber: string;
}

export interface SabreCaptureParams {
  merchantAccountCode: string;
  username: string;
  password: string;
  transactionId: string;
  amount: string;
  currencyCode: string;
  passenger: SabrePassenger;
}

export interface SabreCancelOrRefundParams {
  merchantAccountCode: string;
  username: string;
  password: string;
  transactionId: string;
  amount: string;
  currencyCode: string;
  passenger?: SabrePassenger | null;
}

export interface SabreSoapResult {
  requestXml: string;
  responseXml: string;
}
