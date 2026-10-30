import { BaseProcessor } from './baseProcessor';

interface WorldpayProcessor extends BaseProcessor {
  external_merchant_id: string;
  private_api_key: string;
  public_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  allow_network_token?: boolean;
  flow?: string;
}

const worldpayProcessor: WorldpayProcessor = {
  name: 'worldpay',
  payment_processor_id: 76,
  enabled: true,
  currency_iso3: 'BRL',
  public_api_key: 'ECWGJRL5IL46DAUQ4H4J', //username
  private_api_key: 'Ru9RcbAJEnqzQu88', // password
  external_merchant_id: 'DEUNATEST', //merchantCode que va en el payload
  allow_installments: true,
  flow: 'direct',
  enable_3ds_authentication: false,
};

const worldpayProcessorPayconnect: WorldpayProcessor = {
  name: 'worldpay',
  payment_processor_id: 76,
  enabled: true,
  currency_iso3: 'MXN',
  external_merchant_id: 'DEUNATEST',
  private_api_key: 'Ru9RcbAJEnqzQu88',
  public_api_key: 'ECWGJRL5IL46DAUQ4H4J',
  automatic_capture: true,
  allow_installments: true,
  country_iso: 'MX',
  flow: 'payconnect',
  enable_3ds_authentication: false,
};

const worldpayProcessor_BR: WorldpayProcessor = {
  ...worldpayProcessor,
  country_iso: 'BR',
  currency_iso3: 'BRL',
};

const worldpayProcessor_GT: WorldpayProcessor = {
  ...worldpayProcessor,
  country_iso: 'GT',
  currency_iso3: 'GTQ',
};

const worldpayProcessor_PE: WorldpayProcessor = {
  ...worldpayProcessor,
  country_iso: 'PE',
  currency_iso3: 'PEN',
};

const worldpayProcessorAuthorize_BR: WorldpayProcessor = {
  ...worldpayProcessor,
  automatic_capture: false,
  country_iso: 'BR',
  currency_iso3: 'BRL',
};

const worldpayProcessorAuthorize_BR_cryptogram: WorldpayProcessor = {
  ...worldpayProcessor,
  automatic_capture: false,
  country_iso: 'BR',
  currency_iso3: 'BRL',
  allow_network_token: true,
};

const worldpayProcessorAuthorize_GT: WorldpayProcessor = {
  ...worldpayProcessor,
  automatic_capture: false,
  country_iso: 'GT',
  currency_iso3: 'GTQ',
};

const worldpayProcessorAuthorize_PE: WorldpayProcessor = {
  ...worldpayProcessor,
  automatic_capture: false,
  country_iso: 'PE',
  currency_iso3: 'PEN',
};

const worldpayWalletCredentials = {
  wallet_name: 'google_pay',
  public_key:
    'BA0lmcPw7ZupleeOWI+iiuif0oOGs4lfbTV6+q5eQzX2iT49N9mvLoyuTig9SluG95YuBuaDNgXyImILN8L7f2M=',
  private_key:
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJgzokinuucsZZxyhK6bLozgCSiw/SdC7L4LU6TJECLChRANCAAQNJZnD8O2bqZXnjliPooron9KDhrOJX201evquXkM19ok+PTfZry6Mrk4oPUpbhveWLgbmgzYF8iJiCzfC+39j',
};

const worldpayProcessorPayconnectAuthorize: WorldpayProcessor = {
  ...worldpayProcessorPayconnect,
  automatic_capture: false,
};

const worldpayProcessorPayconnectAuthorize_BR: WorldpayProcessor = {
  ...worldpayProcessorPayconnect,
  automatic_capture: false,
  country_iso: 'BR',
  currency_iso3: 'BRL',
};

const worldpayProcessorPayconnectAuthorize_GT: WorldpayProcessor = {
  ...worldpayProcessorPayconnect,
  automatic_capture: false,
  country_iso: 'GT',
  currency_iso3: 'GTQ',
};

const worldpayProcessorPayconnectAuthorize_PE: WorldpayProcessor = {
  ...worldpayProcessorPayconnect,
  automatic_capture: false,
  country_iso: 'PE',
  currency_iso3: 'PEN',
};

const worldpayProcessorPayconnect_CO: WorldpayProcessor = {
  ...worldpayProcessorPayconnect,
  country_iso: 'CO',
  currency_iso3: 'COP',
};

const worldpayProcessorPayconnectAuthorize_MX: WorldpayProcessor = {
  ...worldpayProcessorPayconnect,
  automatic_capture: false,
};

const worldpayMPC: WorldpayProcessor = {
  ...worldpayProcessorPayconnect,
  automatic_capture: false,
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 1,
  },
};

export {
  worldpayProcessor_BR,
  worldpayProcessor_GT,
  worldpayProcessor_PE,
  worldpayProcessorAuthorize_BR,
  worldpayProcessorAuthorize_GT,
  worldpayProcessorPayconnectAuthorize_MX,
  worldpayProcessorAuthorize_PE,
  worldpayProcessorAuthorize_BR_cryptogram,
  worldpayWalletCredentials,
  worldpayProcessorPayconnect,
  worldpayProcessorPayconnectAuthorize,
  worldpayProcessorPayconnect_CO,
  worldpayProcessorPayconnectAuthorize_BR,
  worldpayProcessorPayconnectAuthorize_GT,
  worldpayProcessorPayconnectAuthorize_PE,
  worldpayMPC,
};
