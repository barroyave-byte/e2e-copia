/**
 * Create checkout models
 */

export interface ConfigCheckoutData {
  configuration: {
    exclude_billing_address?: boolean;
    is_colorblind: boolean;
    is_identity_document_hide: boolean;
    hide_pickup_time?: boolean;
    payment_credential_sources?: Array<{
      type: string;
      settings: Record<string, unknown>;
    }>;
  };
  image_url: string;
  theme: {
    main_color: string;
    secondary_color: string;
    background_color: string;
  };
}

export interface CreateCheckoutRequest {
  merchantPrivateKey: string;
  merchantId: string;
  createCheckoutData: CreateCheckoutData;
}

export interface CreateCheckoutData {
  version: string;
  active: boolean;
  plugin: string;
  traffic_percentage: number;
  google_optimize: {
    google_optimize_id: string;
    google_experiment_id: string;
  };
  utm_campaign: any[];
}

export interface CreateCheckoutResponse {
  id: string;
  merchant_id: string;
  active: boolean;
  version: string;
  plugin: string;
  google_optimize: {
    google_optimize_id: string;
    google_experiment_id: string;
  };
  traffic_percentage: number;
  created_at: string;
  updated_at: string;
  use_fixed_shipping_methods: boolean;
  delay_configuration: {
    delay_auto_settle: number;
    delay_auto_settle_anti_fraud: number;
    delay_cancel: number;
  };
}

/**
 * Create config checkout v2 models
 */

export interface CreateConfigCheckoutV2Request {
  merchant_token: string;
  merchant_id: string;
  config_checkout_v2_data: ConfigCheckoutV2Data;
}

export interface ConfigCheckoutV2Data {
  order_config?: {
    notify_type?: 'async' | 'sync';
    payment_link?: {
      custom_domain?: string;
      generate_user_auth_token?: boolean;
    };
    voucher_configuration?: {
      enabled?: boolean;
      allowed_states?: string[];
      voucher_logo?: string;
    };
  };
  elements_config?: Object;
  widgets_general_config?: Object;
}

export interface CreateConfigCheckoutV2Response {
  id: string;
  merchant_id: string;
  active: boolean;
  configuration: {
    is_colorblind: boolean;
    is_identity_document_hide: boolean;
  };
  image_url: string;
  theme: {
    main_color: string;
    secondary_color: string;
    background_color: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ConfigVault {
  merchant_token: string;
  merchant_id: string;
  config_vault_data: ConfigVaultData;
}

interface ConfigVaultData {
  config_checkout_data: ConfigCheckoutData;
  config_checkout_v2_data: ConfigCheckoutV2Data;
}

export interface CreateWebhookData {
  event_name: string;
  http_method?: string;
  url: string;
  active?: boolean;
  error_response_template?: string;
  id?: string;
  payload_template?: string | null;
  propagate_response?: boolean;
  fields_update: {
    fields: string[];
    custom_fields?: string[] | null;
  };
  response_body: {
    fields: string[];
    custom_fields?: string[] | null;
  };
  headers?: any[];
  params?: any[] | null;
  query_params?: any[] | null;
  response_template?: string;
  response_data?: string;
}

export interface CreateWebhookResponse {
  data: {
    id: string;
    merchant_id: string;
    event_name: string;
    url: string;
    active: boolean;
    fields_update: {
      fields: string[];
      custom_fields: string[];
    };
    response_body: {
      fields: string[];
      custom_fields: string[];
    };
    created_at: string;
    http_method: string;
    headers: any[];
    params: any[];
    query_params: any[];
    propagate_response: boolean;
  } | null;
  error?: {
    code: string;
    description: string;
  };
}

export interface CreateCustomFieldData {
  field_name: string;
  placeholder: string;
  field_type: string;
  validation: {
    required: boolean;
    maximum?: number;
    exclusive_minimum?: number;
    min_items?: number;
    depends_on?: string;
  };
  items_enum?: string[];
  properties?: Array<{ name: string; type: string; required?: boolean }>;
}

export interface CreateCustomFieldResponse {
}
