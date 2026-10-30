import { FraudProvidersObject } from '@pages/explore/fraud_providers/interfaces';
import { LanguageCodes } from './languageCodeTypes';

export type WebSdkVersion = 'v1.0' | 'v1.2' | 'v1.3' | 'v1.4';

export type ExperienceTypesExplore =
  | 'Checkout en Pasos'
  | 'Formularios'
  | 'Payment Widget'
  | 'Payment vault (modal)'
  | 'Payment Link'
  | 'Checkout Widget'
  | 'Payment Vault (Web SDK)';

export interface WidgetOptionsExplore {
  customStyle?: {
    cssFile?: string;
  };
  generatorsExcluded?: string[];
  language?: LanguageCodes;
  deleteSession?: boolean;
  withSplitPayment?: boolean;
  withOnlyCardEnrollment?: boolean;
  withPurchaseV1?: boolean;
  disablePayButtonWidget?: boolean;
  merchantCredentials?: {
    publicKey: string;
    privateKey: string;
  };
  orderToken?: string;
  exploreUrl?: string;
  userToken?: string;
  antiFraudProviders?: FraudProvidersObject;
  webSdkVersion?: WebSdkVersion;
  purchaseV1?: boolean;
  vaultWebSdkConfig?: {
    withInitNextAction?: boolean;
  };
}

/**
 * Options for the two entry points that fill the Explore form, `setUpExplore` and
 * `navigateAndSetup`.
 *
 * `orderToken` is required on purpose. Until this type existed, both defaulted the token to
 * `process.env.ORDER_TOKEN_NEW`, written by whatever `emaService.tokenize*` call ran last in
 * the worker — so a spec that forgot to tokenize still opened a widget, on another spec's
 * order. Pass the token the spec itself tokenized, or `''` for a flow that opens the widget
 * without one.
 */
export type WidgetSetupOptions = WidgetOptionsExplore & {
  orderToken: string;
  /**
   * Required for the same reason as `orderToken`. These used to default to
   * `PUBLIC_KEY_MERCHANT` / `PRIVATE_KEY_MERCHANT`, written by the last `basicSetup` that
   * ran in the worker, so a spec could open the widget on another spec's merchant.
   */
  merchantCredentials: { publicKey: string; privateKey: string };
};
