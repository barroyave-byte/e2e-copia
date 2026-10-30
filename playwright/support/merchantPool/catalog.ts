import * as processorsConfig from '@support/interfaces/payment_processors';
import { MerchantSpec } from './MerchantSpec';

/**
 * Every merchant the pool can hand out. CI provisions these before the shard matrix
 * (scripts/merchant-pool/cli/provision.ts), so a spec can only share a merchant declared here.
 *
 * Adding an entry: the specs that use it must meet the MerchantSpec contract (they never change
 * merchant-level configuration). Specs that do stay on configMerchant.basicSetup.
 */
export const MERCHANT_POOL = {
  MX_STRIPE: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.stripeProcessor],
    replicas: 3,
  },
  // Wave 1 (docs/merchant-pool-plan.md, section 4.9): ~1 replica per 8 specs, each admitted by
  // scripts/merchant-pool/cli/canary.ts. Left out: CONEKTA_PROCESSOR_AUTHORIZE_MX (its specs are
  // test.fixme, so nothing could be verified) and MERCADO_PAGO_PROCESSOR_AUTHORIZE_MX (concurrent
  // purchases on one merchant were declined, DP-8001/DP-4200, 15 of 34 attempts).
  KUSHKI_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessor],
    replicas: 4,
  },
  KUSHKI_PROCESSOR_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorAuthorize],
    replicas: 3,
  },
  CIELO_AUTHORIZE_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.cieloAuthorize],
    replicas: 3,
  },
  // PayPal Wallet (docs/merchant-pool-plan.md, section 4.11): every processor registers a webhook
  // and the PayPal app allows 10, shared by all environments; one spec per processor exhausted
  // them (DP-9999 WEBHOOK_NUMBER_LIMIT_EXCEEDED in run 37725483883). One replica on purpose: a
  // pooled processor holds its slot for the whole run, and it is deleted when the run ends.
  PAYPAL_WALLET_CHECKOUT_MX: {
    country: 'MX',
    kind: 'checkout',
    processors: [processorsConfig.paypalWalletProcessor],
    replicas: 1,
    releaseProcessorsAfterRun: true,
  },
  // Same reason, PayPal with installments (section 4.14). PayPal + cash was rejected
  // (scripts/merchant-pool/lib/rejected.ts). The campaign is ENTP1-T2319's: sharing its merchant
  // saves a webhook slot per run.
  PAYPAL_WALLET_INSTALLMENTS_CHECKOUT_MX: {
    country: 'MX',
    kind: 'checkout',
    processors: [processorsConfig.paypalWalletProcessorWithInstallments],
    replicas: 1,
    releaseProcessorsAfterRun: true,
    setup: { paypalWalletCampaign: 'MXN' },
  },
  // Wave 3 (section 4.15): ~1 replica per 6 specs, each admitted by the canary. Rejected:
  // PayPal ACDC authorize (see scripts/merchant-pool/lib/rejected.ts).
  PAY_U_PROCESSOR_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.payUProcessorAuthorize],
    replicas: 3,
  },
  REDE_AUTHORIZE_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.redeAuthorize],
    replicas: 3,
  },
  STRIPE_PROCESSOR_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.stripeProcessorAuthorize],
    replicas: 3,
  },
  OPEN_PAY_PROCESSOR_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.openPayProcessorAuthorize],
    replicas: 2,
  },
  KUSHKI_PROCESSOR_AUTHORIZE_CL: {
    country: 'CL',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorAuthorizeCL],
    replicas: 2,
  },
  NUVEI_PROCESSOR_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.nuveiProcessorAuthorize],
    replicas: 2,
  },
  TRANSBANK_PROCESSOR_AUTHORIZE_CL: {
    country: 'CL',
    kind: 'plain',
    processors: [processorsConfig.transbankProcessorAuthorize],
    replicas: 2,
  },
  TRANSBANK_PROCESSOR_MALL_AUTHORIZE_CL: {
    country: 'CL',
    kind: 'plain',
    processors: [processorsConfig.transbankProcessorMallAuthorize],
    replicas: 2,
  },
  GETNET_PROCESSOR_AUTHORIZE_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.getnetProcessorAuthorize],
    replicas: 2,
  },
  KUSHKI_PROCESSOR_AUTHORIZE_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorAuthorizePE],
    replicas: 2,
  },
  KUSHKI_PROCESSOR_AUTHORIZE_CO: {
    country: 'CO',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorAuthorizeCO],
    replicas: 2,
  },
  KUSHKI_PROCESSOR_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorPE],
    replicas: 2,
  },
  KUSHKI_PROCESSOR_CO: {
    country: 'CO',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorCO],
    replicas: 2,
  },
  CYBERSOURCE_PROCESSOR_AUTHORIZE_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessorAuthorize_PE],
    replicas: 2,
  },
  KUSHKI_PROCESSOR_CL: {
    country: 'CL',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorCL],
    replicas: 2,
  },
  OPEN_PAY_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.openPayProcessor],
    replicas: 2,
  },
  // Wave 4 (section 4.16): every remaining eligible group with 3+ specs, ~1 replica per 6 specs,
  // each admitted by the canary. Not tried: Mercado Pago and PayPal ACDC purchase (per-merchant
  // velocity, see lib/rejected.ts) and Fiserv (its cert environment answers 400 since 2026-10-07).
  CASH_PROCESSOR_CHECKOUT_MX: {
    country: 'MX',
    kind: 'checkout',
    processors: [processorsConfig.cashProcessor],
    replicas: 2,
  },
  BAZ_PROCESSOR_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.bazProcessorAuthorize_MX],
    replicas: 2,
  },
  CYBERSOURCE_PROCESSOR_PE_DEUNA3_DS_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessor_PE_Deuna3DS],
    replicas: 2,
  },
  PAYMENTEZ_PROCESSOR_EC: {
    country: 'EC',
    kind: 'plain',
    processors: [processorsConfig.paymentezProcessor],
    replicas: 2,
  },
  WORLDPAY_PROCESSOR_PAYCONNECT_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.worldpayProcessorPayconnectAuthorize],
    replicas: 2,
  },
  CIELO_PROCESSOR_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.cieloProcessor],
    replicas: 1,
  },
  DLOCAL_PROCESSOR_CL: {
    country: 'CL',
    kind: 'plain',
    processors: [processorsConfig.dlocalProcessor],
    replicas: 1,
  },
  NUVEI_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.nuveiProcessor],
    replicas: 1,
  },
  PAYMENTEZ_EC_PROCESSOR_EC: {
    country: 'EC',
    kind: 'plain',
    processors: [processorsConfig.paymentezProcessorEC],
    replicas: 1,
  },
  REDE_PROCESSOR_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.redeProcessor],
    replicas: 1,
  },
  UNLIMIT_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.unlimitProcessor],
    replicas: 1,
  },
  CYBERSOURCE_PROCESSOR_AUTHORIZE_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessorAuthorize_BR],
    replicas: 1,
  },
  CYBERSOURCE_PROCESSOR_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessor_PE],
    replicas: 1,
  },
  GETNET_PROCESSOR_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.getnetProcessor],
    replicas: 1,
  },
  KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorWithDEUNAThreeDS],
    replicas: 1,
  },
  KUSHKI_PROCESSOR_EC: {
    country: 'EC',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessorEC],
    replicas: 1,
  },
  PLACE_TO_PAY_PROCESSOR_CO: {
    country: 'CO',
    kind: 'plain',
    processors: [processorsConfig.placeToPayProcessor],
    replicas: 1,
  },
  REDSYS_PROCESSOR_WITH3_DS_ES: {
    country: 'ES',
    kind: 'plain',
    processors: [processorsConfig.redsysProcessorWith3DS],
    replicas: 1,
  },
  UNLIMIT_PROCESSOR_PAYCONNECT_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.unlimitProcessorPayconnect],
    replicas: 1,
  },
  DLOCAL_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.dlocalProcessor],
    replicas: 1,
  },
  BAMBOO_AUTHORIZE_PROCESSOR_UY: {
    country: 'UY',
    kind: 'plain',
    processors: [processorsConfig.bambooAuthorizeProcessorUY],
    replicas: 1,
  },
  CYBERSOURCE_PROCESSOR_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessor_BR],
    replicas: 1,
  },
  PAGBANK_AUTHORIZE_PROCESSOR_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.pagbankAuthorizeProcessor],
    replicas: 1,
  },
  PAY_U_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.payUProcessor],
    replicas: 1,
  },
  REDSYS_PROCESSOR_ES: {
    country: 'ES',
    kind: 'plain',
    processors: [processorsConfig.redsysProcessor],
    replicas: 1,
  },
  UNLIMIT_AUTHORIZE_PROCESSOR_PAYCONNECT_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.unlimitAuthorizeProcessorPayconnect],
    replicas: 1,
  },
  WOMPI_PROCESSOR_AUTHORIZE_CO: {
    country: 'CO',
    kind: 'plain',
    processors: [processorsConfig.wompiProcessorAuthorize],
    replicas: 1,
  },
  WORLDPAY_PROCESSOR_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.worldpayProcessor_BR],
    replicas: 1,
  },
  WORLDPAY_PROCESSOR_GT: {
    country: 'GT',
    kind: 'plain',
    processors: [processorsConfig.worldpayProcessor_GT],
    replicas: 1,
  },
  WORLDPAY_PROCESSOR_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.worldpayProcessor_PE],
    replicas: 1,
  },
  PAYU_PSE_PROCESSOR_CO: {
    country: 'CO',
    kind: 'plain',
    processors: [processorsConfig.payuPseProcessor],
    replicas: 1,
  },
  ADYEN_PROCESSOR_AUTHORIZE_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.adyenProcessorAuthorize],
    replicas: 1,
  },
  BAMBOO_AUTHORIZE_PROCESSOR_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.bambooAuthorizeProcessorPE],
    replicas: 1,
  },
  BAMBOO_PROCESSOR_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.bambooProcessorPE],
    replicas: 1,
  },
  BAZ_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.bazProcessor_MX],
    replicas: 1,
  },
  CASH_PROCESSOR_EC: {
    country: 'EC',
    kind: 'plain',
    processors: [processorsConfig.cashProcessorEC],
    replicas: 1,
  },
  GLOBALPAY_PROCESSOR_CO: {
    country: 'CO',
    kind: 'plain',
    processors: [processorsConfig.globalpayProcessor],
    replicas: 1,
  },
  NIUBIZ_PROCESSOR_AUTHORIZE_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.niubizProcessorAuthorize],
    replicas: 1,
  },
  PAY_U_COLOMBIA_PROCESSOR_CO: {
    country: 'CO',
    kind: 'plain',
    processors: [processorsConfig.payUColombiaProcessor],
    replicas: 1,
  },
  POWERTRANZ_PROCESSOR3DS_HN: {
    country: 'HN',
    kind: 'plain',
    processors: [processorsConfig.powertranzProcessor3dsHN],
    replicas: 1,
  },
  POWERTRANZ_PROCESSOR_AUTHORIZE_HN: {
    country: 'HN',
    kind: 'plain',
    processors: [processorsConfig.powertranzProcessorAuthorizeHN],
    replicas: 1,
  },
  TRANSBANK_PROCESSOR_CL: {
    country: 'CL',
    kind: 'plain',
    processors: [processorsConfig.transbankProcessor],
    replicas: 1,
  },
  TRANSBANK_PROCESSOR_MALL_PURCHASE_CL: {
    country: 'CL',
    kind: 'plain',
    processors: [processorsConfig.transbankProcessorMallPurchase],
    replicas: 1,
  },
  UNLIMIT_AUTHORIZE_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.unlimitAuthorizeProcessor],
    replicas: 1,
  },
  WORLDPAY_PROCESSOR_PAYCONNECT_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.worldpayProcessorPayconnect],
    replicas: 1,
  },
  AMEX_PROCESSOR_CHECKOUT_MX: {
    country: 'MX',
    kind: 'checkout',
    processors: [processorsConfig.amexProcessor],
    replicas: 1,
  },
  // Wave 5 (section 4.17): specs that only create orders or payment links, on a merchant without
  // processors. Their order ids are random, so they never collide on a shared merchant.
  NO_PROCESSOR_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [],
    replicas: 3,
  },
  PAYU_EFECTY_PROCESSOR_CHECKOUT_CO: {
    country: 'CO',
    kind: 'checkout',
    processors: [processorsConfig.payuEfectyProcessor],
    replicas: 1,
  },
  PAYU_PSE_PROCESSOR_CHECKOUT_CO: {
    country: 'CO',
    kind: 'checkout',
    processors: [processorsConfig.payuPseProcessor],
    replicas: 1,
  },
  KUESKI_PROCESSOR_CHECKOUT_MX: {
    country: 'MX',
    kind: 'checkout',
    processors: [processorsConfig.kueskiProcessor],
    replicas: 1,
  },
  // Wave 5, recipes (section 4.19): the entry applies the merchant configuration these specs used
  // to apply themselves (MerchantSpec.setup), so they can share it.
  NUPAY_PROCESSOR_NETWORK_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.nupayProcessor],
    setup: { network: true },
    replicas: 1,
  },
  CYBERSOURCE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessor_PE],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  CYBERSOURCE_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessorAuthorize_BR],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  CYBERSOURCE_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessorAuthorize_PE],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  CYBERSOURCE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.cybersourceProcessor_BR],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  DLOCAL_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_PE: {
    country: 'PE',
    kind: 'plain',
    processors: [processorsConfig.dlocalProcessorPE],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  STRIPE_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.stripeProcessorAuthorize],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  STRIPE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.stripeProcessor],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  WORLDPAY_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_BR: {
    country: 'BR',
    kind: 'plain',
    processors: [processorsConfig.worldpayProcessorAuthorize_BR],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
  KUSHKI_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_MX: {
    country: 'MX',
    kind: 'plain',
    processors: [processorsConfig.kushkiProcessor],
    setup: { checkoutConfigVault: true, network: true },
    replicas: 1,
  },
} as const satisfies Record<string, MerchantSpec>;

export type MerchantPoolKey = keyof typeof MERCHANT_POOL;

export function isMerchantPoolKey(key: string): key is MerchantPoolKey {
  return Object.prototype.hasOwnProperty.call(MERCHANT_POOL, key);
}
