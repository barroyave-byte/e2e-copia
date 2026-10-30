interface PayPalWalletProcessor {
  name: string;
  payment_processor_id: number;
  enabled: boolean;
  automatic_capture: boolean;
  currency_iso3: string;
  country_iso: PayPalWalletProcessorCurrencyIso;
  public_api_key: string;
  private_api_key: string;
  external_merchant_id: string;
  allow_installments: boolean;
  use_consent: boolean;
  flow: PayPalWalletProcessorFlow;
  flow_version: PayPalWalletFlowVersion;
  extra_params: PayPalWalletProcessorExtraParams;
  expiration_times: PayPalWalletProcessorExpirationTimes;
  // Multiple Partial Capture (MPC) fields
  multiple_partial_capture?: boolean;
  multiple_partial_capture_mode?: string;
  transaction_config?: {
    capture_cutoff_days?: number;
    refund_cutoff_days?: number;
  };
}

type PayPalWalletProcessorCurrencyIso = 'MX';

type PayPalWalletProcessorFlow = 'payconnect';

type PayPalWalletFlowVersion = 'multi_step_workflow';

interface PayPalWalletProcessorExtraParams {
  installments_required: boolean;
}

interface PayPalWalletProcessorExpirationTimes {
  pending: number;
}

export const paypalWalletProcessor: PayPalWalletProcessor = {
  name: 'paypal_wallet',
  payment_processor_id: 56,
  enabled: true,
  automatic_capture: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  public_api_key:
    'ASV7KQNqbJxrW__2UkmeSVlo3e-rIyTecVP7srZlWHLS21LTIIHVG4T-8DZ-_1oh_oRpO7MithJkDXJX',
  private_api_key:
    'EIbIFC1cJAQRcAftn1QLizcDAD0Bk6V-GkX8OTZj-X8Ny78WJfEnJ_PDjxzX-8oiHJR8wPqy--jKNWal',
  external_merchant_id: '7YQCDFB3XTDUN',
  allow_installments: false,
  use_consent: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {
    installments_required: false,
  },
  expiration_times: {
    pending: 5,
  },
};

export const paypalWalletProcessorMPC: PayPalWalletProcessor = {
  ...paypalWalletProcessor,
  name: 'paypal_wallet_mpc',
  use_consent: false,
  automatic_capture: false,
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 1,
  },
};

export const paypalWalletProcessorWithInstallments: PayPalWalletProcessor = {
  ...paypalWalletProcessor,
  allow_installments: true,
  extra_params: {
    installments_required: true,
  },
};

export const paypalWalletProcessorUSD: PayPalWalletProcessor = {
  ...paypalWalletProcessor,
  name: 'paypal_wallet_usd',
  currency_iso3: 'USD',
};
