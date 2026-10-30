/**
 * Fraud-settings API models.
 *
 *   PUT/GET /merchants/{merchantId}/fraud-settings
 *   { "providers": { "<provider>": { ...provider-specific params } } }
 *
 * Each anti-fraud provider carries its OWN parameter shape (not a uniform
 * `enabled` flag). The per-provider shapes below mirror the checkout client's
 * fraud provider init params (`InitFraudProvidersProps`).
 */

export type FraudProviderName =
  | 'CLEARSALE'
  | 'CLEARSALE-BRASIL'
  | 'CYBERSOURCE'
  | 'MERCADOPAGO'
  | 'SIFT'
  | 'SIGNIFYD'
  | 'STRIPE'
  | 'KOUNT'
  | 'KONDUTO'
  | 'OPENPAY'
  | 'RISKIFIED'
  | 'ACCERTIFY'
  | 'KOIN'
  | 'PAYU';

export interface AccertifyParams {
  src: string;
  collectorHostSrc?: string;
  sid: string;
  id?: string;
  dvc?: string;
  dvct: string;
}

export interface RiskifiedParams {
  storeDomain: string;
}

export interface CyberSourceParams {
  orgId: string;
  merchantId: string;
}

export interface SignifydParams {
  account: string;
  email: string;
}

export interface SiftParams {
  beaconKey: string;
  userId?: string;
}

export interface ClearSaleParams {
  clientId: string;
}

export interface StripeParams {
  apiKey: string;
}

export interface KountParams {
  dataCollectorUrl: string;
  merchantId: string;
  clientId: string;
  environment: string;
  isSinglePageApp: boolean;
}

export interface KoinParams {
  orgId: string;
  sessionId?: string;
}

// PayU / Mercado Pago don't require additional configuration parameters.
export type PayUParams = Record<string, unknown>;
export type MercadoPagoParams = Record<string, unknown>;

export interface KondutoParams {
  publicKey: string;
}

export interface OpenPayParams {
  merchantId: string;
  publicApiKey: string;
  sandboxMode?: boolean;
}

/** Maps each provider to its specific parameter shape. */
export interface FraudProviderParamsMap {
  CLEARSALE: ClearSaleParams;
  'CLEARSALE-BRASIL': ClearSaleParams;
  OPENPAY: OpenPayParams;
  CYBERSOURCE: CyberSourceParams;
  MERCADOPAGO: MercadoPagoParams;
  SIFT: SiftParams;
  SIGNIFYD: SignifydParams;
  STRIPE: StripeParams;
  KOUNT: KountParams;
  KONDUTO: KondutoParams;
  RISKIFIED: RiskifiedParams;
  ACCERTIFY: AccertifyParams;
  KOIN: KoinParams;
  PAYU: PayUParams;
}

/** Partial map: a fraud-settings payload configures one or more providers. */
export type FraudSettingsProviders = Partial<{
  [K in keyof FraudProviderParamsMap]: FraudProviderParamsMap[K];
}>;

export interface FraudSettingsData {
  providers: FraudSettingsProviders;
}

export interface FraudSettingsResponse extends FraudSettingsData {
  merchant_id?: string;
  public_api_key?: string;
}
