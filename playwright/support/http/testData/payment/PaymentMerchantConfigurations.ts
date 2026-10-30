import { ConfigurationMerchantPaymentsData } from '@support/http/models/payment';

export const ALLOW_STRIPE_DIRECT_CONFIGURATION: ConfigurationMerchantPaymentsData = {
  config_code: 'ALLOW_STRIPE_DIRECT_CONFIGURATION',
  config_value: 'ENABLED',
};

/**
 * Lets MercadoPago answer with a manual-review / processing status instead of resolving the
 * transaction to an immediate approve-or-decline.
 */
export const MERCADOPAGO_BINARY_MODE_DISABLED: ConfigurationMerchantPaymentsData = {
  config_code: 'MERCADOPAGO_BINARY_MODE',
  config_value: 'DISABLED',
};

export const APM_CURRENCY_FILTER_ENABLED: ConfigurationMerchantPaymentsData = {
  config_code: 'APM_CURRENCY_FILTER',
  config_value: 'ENABLED',
};

export const USE_DYNAMIC_ROUTING_ENABLED: ConfigurationMerchantPaymentsData = {
  config_code: 'USE_DYNAMIC_ROUTING',
  config_value: 'ENABLED',
};

export const USE_PSP_TOKENIZATION_ENABLED: ConfigurationMerchantPaymentsData = {
  config_code: 'USE_PSP_TOKENIZATION',
  config_value: 'ENABLED',
};
