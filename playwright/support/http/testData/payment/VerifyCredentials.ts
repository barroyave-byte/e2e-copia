import { VerifierCredentialsData } from '../../models/payment';
import { fintocProcessor } from '../../../interfaces/payment_processors/fintocProcessor';

/**
 * Default verifier credentials data for verifier credentials creation
 * Following the testData architecture pattern for managing request bodies
 */
export const DEFAULT_VERIFY_CREDENTIALS_AMEX: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'amex',
  payment_processor_id: 37,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'TEST8386137293',
  private_api_key: 'fed8b422836c83c3546580f3396e32b0',
};

export const DEFAULT_VERIFY_CREDENTIALS_MERCADOPAGO: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'mercadopago',
  payment_processor_id: 39,
  enabled: true,
  currency_iso3: 'MXN',
  private_api_key: 'APP_USR-5739482117823269-092209-59a6dc75fa34ba43182bf61b7052c7a5-1479666759',
  external_merchant_id: 'dev_89fdb84755f911eda9470242ac130004',
};

export const DEFAULT_VERIFY_CREDENTIALS_OPENPAY: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'openpay',
  payment_processor_id: 34,
  enabled: true,
  currency_iso3: 'MXN',
  external_merchant_id: 'mkqzp7gegpf8rrhpwu5c',
  private_api_key: 'sk_9e5cc08d45314df388ea089fb31b0e1f',
};

export const DEFAULT_VERIFY_CREDENTIALS_KUSHKI: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'kushki',
  payment_processor_id: 40,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: '40647c8c0e75436f95c76fe13a7a60ac',
  private_api_key: '78bd84d860464486b882b779d1df4812',
};

export const DEFAULT_VERIFY_CREDENTIALS_EVOPAYMENTS: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'evopayments',
  payment_processor_id: 48,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'TEST1164963',
  private_api_key: 'f3d540ec4454da0995395d6b0990c9da',
};

export const DEFAULT_VERIFY_CREDENTIALS_CONEKTA: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'conekta_direct',
  payment_processor_id: 49,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'key_P8DyJBxkXjWOUmg0CnF3jkg',
  private_api_key: 'key_neW0LNOc9mRDx4pMN0A80xM',
};

export const DEFAULT_VERIFY_CREDENTIALS_ADYEN: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'adyen',
  payment_processor_id: 41,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'MexicoCOM',
  private_api_key:
    'AQEvhmfxL4zPYhFCw0m/n3Q5qf3Vao5JL5JeUEdT33elmoljLTeiQWVaLtEx8f1sDdkQwV1bDb7kfNy1WIxIIkxgBw==-/+hwWLb0Fj0qKSzrdM9A+ErX7d5iGFoZVye846stOJM=-$MKQ<6T#&rEjh=Iv',
};

export const DEFAULT_VERIFY_CREDENTIALS_STRIPE: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'STRIPE_DIRECT',
  payment_processor_id: 50,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key:
    'pk_test_51KanPjHzvAJD6fk5wekkuEqfrT0qyzDrNw9Rlw2Nu4PBqlS8Vt1FtTgVDmXZxZ0eM4ccxBarVwUa5v0TICjSOyei00HmiJm3my',
  private_api_key:
    'sk_test_51KanPjHzvAJD6fk5iA6c7M6Hv9pHZZirj5kzEUzGW7x5Xh4bTXIbs9kxOxdawiOQxiDoySOiRDOmtyqAm3loCQmZ001dBHZhy0',
};

export const DEFAULT_VERIFY_CREDENTIALS_NUVEI: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'nuvei',
  payment_processor_id: 54,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: '241668',
  private_api_key: 'ys0DanXRl6LqIpQit4XrtK81RmtFfiJp2KLJPMHM5kXcHQEXpLSc56sboQKKwNOY',
  external_merchant_id: '8497895954792724587',
};

export const DEFAULT_VERIFY_CREDENTIALS_TRANSBANK: VerifierCredentialsData = {
  country_iso: 'CL',
  purchase_amount: 500,
  name: 'transbank',
  payment_processor_id: 52,
  enabled: true,
  currency_iso3: 'CLP',
  private_api_key: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
  external_merchant_id: '597055555531',
};

export const DEFAULT_VERIFY_CREDENTIALS_UNLIMIT: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'unlimit',
  payment_processor_id: 75,
  enabled: true,
  currency_iso3: 'MXN',
  private_api_key: 'Exc1ArNUv523',
  external_merchant_id: '58391',
};

export const DEFAULT_VERIFY_CREDENTIALS_WOMPI: VerifierCredentialsData = {
  country_iso: 'CO',
  purchase_amount: 5000,
  name: 'wompi',
  payment_processor_id: 70,
  enabled: true,
  currency_iso3: 'COP',
  public_api_key: 'pub_test_TsTOSwnuhpQ7O7OhtoC7j791IGnVGDBY',
  private_api_key: 'prv_test_5VIUtMVdzxybZpttkJU67TuaRRWNb9Cp',
  external_merchant_id: 'test_integrity_UlCDUH1CHWZ6oVaUy0ODc0b14oflShLx',
};

export const DEFAULT_VERIFY_CREDENTIALS_WORLDPAY: VerifierCredentialsData = {
  country_iso: 'MX',
  purchase_amount: 20,
  name: 'worldpay',
  payment_processor_id: 76,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'KZFLX4TCCUBIF6K5DU2C',
  private_api_key: 'Deuna@9182!',
  external_merchant_id: 'WPLATAM001',
};

// Fintoc sandbox credentials used to verify processor registration in tests.
// public_api_key (pk_test_*) is a publishable key — safe to store in source.
// private_api_key (sk_test_*) is a sandbox-only test secret; it grants no access to production data.
export const DEFAULT_VERIFY_CREDENTIALS_FINTOC: VerifierCredentialsData = {
  country_iso: 'CL',
  purchase_amount: 5000,
  name: 'fintoc',
  payment_processor_id: 249,
  enabled: true,
  currency_iso3: 'CLP',
  public_api_key: fintocProcessor.public_api_key,
  private_api_key: fintocProcessor.private_api_key,
};
