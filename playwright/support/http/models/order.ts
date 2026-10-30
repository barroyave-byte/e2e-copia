export interface TokenizeOrderRequest {
  privateKey: string;
  orderData: TokenizeOrderRequestData;
}

export interface TokenizeOrderResponse {
  token: string;
  order_type?: string;
  order: {
    order_id: string;
    transaction_id: string;
    store_code: string;
    currency: string;
    tax_amount: number;
    display_tax_amount: string;
    shipping_amount: number;
    display_shipping_amount: string;
    items_total_amount: number;
    display_items_total_amount: string;
    sub_total: number;
    display_sub_total: string;
    total_amount: number;
    display_total_amount: string;
    items: Item[];
    discounts: Discount[];
    shipping_address: Address;
    shipping_options: ShippingOptions;
    user_instructions: string;
    metadata: Record<string, string>;
    status: string;
    payment: Payment;
    gift_card: GiftCard[];
    redirect_url: string;
    webhook_urls: Record<string, string> | null;
    total_discount: number;
    display_total_discount: string;
    shipping: {
      original_amount: number;
      total_discount: number;
      discounts: any[];
    };
    cash_change: number;
    shipping_method: {
      code: string;
      name: string;
      min_delivery_date: string;
      max_delivery_date: string;
      cost: number;
      display_cost: string;
      tax_amount: number;
      display_tax_amount: string;
      scheduler: any[];
    };
    shipping_methods: any[];
    timezone: string;
    scheduled_at: string;
    billing_address: Address;
    payment_link: string;
    display_shipping_tax_amount: string;
    display_total_tax_amount: string;
    shipping_tax_amount: number;
    total_tax_amount: number;
    user_id: string;
    include_payment_options: any[];
    redirect_urls: {
      success: string;
      pending: string;
      error: string;
      fallback: string;
      close: string;
    };
    created_at: string;
    updated_at: string;
    payer_info: unknown | null;
    discount_amount: number;
    shipping_discount_amount: number;
    device_fingerprint: string;
    expires_at?: string;
    expired_at: string;
    version: string;
    fraud: unknown | null;
    total_interest_amount: number;
    display_total_interest_amount: string;
    payment_method: string;
    token: string;
    statement_descriptor: string;
    callback_urls: Record<string, string> | null;
    market_type: string;
    fraud_shadowmode: any[];
    merchant_id: string;
    initiator_type: string;
  };
  custom_fields: any[];
  checkout_modules: any[];
  error?: ErrorDefault | null;
}

export interface ErrorDefault {
  code: string;
  message: string;
  description?: string;
}

export interface TokenizeOrderRequestData {
  order_type?: string;
  order: {
    order_id: string;
    transaction_id?: string;
    store_code: string;
    currency: string;
    tax_amount?: number;
    shipping_amount?: number;
    items_total_amount?: number;
    sub_total?: number;
    total_amount?: number;
    display_total_amount?: string;
    items?: Item[];
    processor_name?: string;
    discounts?: Discount[];
    shipping_address?: Address;
    billing_address?: Address;
    shipping_options?: ShippingOptionsRequest;
    user_instructions?: string;
    metadata?: Record<string, string>;
    status?: string;
    payment?: Record<string, any>;
    gift_card?: any[];
    redirect_url?: string;
    webhook_urls?: Record<string, string> | null;
    total_discount?: number;
    display_total_discount?: string;
    shipping?: {
      original_amount: number;
      total_discount: number;
      discounts: any[];
    };
    cash_change?: number;
    shipping_method?: {
      code: string;
      name: string;
      min_delivery_date: string;
      max_delivery_date: string;
      cost: number;
      display_cost: string;
      tax_amount: number;
      display_tax_amount: string;
      scheduler: any[];
    };
    shipping_methods?: any[];
    timezone?: string;
    scheduled_at?: string;
    payment_link?: string;
    display_shipping_tax_amount?: string;
    display_total_tax_amount?: string;
    shipping_tax_amount?: number;
    total_tax_amount?: number;
    callback_urls?: CallbackURLs;
    payer_info?: Record<string, any>;
    redirect_urls?: Record<string, any>;
    expires_at?: string;
    airline_information?: AirlineInformation;
    browser_details?: Record<string, any>;
    market_type?: string;
    initiator_type?: 'customer' | 'merchant';
    recurrence?: {
      first_time_use: boolean;
      scheduled?: boolean;
      recurrence_id?: string;
      bill_reference?: string;
    };
  };
  checkout_modules?: CheckoutModule[];
}

export interface CallbackURLs {
  on_success: string;
  on_pending: string;
}

export interface CheckoutModule {
  name?: string;
  url?: string;
  props?: Record<string, any>;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  options?: string;
  total_amount: {
    amount: number;
    original_amount?: number;
    display_amount?: string;
    display_original_amount?: string;
    currency?: string;
    currency_symbol?: string;
    total_discount?: number;
    display_total_discount?: string;
  };
  sub_category?: string;
  unit_price: {
    amount?: number;
    display_amount?: string;
    currency?: string;
    currency_symbol?: string;
  };
  tax_amount?: {
    amount?: number;
    display_amount?: string;
    currency?: string;
    currency_symbol?: string;
  };
  quantity: number;
  uom?: string;
  upc?: string;
  sku?: string;
  isbn?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  color?: string;
  size?: string;
  weight?: {
    weight?: number;
    unit?: string;
  };
  image_url?: string;
  details_url?: string;
  type?: string;
  taxable?: boolean;
  discounts?: [];
  included_in_subscription?: boolean;
  // Response-only extras
  item_details?: any[];
  is_digital?: boolean;
}

export interface Discount {
  amount?: number;
  display_amount?: string;
  code?: string;
  reference?: string;
  description?: string;
  details_url?: string;
  free_shipping?: {
    is_free_shipping: boolean;
    maximum_cost_allowed: number;
  };
  discount_category?: string;
  target_type?: string;
  type?: string;
}

export interface Address {
  identification?: string;
  id?: number;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  identity_document?: string;
  identity_document_type?: string;
  lat?: number;
  lng?: number;
  address1?: string;
  address2?: string;
  email?: string;
  city?: string;
  zipcode?: string;
  state_name?: string;
  state_code?: string;
  country?: string;
  country_code?: string;
  additional_description?: string;
  address_type?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShippingOptions {
  type: string;
  details: {
    store_name: string;
    address: string;
    address_coordinates: {
      lat: number;
      lng: number;
    };
    contact: {
      name: string;
      phone: string;
    };
    additional_details: {
      pickup_time: string;
      stock_location: string;
    };
  };
}

/**
 * Shipping options as the tokenize endpoint accepts them: every field under `details` is
 * optional, and `contact.phone` may be sent as a JSON string or as a JSON number.
 *
 * The response-side `ShippingOptions` is the stricter shape the service returns.
 */
export interface ShippingOptionsRequest {
  type: string;
  details: {
    store_name?: string;
    address?: string;
    address_coordinates?: {
      lat: number;
      lng: number;
    };
    contact?: {
      name?: string;
      phone?: string | number;
    };
    additional_details?: {
      pickup_time?: string;
      stock_location?: string;
    };
  };
}

export interface Payment {
  data: PaymentData;
}

export interface GiftCard {}

export interface PaymentData {
  amount: { amount: number; currency: string };
  metadata: Record<string, unknown>;
  from_card: {
    card_brand: string;
    first_six: string;
    last_four: string;
    bank_name: string;
    country_iso: string;
    credential_source: string;
    expiry_month: string;
    expiry_year: string;
    card_type: string;
    installment?: { installments: number; installment_type: string };
  };
  updated_at: string;
  method_type: string;
  merchant: {
    store_code: string;
    id: string;
    affiliation_code: string;
    mcc: string;
  };
  created_at: string;
  id: string;
  processor: string;
  customer: {
    email: string;
    id: string;
    first_name: string;
    last_name: string;
  };
  status: string;
  reason: string;
  external_transaction_id: string;
  merchant_payment_processor_name: string;
  authorization_code: string;
  installment_interest_calculations: unknown | null;
  three_ds_details: Record<string, unknown>;
  merchant_payment_processor_id: string;
  payment_method_type: string;
  tid: string;
  nsu: string;
  next_action?: {
    action: string;
    authorization_voucher?: {
      bar_code: string;
      expiration_date: string;
      url_payment_receipt_html: string;
      url_payment_receipt_pdf: string;
    };
  };
  avs: unknown | null;
  data_sync?: {
    iso_8583_processing_code: string;
    iso_8583_response_code: string;
    iso_8583_response_code_description: string;
    switch_name: string;
  };
  installments?: {
    installment_amount: number;
    installment_rate: number;
    installment_type: string;
    installments: number;
    plan_id: string;
    plan_option_id: string;
  };
  routing_strategy?: string;
}
export interface AirlineBookingItem {
  airline_3_digit_code: string;
  airline_iata_designator: string;
  ancillaries?: AirlineAncillary[];
  e_ticket: boolean;
  legs?: AirlineLeg[];
  passenger?: AirlinePassenger;
  pnr: string;
  ticket_number: string;
  ticketing_travel_agency?: AirlineTravelAgency;
}

export interface AirlineAncillary {
  description?: string;
  ticket_number?: string;
  total_amount?: number;
  type?: string;
  category_code?: string;
  sub_category_code?: string;
  fee_code?: string;
  unit_price?: number;
}

export interface AirlineLeg {
  carrier_code: string;
  carrier_name: string;
  destination: AirlineLocation;
  fare_basis_code: string;
  flight_number: string;
  origin: AirlineLocation;
  seat_location: string;
  service_class: string;
  stopover_code: string;
}

export interface AirlineLocation {
  date: string;
  iata_code: string;
  time: string;
}

export interface AirlinePassenger {
  date_of_birth: string;
  document_type: string;
  email: string;
  first_name: string;
  frequent_flyer_code: string;
  identity_document_number: string;
  last_name: string;
  middle_name: string;
  phone: string;
  title: string;
  type?: string;
  user_id: string;
  country_code?: string;
}

export interface AirlineTravelAgency {
  agency_invoice_number: string;
  iata_code: string;
  name: string;
}

export interface AirlineInformation {
  booking_items?: AirlineBookingItem[];
}

export interface FraudAnalysis {
  details: string;
  fraud_decision: string;
  processor: string;
  processor_id: number;
  processor_response: string;
  risk_level: string;
  score: number;
  status: string;
  type: string;
}

export interface Fraud {
  analysis?: FraudAnalysis;
  status: string;
}

export interface OrderPayment {
  data?: PaymentData;
}

export interface OrderShipping {
  discounts?: unknown[];
  original_amount: number;
  total_discount: number;
}

export interface OrderShippingMethod {
  code: string;
  cost: number;
  display_cost: string;
  display_tax_amount: string;
  max_delivery_date: string;
  min_delivery_date: string;
  name: string;
  scheduler?: unknown[];
  tax_amount: number;
}

export interface RedirectUrls {
  close: string;
  error: string;
  fallback: string;
  pending: string;
  success: string;
}

export interface WebhookUrls {
  apply_coupon?: string;
  get_shipping_methods?: string;
  notify_order?: string;
  remove_coupon?: string;
  update_shipping_method?: string;
  [key: string]: string | undefined;
}

export interface Order {
  airline_information?: AirlineInformation;
  billing_address?: Address;
  cash_change: number;
  created_at?: string;
  currency: string;
  discount_amount: number;
  discounts?: Discount[];
  display_items_total_amount: string;
  display_shipping_amount: string;
  display_shipping_tax_amount: string;
  display_sub_total: string;
  display_tax_amount: string;
  display_total_amount: string;
  display_total_discount: string;
  display_total_tax_amount?: string;
  fraud?: Fraud;
  gift_card?: unknown[];
  include_payment_options?: unknown[];
  items?: Item[];
  items_total_amount: number;
  metadata?: Record<string, string>;
  order_id: string;
  transaction_id: string;
  payer_info?: unknown;
  payment?: OrderPayment;
  payment_link: string;
  redirect_url: string;
  redirect_urls?: RedirectUrls;
  scheduled_at: string;
  shipping?: OrderShipping;
  shipping_address?: Address;
  shipping_amount: number;
  shipping_discount_amount: number;
  shipping_method?: OrderShippingMethod;
  shipping_methods?: unknown[];
  shipping_options?: ShippingOptions;
  shipping_tax_amount?: number;
  status: string;
  store_code?: string;
  sub_total: number;
  tax_amount: number;
  timezone?: string;
  total_amount: number;
  total_discount: number;
  total_tax_amount?: number;
  expires_at?: string;
  updated_at?: string;
  user_id?: string;
  user_instructions?: string;
  webhook_urls?: WebhookUrls;
}

export interface GetOrderResponse {
  order: Order;
  token: string;
}

/**
 * Summarized order shape returned by GET /merchants/orders (the admin order list, paginated).
 * Deliberately lighter than `Order` — the listing endpoint returns a subset of fields, some of
 * them shaped differently (e.g. `fraud`/`payment`), so it is modeled separately rather than
 * reusing `Order`/`OrderPayment`/`Fraud`. `[key: string]: unknown` covers the remaining fields
 * without pinning down every one of them.
 */
export interface OrdersListEntryOrder {
  order_id: string;
  status: string;
  total_amount: number;
  currency: string;
  payment_method?: string;
  [key: string]: unknown;
}

export interface OrdersListEntry {
  order: OrdersListEntryOrder;
  token: string;
}

export interface GetOrdersListResponse {
  cursor: string;
  orders: OrdersListEntry[];
  there_are_more_records: boolean;
  total: number;
}

export interface ExpireOrderResponse {
  order?: {
    status: string;
    expired_at: string;
  };
  error?: {
    code: string;
    description: string;
  };
}
