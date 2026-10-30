import { WalletCredentialsRequest } from '../../models/wallet';

/**
 * Default request payloads for POST /wallet/credentials.
 *
 * `merchant_id` is left as an empty string in the defaults; the service
 * fills it in at call time from the merchantId passed by the caller.
 */

export const googlePayCredentialDefault: WalletCredentialsRequest = {
  merchant_id: '',
  merchant_name: 'Test DEUNA',
  wallet_name: 'google_pay',
  wallet_config: {
    gateway: 'DIRECT',
    allowed_card_networks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
    allowed_auth_methods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
  },
  order: 1,
  credential_flow: 'deuna_managed',
};

export const applePayCredentialDefault: WalletCredentialsRequest = {
  merchant_id: '',
  merchant_name: 'DEUNA Test',
  wallet_name: 'apple_pay',
  wallet_merchant_id: 'merchant.test-1.io.deuna.dev.pay',
  wallet_config: {
    merchant_domains: [
      'explore.dev.deuna.io',
      'pay.dev.deuna.io',
      'explore.stg.deuna.io',
      'pay.stg.deuna.com',
    ],
    allowed_card_networks: ['visa', 'masterCard', 'amex', 'discover'],
    allowed_auth_methods: ['supports3DS'],
  },
  order: 1,
  deuna_owner: false,
  credential_flow: 'deuna_managed',
};
