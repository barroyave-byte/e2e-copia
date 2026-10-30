export enum Env {
  Production = 'production',
  Staging = 'staging',
  Develop = 'develop',
  Sandbox = 'sandbox',
  local = 'local',
}

export type Providers =
  | 'CLEARSALE'
  | 'CLEARSALE-BRASIL'
  | 'CYBERSOURCE'
  | 'MERCADOPAGO'
  | 'SIFT'
  | 'SIGNIFYD'
  | 'STRIPE'
  | 'KOUNT'
  | 'KOIN'
  | 'KONDUTO'
  | 'OPENPAY'
  | 'RISKIFIED'
  | 'ACCERTIFY'
  | 'PAYU';

export interface FraudProviderParams<T> {
  sessionId: string;
  env: Env;
  params: T;
}

export type FraudProvider<T, Provider extends Providers> = (
  params: FraudProviderParams<T>
) => Promise<
  | {
      [key in Provider]?: string | string[];
    }
  | undefined
>;

export interface AccertifyParams {
  /**
   * Data collector URL.
   */
  src: string;
  /**
   * Optional id for the script tag, not really necessary.
   */
  id?: string;
  /**
   * Automatic submission of collected data in the bg.
   */
  dvc?: string;
}
export interface AccertifyScriptParams extends AccertifyParams {
  /**
   * Default timeout for the three async collections, to speed things along.
   */
  dvct: string;
  /**
   * Set this if you have it -- UNIQUE per HTTP session if possible.
   */
  sid: string;
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
  accountId: string;
  restApiKey: string;
}

export interface ClearSaleParams {
  clientId: string;
}

export interface StripeParams {
  apiKey: string;
}

export interface KountParams {
  dataCollectorUrl: string;
  merchantId: string; // m = six digit Merchant ID number issued by Kount
  clientId: string; // clientID assigned to you by Kount
  environment: string; // Environment for data collection provided by Kount
  isSinglePageApp: boolean; // Or true, changes some internal behavior
}

export interface KoinParams {
  orgId: string;
}

export interface KondutoParams {
  publicKey: string;
}

export interface OpenPayParams {
  merchantId: string;
  publicApiKey: string;
  sandboxMode?: boolean;
}

export type FraudProvidersObject = Partial<Record<Providers, Record<string, string | boolean>>>;

export type FraudField = {
  [key in Providers]: string | boolean;
};

export interface MercadoPagoParams {}

export type InitFraudProvidersProps = {
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
};
