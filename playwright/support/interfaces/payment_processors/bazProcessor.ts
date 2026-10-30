import { BaseProcessor } from './baseProcessor';

interface BazProcessor extends BaseProcessor {
  external_merchant_id: string;
  private_api_key: string;
  public_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  currency_iso3?: string;
  country_iso?: string;
  extra_params: any;
  use_static_proxy?: boolean;
}

interface BazGatewayProcessor {
  name: string;
  currency_iso3?: string;
  branch_id: string;
  merchant_id: string;
  user: string;
  password: string;
  external_merchant_id: string;
  postal_code: string;
  activity_id: string;
  commerce_name: string;
  commerce_street: string;
  commerce_city: string;
  commerce_colony: string;
  commerce_number_ext: string;
  commerce_number_int: string;
}

interface BazGatewayDeUna3DSProcessor {
  merchant_id: string;
  merchant_name: string;
  merchant_country: string;
  merchant_url: string;
  merchant_category_code: string;
  visa_acquirer_bin: string;
  mastercard_acquirer_bin: string;
}

interface Deuna3DS {
  name: string;
  branch_id: string;
  merchant_id: string;
  user: string;
  password: string;
  external_merchant_id: string;
  postal_code: string;
  activity_id: string;
  commerce_name: string;
  commerce_street: string;
  commerce_city: string;
  commerce_colony: string;
  commerce_number_ext: string;
  commerce_number_int: string;
}

const bazProcessor: BazProcessor = {
  enabled: true,
  name: 'baz',
  payment_processor_id: 105,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  acquirer_id: '01011130',
  external_merchant_id: '7412345',
  private_api_key: 'B531B42EAC343095DF38259B2D08A431',
  public_api_key: '9265660159',
  use_static_proxy: true,
  automatic_capture: true,
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456',
  },
  extra_params: {
    Pwd: 'AVMNLL218Y',
    NuCp: '11510',
    Seed: 'B531B42EAC343095DF38259B2D08A431',
    User: 'M19ADXUA1',
    CdMcc: '6211',
    Data0: '9265660159',
    CdGiro: 'ADMON',
    CdName: 'BAZ SYNC MX - STG',
    Country: 'MEX',
    NbCalle: 'Jose Luis Lagrange',
    IdBranch: '0004',
    NbCiudad: 'México',
    NbEstado: 'CIUDAD DE MÉXICO',
    IdCompany: 'M19A',
    NbColonia: 'Polanco',
    MerchantID: '289015',
    NbExterior: '103',
    NbInterior: 'Piso 5',
    merchant_url: 'https://www.bancoazteca.com.mx/',
    merchant_name: 'BAZ SYNC MX - STG',
    MultiadqSwitch: 'PROSA',
    MultiadqAcquirer: '127',
    merchant_country: 'Mexico',
    amex_acquirer_bin: '123456',
    visa_acquirer_bin: '451298',
    merchant_category_code: '5422',
    mastercard_acquirer_bin: '543499',
    diners_discover_acquirer_bin: '123456',
  },
};

const bazProcessor_MX: BazProcessor = {
  ...bazProcessor,
  allow_installments: true,
};

const bazProcessorAuthorize_MX: BazProcessor = {
  ...bazProcessor,
  automatic_capture: false,
};

const bazProcessorPayconnectWithDeuna3DS: BazProcessor = {
  enabled: true,
  name: 'baz_with_deuna_3ds',
  payment_processor_id: 105,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  acquirer_id: '01011130',
  external_merchant_id: '7412345',
  private_api_key: 'B531B42EAC343095DF38259B2D08A431',
  public_api_key: '9265660159',
  use_static_proxy: true,
  automatic_capture: true,
  allow_installments: true,
  enable_3ds_authentication: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '7412345',
  },
  extra_params: {
    Pwd: 'AVMNLL218Y',
    NuCp: '11510',
    Seed: 'B531B42EAC343095DF38259B2D08A431',
    User: 'M19ADXUA1',
    CdMcc: '6211',
    Data0: '9265660159',
    CdGiro: 'ADMON',
    CdName: 'BAZ SYNC MX - STG',
    Country: 'MEX',
    NbCalle: 'Jose Luis Lagrange',
    IdBranch: '0004',
    NbCiudad: 'México',
    NbEstado: 'CIUDAD DE MÉXICO',
    IdCompany: 'M19A',
    NbColonia: 'Polanco',
    MerchantID: '289015',
    NbExterior: '103',
    NbInterior: 'Piso 5',
    merchant_url: 'https://www.bancoazteca.com.mx/',
    merchant_name: 'BAZ SYNC MX - STG',
    MultiadqSwitch: 'PROSA',
    MultiadqAcquirer: '127',
    merchant_country: 'Mexico',
    amex_acquirer_bin: '123456',
    visa_acquirer_bin: '451298',
    merchant_category_code: '5422',
    mastercard_acquirer_bin: '543499',
    diners_discover_acquirer_bin: '123456',
  },
};

const bazAuthorizeProcessorPayconnectWithDeuna3DS: BazProcessor = {
  ...bazProcessorPayconnectWithDeuna3DS,
  automatic_capture: false,
};

const bazGatewayProcessorConnection: BazGatewayProcessor = {
  name: 'Baz Gato wey',
  currency_iso3: 'MXN',
  merchant_id: '8743',
  branch_id: '233455',
  user: 'gato wey user',
  password: 'gatoWeyPass',
  external_merchant_id: '7798',
  postal_code: '2134',
  activity_id: '6535',
  commerce_name: 'Gato Wey Inc',
  commerce_street: 'Central Street',
  commerce_city: 'DF',
  commerce_colony: 'Central',
  commerce_number_ext: '12',
  commerce_number_int: '1',
};

const bazGatewayDeUna3DS: BazGatewayDeUna3DSProcessor = {
  merchant_id: '9834',
  merchant_name: 'Gato Wey Inc',
  merchant_country: 'MX',
  merchant_url: 'https://www.gatowey.com/',
  merchant_category_code: '5691',
  visa_acquirer_bin: '2352',
  mastercard_acquirer_bin: '123456',
};

export {
  bazProcessor_MX,
  bazProcessorAuthorize_MX,
  bazProcessorPayconnectWithDeuna3DS,
  bazAuthorizeProcessorPayconnectWithDeuna3DS,
  BazGatewayProcessor,
  BazGatewayDeUna3DSProcessor,
  bazGatewayProcessorConnection,
  bazGatewayDeUna3DS,
};
