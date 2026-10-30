import { BaseProcessor } from './baseProcessor';

export interface AmexProcessor extends BaseProcessor {
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  external_merchant_id: string;
  acquirer_id: string;
  extra_params: { [key: string]: string };
}

const amexProcessor: AmexProcessor = {
  name: 'amex',
  payment_processor_id: 37,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  external_merchant_id: '8017854860',
  acquirer_id: '100000000',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {
    aavType: 'AE',
    sellerId: '1234567890',
    reasonCode: '1900',
    terminalId: '00000001',
    countryCode: '484',
    posDataCode: '1000S0100010',
    sellerEmail: 'merchant@merchant.com',
    sellerPhone: '14155688537',
    businessCode: '5399',
    merchant_url: 'https://www.deuna.com/',
    merchant_name: 'Deuna',
    processingCode: '200000',
    cardAcceptorCity: 'Ciudad de Mexico',
    cardAcceptorName: 'Deuna',
    merchant_country: 'MX',
    approvalCodeLength: '6',
    cardAcceptorAddress: 'Av Antonio Dovali Jaime 70',
    cardAcceptorStateCode: 'CMX',
    cardAcceptorPostalCode: '11510',
    merchant_category_code: '5691',
    submitterID: '1234567890',
  },
  allow_installments: false,
  enable_3ds_authentication: false,
};

const amexUSProcessor: AmexProcessor = {
  name: 'amex',
  payment_processor_id: 37,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'US',
  acquirer_id: '100000000',
  external_merchant_id: '8017854860',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {
    aavType: 'AE',
    sellerId: '1234567890',
    reasonCode: '1900',
    terminalId: '00000001',
    countryCode: '840',
    posDataCode: '1000S0100010',
    sellerEmail: 'merchant@merchant.com',
    sellerPhone: '14155688537',
    businessCode: '5399',
    processingCode: '200800',
    cardAcceptorCity: 'New York',
    cardAcceptorName: 'Deuna',
    approvalCodeLength: '6',
    cardAcceptorAddress: '159 Crosby St',
    cardAcceptorStateCode: 'NY',
    cardAcceptorPostalCode: '10012',
    cardAcceptorNameLocation: 'Av Antonio Dovali Jaime 70',
    submitterID: '1234567890',
  },
  allow_installments: false,
  enable_3ds_authentication: false,
};

const amex3dsProcessor: AmexProcessor = {
  ...amexProcessor,
  enable_3ds_authentication: true,
};

const amexProcessorMXAuthorize: AmexProcessor = {
  ...amexProcessor,
  automatic_capture: false,
};

const amexProcessorUSAuthorize: AmexProcessor = {
  ...amexUSProcessor,
  automatic_capture: false,
};

export {
  amex3dsProcessor,
  amexProcessor,
  amexUSProcessor,
  amexProcessorMXAuthorize,
  amexProcessorUSAuthorize,
};
