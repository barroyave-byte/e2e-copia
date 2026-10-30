import { BaseProcessor } from './baseProcessor';

interface OpenPayProcessor extends BaseProcessor {
  external_merchant_id: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  tokenize_on_purchase?: boolean;
  tokenize_with_gateway?: boolean;
  countries_excluded_from_id_validation?: string[];
}

const openPayProcessor: OpenPayProcessor = {
  name: 'openpay',
  payment_processor_id: 34,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  external_merchant_id: 'mkqzp7gegpf8rrhpwu5c',
  private_api_key: 'sk_9e5cc08d45314df388ea089fb31b0e1f',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const openPayProcessorCO: OpenPayProcessor = {
  name: 'openpay',
  payment_processor_id: 34,
  enabled: true,
  currency_iso3: 'COP',
  country_iso: 'CO',
  external_merchant_id: 'musdtansoapkyoyiw22q',
  private_api_key: 'sk_fbed21e0aecb418dbd58c68b0372da29',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const openPayFingerprintProcessor: any = {
  name: 'open_pay',
  payment_processor_id: 34,
  enabled: true,
  currency_iso3: 'MXN',
  acquirer_id: 'OpenPay',
  external_merchant_id: 'makcyxedkb6lzkwfpv9d',
  public_api_key: 'pk_5c137f95212743c7aef3f1b0bbf40ded',
  private_api_key: 'sk_dde1acaf32234111801912475b0f5cef',
  automatic_capture: true,
  country_iso: 'MX',
  extra_params: {
    group_id: 'gdaiaqxeebrqkemc62xv',
    store_id: 'all',
  },
  tokenize_on_purchase: true,
  tokenize_with_gateway: true,
  countries_excluded_from_id_validation: ['ALL'],
};

const openPay3dsProcessor: OpenPayProcessor = {
  ...openPayProcessor,
  enable_3ds_authentication: true,
};

const openPayProcessorAuthorize: OpenPayProcessor = {
  ...openPayProcessor,
  automatic_capture: false,
  country_iso: 'MX',
};

const openPayProcessorAuthorizeWithTokenizeOnPurchase: OpenPayProcessor = {
  ...openPayProcessor,
  tokenize_on_purchase: true,
  automatic_capture: false,
  country_iso: 'MX',
};

export {
  openPayProcessor,
  openPayProcessorCO,
  openPay3dsProcessor,
  openPayProcessorAuthorize,
  openPayProcessorAuthorizeWithTokenizeOnPurchase,
  openPayFingerprintProcessor,
};
