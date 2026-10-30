import { randomUUID } from 'crypto';
import { ShippingOptionsRequest, TokenizeOrderRequestData } from '@support/http/models/order';
import { DeunanowOrderBuilder } from '@support/http/testData/ema/DEUNANOW';

/**
 * Builders for DEUNA_NOW orders whose `shipping_options.details.contact.phone` is the value
 * under test, in either of the JSON forms the tokenize endpoint accepts.
 */

export const SHIPPING_CONTACT_NAME = 'Sergio';
export const SHIPPING_CONTACT_STORE_NAME = 'Texas Comite';

/** The same phone number as a JSON number and as a JSON string. */
export const CONTACT_PHONE_NUMERIC = 593983092404;
export const CONTACT_PHONE_AS_STRING = '593983092404';

/**
 * A phone at the E.164 maximum of 15 digits, where an int64 -> float64 -> string
 * re-serialisation starts losing precision.
 */
export const CONTACT_PHONE_LONG_NUMERIC = 593983092404123;
export const CONTACT_PHONE_LONG_AS_STRING = '593983092404123';

/**
 * Delivery shipping options carrying only `contact` and `store_name` under `details`.
 */
export function shippingOptionsWithContactPhone(phone: string | number): ShippingOptionsRequest {
  return {
    type: 'delivery',
    details: {
      store_name: SHIPPING_CONTACT_STORE_NAME,
      contact: { name: SHIPPING_CONTACT_NAME, phone },
    },
  };
}

/**
 * The standard MX DEUNA_NOW body with only `shipping_options` replaced by the given contact
 * phone, and a unique `order_id` per call.
 */
export function orderWithShippingContactPhone(phone: string | number): TokenizeOrderRequestData {
  const orderData = DeunanowOrderBuilder.createOrder('MX', {
    order_id: `shipping-contact-phone-${randomUUID()}`,
    store_code: 'all',
  });

  orderData.order.shipping_options = shippingOptionsWithContactPhone(phone);
  return orderData;
}
