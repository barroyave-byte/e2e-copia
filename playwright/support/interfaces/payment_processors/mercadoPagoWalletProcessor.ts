import { BaseProcessor } from './baseProcessor';

export interface MercadoPagoWalletProcessor extends BaseProcessor {
  private_api_key: string;
  expirationTime: number;
  expirationTimeOffline: number;
}

interface ExtraParams {
  exclude_payment_methods?: string[];
  binary_mode?: boolean;
}

export interface MercadoPagoWalletWithExtraParamsProcessor extends MercadoPagoWalletProcessor {
  tokenize_with_gateway?: boolean;
  enabled_card_verification?: boolean;
  extra_params?: ExtraParams;
}

const mercadoPagoWalletProcessor: MercadoPagoWalletProcessor = {
  name: 'mercadopago wallet',
  payment_processor_id: 114,
  enabled: true,
  currency_iso3: 'MXN',
  private_api_key: 'APP_USR-5739482117823269-092209-59a6dc75fa34ba43182bf61b7052c7a5-1479666759',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  expirationTime: 22,
  expirationTimeOffline: 40,
};

const mercadoPagoWalletProcessorNewInfo: MercadoPagoWalletProcessor = {
  name: 'mercadopago wallet',
  payment_processor_id: 114,
  enabled: true,
  currency_iso3: 'MXN',
  private_api_key: 'APP_USR-5739482117823269-092209-59a6dc75fa34ba43182bf61b7052c7a5-1479666759',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
  expirationTime: 25,
  expirationTimeOffline: 58,
};

const buildMPWalletProcessor = (
  extraParams: ExtraParams
): MercadoPagoWalletWithExtraParamsProcessor => {
  return {
    ...mercadoPagoWalletProcessor,
    extra_params: extraParams,
  };
};

export { mercadoPagoWalletProcessor, mercadoPagoWalletProcessorNewInfo, buildMPWalletProcessor };
