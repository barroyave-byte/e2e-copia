/**
 * Models for POST /wallet/credentials.
 *
 * Under the `deuna_managed` credential flow the backend owns the wallet
 * keys/certs, so the request only carries identity + capability metadata —
 * no public/private keys are sent from the test.
 */

export interface WalletCredentialsRequest {
  merchant_id: string;
  merchant_name: string;
  wallet_name: 'apple_pay' | 'google_pay';
  wallet_merchant_id?: string;
  wallet_config: Record<string, unknown>;
  order: number;
  credential_flow: 'deuna_managed' | 'merchant_managed';
  deuna_owner?: boolean;
}

export interface WalletCredentialsResponse {
  id?: string;
  merchant_name?: string;
  wallet_name?: string;
}
