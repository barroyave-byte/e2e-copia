import { AirlineInformation } from './airline_information';
import { Order, TokenizeOrderResponse } from '@support/http/models/order';

// Payment related models
export interface CreditCard {
  expiry_month: string;
  expiry_year: string;
  card_holder: string;
  card_holder_dni: string;
  card_holder_dni_type?: string;
  card_holder_number?: string;
  card_number: string;
  security_code?: string; // Optional for testing missing CVV
  address1: string;
  address2?: string;
  card_cvv?: string;
  zip: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  installments?: number;
  installment?: { plan_option_id: string };
}

export interface Address {
  email: string;
  identification: string;
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  identity_document: string;
  lat: number;
  lng: number;
  address1: string;
  address2: string;
  city: string;
  zipcode: string;
  state_name: string;
  country: string;
  additional_description: string;
  address_type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplementaryData {
  shipping_address: Address;
  billing_address: Address;
}

export interface PurchaseAddress {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  identity_document: string;
  identity_document_type?: string;
  lat: number;
  lng: number;
  address1: string;
  address2: string;
  city: string;
  zipcode: string;
  state_name: string;
  state_code?: string;
  country: string;
  country_code?: string;
  additional_description: string;
  address_type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  email: string;
  dataPendingToValidate?: { stateName: string; city: string };
}

export interface PurchaseRequest {
  method_type: MethodType;
  processor_name: string;
  amount?: number;
  email: string;
  credit_card: CreditCard;
  token: string;
  store_code?: string;
  device_id?: string;
  payer_info?: { email: string };
  transaction_id?: string;
  billing_address?: Address | PurchaseAddress;
  shipping_address?: Address | PurchaseAddress;
  complementary_data?: ComplementaryData;
}

export interface PurchaseRequestV2 {
  order_token?: string;
  payer_info: PlayerInfo;
  payment_source: PaymentSource;
  anti_fraud_info?: AntiFraudInfo;
  order?: TokenizeOrderResponse;
}

export interface CaptureRequestV2 {
  amount?: number;
  reason: string;
  final_capture?: boolean;
  order?: CaptureRequestOrder;
}

export interface RefundBodyV2 {
  amount?: number;
  reason?: string;
  is_final?: boolean;
  expectError?: boolean;
}

export interface RefundResponseV2 {
  error?: {
    code: string;
    description: string;
  };
}

export interface CaptureRequestOrder {
  transactionId: string;
  airlineInformation: AirlineInformation;
}

export interface CaptureResponseV2 {
  capture_id: string;
  status: string;
  captures: Array<{
    capture_id: string;
    captured_amount: {
      amount: number;
      currency: string;
    };
    status: string;
    external_transaction_id: string;
    captured_on: string;
  }>;
}

export interface PlayerInfo {
  email: string;
}

export enum MethodType {
  CREDIT_CARD = 'credit_card',
  WALLET = 'wallet',
  CASH = 'cash',
}

export interface PaymentSource {
  method_type: MethodType;
  card_info?: CardInfo;
  method_type_specific_fields?: Record<string, any>;
  processor: string;
  installment?: {
    plan_option_id: string;
  };
}

export interface CardInfo {
  address1?: string;
  card_cvv?: string;
  card_holder?: string;
  card_holder_dni?: string;
  card_holder_dni_type?: string;
  card_id?: string;
  card_number?: string;
  city?: string;
  country?: string;
  deferred_installment_months?: number;
  expiry_month?: string;
  expiry_year?: string;
  installment?: {
    plan_option_id: string;
  };
  installments?: number;
  phone?: string;
  state?: string;
  zip?: string;
}

export interface AntiFraudInfo {
  browser_details?: BrowserDetails;
  device?: Device;
  ip_address?: string;
  session_id?: string;
  uba_information?: string;
  user_agent?: string;
}

export interface BrowserDetails {
  accept_header: string;
  color_depth: number;
  java_enabled: boolean;
  java_script_enabled: boolean;
  language: string;
  screen_height: number;
  screen_width: number;
  time_zone_offset: number;
}

export interface Device {
  fingerprint: string;
  fingerprint_provider: string;
  id: string;
  name: string;
}

export interface PurchaseResponse {
  // Success response structure
  order_type: string;
  transaction_id: string;
  order_token: string;

  order?: Order;
  status: string;
  // Error response structure
  error?: {
    code: string;
    description: string;
  };
}

export interface PurchaseValidation {
  expectedStatusCode: number;
  expectedErrorCode?: string;
  expectedErrorDescription?: string;
}

export interface ConfigurationMerchantPaymentsRequest {
  merchantToken: string;
  merchantId: string;
  storeId: string;
  configurationMerchantPaymentsData: ConfigurationMerchantPaymentsData;
}
export interface ConfigurationMerchantPaymentsData {
  config_code: string;
  config_value: string;
}

export interface ConfigurationMerchantPaymentsResponse {
  id: string;
  merchant_id: string;
  store_id: string;
  config_code: string;
  data: null;
  config_value: string;
  created_at: string;
  updated_at: string;
  deleted_at: null | string;
}

export interface VerifierCredentialsRequest {
  merchantToken: string;
  verifierCredentialsData: VerifierCredentialsData;
}

export interface VerifierCredentialsData {
  country_iso: string;
  purchase_amount: number;
  name: string;
  payment_processor_id: number;
  enabled: boolean;
  currency_iso3: string;
  public_api_key?: string;
  private_api_key?: string;
  external_merchant_id?: string;
}

export interface VerifierCredentialsResponse {
  data: {
    id: number;
    enabled: boolean;
    payment_processor_id: number;
    created_at: string;
    PaymentProcessor: {
      id: number;
      created_at: string;
      last_updated: string;
      name: string;
      method_type: string;
    };
  };
}

export interface TransactionWebHookData {
  ApiKey: string;
  RequestDateTime: string;
  MerchantSalesID: string;
  ReferenceNo: string;
  CreationDateTime: string;
  Amount: string;
  CurrencyID: string;
  PaymentReferenceNo: string;
  Status: string;
  Signature: string;
}

export interface TransactionWebHookResponse {}

export interface VoidAsyncResponse {
  data: {
    message: string;
    status: string;
    task_id: string;
  };
  error: null;
}
