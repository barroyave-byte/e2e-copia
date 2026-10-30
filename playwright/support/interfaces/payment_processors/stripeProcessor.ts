import { BaseProcessor } from './baseProcessor';
import { ConnectionsAvailable } from '../connectionsAvailable';

interface StripeProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  multiple_partial_capture?: boolean;
}

const stripeProcessor: StripeProcessor = {
  name: 'STRIPE_DIRECT',
  payment_processor_id: 50,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  public_api_key:
    'pk_test_51KanPjHzvAJD6fk5wekkuEqfrT0qyzDrNw9Rlw2Nu4PBqlS8Vt1FtTgVDmXZxZ0eM4ccxBarVwUa5v0TICjSOyei00HmiJm3my',
  private_api_key:
    'sk_test_51KanPjHzvAJD6fk5iA6c7M6Hv9pHZZirj5kzEUzGW7x5Xh4bTXIbs9kxOxdawiOQxiDoySOiRDOmtyqAm3loCQmZ001dBHZhy0',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const stripeProcessorBR: StripeProcessor = {
  name: 'STRIPE_DIRECT',
  payment_processor_id: 50,
  enabled: true,
  currency_iso3: 'BRL',
  country_iso: 'BR',
  public_api_key:
    'pk_test_51KanPjHzvAJD6fk5wekkuEqfrT0qyzDrNw9Rlw2Nu4PBqlS8Vt1FtTgVDmXZxZ0eM4ccxBarVwUa5v0TICjSOyei00HmiJm3my',
  private_api_key:
    'sk_test_51KanPjHzvAJD6fk5iA6c7M6Hv9pHZZirj5kzEUzGW7x5Xh4bTXIbs9kxOxdawiOQxiDoySOiRDOmtyqAm3loCQmZ001dBHZhy0',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const stripeProcessorEC: StripeProcessor = {
  name: 'STRIPE_DIRECT',
  payment_processor_id: 50,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'EC',
  public_api_key:
    'pk_test_51MleLPAhdjP1LkjdaeUFXg1Zgqh3q5r6UsEM5OZT7wGZEqMTym8LHGJx1zVRunj1nocYOYVsExxav6IPnfsP9Vqk00PHeO37eI',
  private_api_key:
    'sk_test_51KanPjHzvAJD6fk5iA6c7M6Hv9pHZZirj5kzEUzGW7x5Xh4bTXIbs9kxOxdawiOQxiDoySOiRDOmtyqAm3loCQmZ001dBHZhy0',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const stripeDirectProcessor: StripeProcessor = {
  ...stripeProcessor,
  name: ConnectionsAvailable.stripeDirect,
};

const stripe3dsProcessor: StripeProcessor = {
  ...stripeProcessor,
  enable_3ds_authentication: true,
};

const stripeProcessorAuthorize: StripeProcessor = {
  ...stripeProcessor,
  automatic_capture: false,
  country_iso: 'MX',
};

const stripeProcessorMultiCapture: StripeProcessor = {
  ...stripeProcessorAuthorize,
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 1,
  },
};

const stripeProcessorAuthorize3DS: StripeProcessor = {
  ...stripeProcessor,
  automatic_capture: false,
  enable_3ds_authentication: true,
  country_iso: 'MX',
};

export {
  stripeProcessor,
  stripe3dsProcessor,
  stripeProcessorAuthorize,
  stripeProcessorAuthorize3DS,
  stripeProcessorBR,
  stripeProcessorEC,
  stripeDirectProcessor,
  stripeProcessorMultiCapture,
};
