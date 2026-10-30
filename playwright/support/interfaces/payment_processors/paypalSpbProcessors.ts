import { BaseProcessor } from './baseProcessor';

interface PaypalSpbProcessorExpirationTimes {
  pending: number;
}

interface PaypalSpbProcessor extends BaseProcessor {
  priority: number;
  expiration_times: PaypalSpbProcessorExpirationTimes;
}

const paypalSpbProcessor = {
  enabled: true,
  country_iso: 'US',
  currency_iso3: 'USD',
  private_api_key:
    'EJiEF2hTL1umuybwqmLVOs9Z5ny8uhj3I46oOXu6nitI7rqANj6hBbljbEbIjtKFwro6uekWw46lMwWu',
  external_merchant_id: 'BXV9KKQ2QNGHJ',
  priority: 1,
  expiration_times: {
    pending: 10,
  },
  extra_params: {
    client_id: 'ASgB_WFZofKrrOSDYEE3r_BJVFMCxzBAvEFaS4BYRl6hpA1LaWeQRif26mDnoShJ0EyWTjLWRjBTGJrs',
    add_shipping_address: false,
  },
};

const paypalPayLaterProcessor: PaypalSpbProcessor = {
  ...paypalSpbProcessor,
  name: 'paypal_pay_later',
  payment_processor_id: 149,
};

const venmoProcessor: PaypalSpbProcessor = {
  ...paypalSpbProcessor,
  name: 'venmo',
  payment_processor_id: 165,
};

export { paypalPayLaterProcessor, venmoProcessor };
