import { randomUUID } from 'crypto';
import { TokenizeOrderRequestData } from '@support/http/models/order';
import { DeunanowOrderBuilder } from '@support/http/testData/ema/DEUNANOW';

/**
 * The standard PE DEUNA_NOW body, charged in USD and with a billing document type, and a
 * unique `order_id` per call.
 *
 * The Bamboo sandbox merchant rejects PEN (`PR004 Invalid Currency parameter`), and without
 * `billing_address.identity_document_type` the payment service declines the authorization
 * with DP-7101 before sending any request to Bamboo.
 */
export function orderForBambooPeru(): TokenizeOrderRequestData {
  const orderData = DeunanowOrderBuilder.createOrder('PE', {
    order_id: `bamboo-pe-${randomUUID()}`,
  });

  orderData.order.currency = 'USD';
  orderData.order.billing_address = {
    ...orderData.order.billing_address,
    identity_document_type: 'DNI',
  };
  return orderData;
}
