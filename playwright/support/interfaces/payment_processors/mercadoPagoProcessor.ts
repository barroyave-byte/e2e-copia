import { BaseProcessor } from './baseProcessor';

interface MercadoPagoProcessor extends BaseProcessor {
  private_api_key: string;
  external_merchant_id: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  identification_type?: string;
  tokenize_with_gateway?: boolean;
  exclude_cvv?: boolean;
}

const mercadoPagoProcessor: MercadoPagoProcessor = {
  name: 'mercadopago',
  payment_processor_id: 39,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  private_api_key: 'APP_USR-5739482117823269-092209-59a6dc75fa34ba43182bf61b7052c7a5-1479666759',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const mercadoPagoProcessorArgentina: MercadoPagoProcessor = {
  name: 'mercadopago argentina',
  payment_processor_id: 39,
  enabled: true,
  currency_iso3: 'ARS',
  country_iso: 'AR',
  private_api_key: 'APP_USR-7192116393828174-061415-61a43837379e04acc50e04278b05497d-1856916519',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const mercadoPagoProcessorBrasil: MercadoPagoProcessor = {
  name: 'mercadopago',
  payment_processor_id: 39,
  enabled: true,
  currency_iso3: 'BRL',
  country_iso: 'BR',
  private_api_key: 'APP_USR-5539298943100568-092209-3de74bf6a69a2396ae7b3c81861f59dc-1479665589',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const mercadoPagoProcessorChile: MercadoPagoProcessor = {
  name: 'mercadopago',
  payment_processor_id: 39,
  enabled: true,
  currency_iso3: 'CLP',
  country_iso: 'CL',
  private_api_key: 'APP_USR-5739482117823269-092209-59a6dc75fa34ba43182bf61b7052c7a5-1479666759',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  allow_installments: true,
  enable_3ds_authentication: false,
  identification_type: 'RUT',
};

const mercadoPagoProcessorPeru: MercadoPagoProcessor = {
  name: 'mercadopago peru',
  payment_processor_id: 39,
  enabled: true,
  currency_iso3: 'PEN',
  country_iso: 'PE',
  private_api_key: 'APP_USR-1243457289452525-062115-1fd4db71a4e474706475de4875399fbb-1869177456',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const mercadoPagoProcessorColombia: MercadoPagoProcessor = {
  name: 'mercadopago_colombia',
  payment_processor_id: 39,
  enabled: true,
  currency_iso3: 'COP',
  private_api_key: 'APP_USR-5739482117823269-092209-59a6dc75fa34ba43182bf61b7052c7a5-1479666759',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  allow_installments: false,
  enable_3ds_authentication: false,
};

const mercadoPagoProcessorPSE: MercadoPagoProcessor = {
  name: 'mercadopago_pse',
  payment_processor_id: 60,
  enabled: true,
  currency_iso3: 'COP',
  private_api_key: 'TEST-4256309563084987-042113-6cc3610cd3970e40cfd35e36b5e7af59-618557277',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  allow_installments: false,
  enable_3ds_authentication: false,
};

const mercadoPagoProcessorAuthorize: MercadoPagoProcessor = {
  ...mercadoPagoProcessor,
  automatic_capture: false,
  country_iso: 'MX',
};

const mercadoPagoProcessorAuthorizeMSI: MercadoPagoProcessor = {
  ...mercadoPagoProcessorPeru,
  automatic_capture: false,
  country_iso: 'MX',
  currency_iso3: 'MXN',
};

const mercadoPagoProcessorInvalidCredentials: MercadoPagoProcessor = {
  ...mercadoPagoProcessor,
  name: 'mercadopagoInvalidCredentials',
  private_api_key: '5739482117823269-092209-59a6dc75fa34ba43182bf61b7052c7a5-1479666710',
};

const mercadoPagoProcessorTokenizeAndExcludeCVV: MercadoPagoProcessor = {
  ...mercadoPagoProcessor,
  country_iso: 'MX',
  tokenize_with_gateway: true,
  exclude_cvv: true,
};

const mercadoPagoProcessorExcludeCVV: MercadoPagoProcessor = {
  ...mercadoPagoProcessor,
  country_iso: 'MX',
  exclude_cvv: true,
};

interface MercadoPagoWithExtraParamsProcessor extends MercadoPagoProcessor {
  tokenize_with_gateway: boolean;
  enabled_card_verification: boolean;
  extra_params: any;
}

const mercadoPagoWithTokenizationProcessor: MercadoPagoWithExtraParamsProcessor = {
  ...mercadoPagoProcessorArgentina,
  tokenize_with_gateway: true,
  enabled_card_verification: true,
  extra_params: {
    psp_card_tokenization: {
      visa: {
        charge_type: 'zero_dollar_charge',
        minimum_amount: 0,
      },
      mastercard: {
        charge_type: 'zero_dollar_charge',
        minimum_amount: 0,
      },
      dinners: {
        charge_type: 'normal_charge',
        minimum_amount: 15,
      },
      amex: {
        charge_type: 'normal_charge',
        minimum_amount: 3,
      },
    },
  },
};

const mercadoPagoPeruWithTokenizationProcessor: MercadoPagoWithExtraParamsProcessor = {
  ...mercadoPagoProcessorPeru,
  tokenize_with_gateway: true,
  enabled_card_verification: true,
  extra_params: {
    psp_card_tokenization: {
      visa: {
        charge_type: 'normal_charge',
        minimum_amount: 10,
      },
      mastercard: {
        charge_type: 'normal_charge',
        minimum_amount: 10,
      },
      dinners: {
        charge_type: 'normal_charge',
        minimum_amount: 10,
      },
      amex: {
        charge_type: 'normal_charge',
        minimum_amount: 10,
      },
    },
  },
};

const mercadoPagoProcessorWithDEUNAThreeDS: MercadoPagoProcessor = {
  ...mercadoPagoProcessor,
  enable_3ds_authentication: true,
  extra_params: {
    merchant_name: 'DEUNA',
    merchant_url: 'https://www.deuna.com/',
    merchant_category_code: '5691', // Men's and Women's Clothing Stores
    merchant_acquirer_id: '123456',
    merchant_country: 'MX',
    visa_acquirer_bin: '451298',
    mastercard_acquirer_bin: '543499',
    amex_acquirer_bin: '123456',
    diners_discover_acquirer_bin: '123456',
  },
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456',
  },
};

const mercadoPagoProcessorColombiaThreeDS: MercadoPagoProcessor = {
  ...mercadoPagoProcessorColombia,
  enable_3ds_authentication: true,
  extra_params: {
    merchant_name: 'DEUNA',
    merchant_url: 'https://www.deuna.com/',
    merchant_category_code: '5691',
    merchant_acquirer_id: '123456',
    merchant_country: 'CO',
    visa_acquirer_bin: '451298',
    mastercard_acquirer_bin: '543499',
    amex_acquirer_bin: '123456',
    diners_discover_acquirer_bin: '123456',
  },
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456',
  },
};

export {
  mercadoPagoPeruWithTokenizationProcessor,
  mercadoPagoProcessor,
  mercadoPagoProcessorArgentina,
  mercadoPagoProcessorAuthorize,
  mercadoPagoProcessorAuthorizeMSI,
  mercadoPagoProcessorBrasil,
  mercadoPagoProcessorChile,
  mercadoPagoProcessorColombia,
  mercadoPagoProcessorColombiaThreeDS,
  mercadoPagoProcessorExcludeCVV,
  mercadoPagoProcessorInvalidCredentials,
  mercadoPagoProcessorPeru,
  mercadoPagoProcessorPSE,
  mercadoPagoProcessorTokenizeAndExcludeCVV,
  mercadoPagoProcessorWithDEUNAThreeDS,
  mercadoPagoWithTokenizationProcessor,
};
