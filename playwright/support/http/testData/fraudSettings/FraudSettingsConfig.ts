import { FraudSettingsData } from '@support/http/models/fraudSettings/fraudSettings';

/**
 * Default fraud-settings payloads per anti-fraud provider.
 *
 *   PUT /merchants/{merchantId}/fraud-settings
 *   { "providers": { "<provider>": { ...provider-specific params } } }
 *
 * Each provider carries its OWN parameters (see FraudProviderParamsMap):
 * Stripe needs `apiKey`, Cybersource needs `orgId`+`merchantId`, Mercado Pago
 * needs none, etc. Adjust the credentials here per environment as needed.
 */

// Stripe publishable (test) key — same key used by the STRIPE_DIRECT processor fixture.
export const STRIPE_FRAUD_SETTINGS: FraudSettingsData = {
  providers: {
    STRIPE: {
      apiKey:
        'pk_test_51KanPjHzvAJD6fk5wekkuEqfrT0qyzDrNw9Rlw2Nu4PBqlS8Vt1FtTgVDmXZxZ0eM4ccxBarVwUa5v0TICjSOyei00HmiJm3my',
    },
  },
};

// Mercado Pago requires no additional configuration parameters.
export const MERCADOPAGO_FRAUD_SETTINGS: FraudSettingsData = {
  providers: {
    MERCADOPAGO: {},
  },
};
