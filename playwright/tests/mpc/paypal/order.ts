import { TokenizeOrderRequestData, Address, Item } from '@support/http/models/order';

export function OrderRequestPaypal(userEmail: string): TokenizeOrderRequestData {
  const order_id = crypto.randomUUID();
  const orderRequest: TokenizeOrderRequestData = {
    order_type: 'DEUNA_CHECKOUT',
    order: {
      order_id: order_id,
      store_code: 'all',
      currency: 'MXN',
      items_total_amount: 13000,
      sub_total: 13000,
      total_tax_amount: 0,
      total_amount: 13000,
      discounts: [],
      items: [],
      callback_urls: {
        on_success: 'https://www.google.com',
        on_pending: 'https://www.google.com',
      },
    },
  };

  var items: Item[] = [];
  const item1: Item = {
    name: 'Event Ticket',
    image_url: 'https://cdn.stg.deuna.io/explore-deuna/assets/ticketevent.png',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod bibendum laoreet.',
    brand: 'Eventos Inc.',
    category: 'Eventos',
    color: 'None',
    id: '789012345',
    options: 'string option',
    sku: 'EVENT001',
    type: 'Evento',
    uom: 'Entrada',
    upc: 'string',
    weight: {
      weight: 1,
      unit: 'kg',
    },
    quantity: 1,
    tax_amount: {
      currency: 'MXN',
      currency_symbol: '$',
      amount: 0,
      display_amount: '',
    },
    taxable: true,
    total_amount: {
      currency: 'MXN',
      currency_symbol: '$',
      amount: 0,
      original_amount: 0,
      display_amount: '',
      display_original_amount: '',
      total_discount: 0,
      display_total_discount: '',
    },
    unit_price: {
      currency: 'MXN',
      currency_symbol: '$',
      amount: 0,
      display_amount: '',
    },
    isbn: '',
    manufacturer: '',
    size: '',
    details_url: '',
    discounts: [],
    included_in_subscription: false,
  };
  items.push(item1);
  orderRequest.order.items = items;

  const shippingAddress: Address = {
    first_name: 'John',
    last_name: 'Doe',
    identity_document: '12345678',
    lat: -41.743,
    lng: 11.987,
    address1: 'José Luis Lagrange 456, Colonia Polanco',
    address2: 'José Luis Lagrange 456, Colonia Polanco',
    zipcode: '11510',
    state_name: 'Miguel Hidalgo',
    address_type: 'home',
    identity_document_type: 'RFC',
    email: userEmail,
    identification: '',
    id: 0,
    user_id: '',
    phone: '',
    city: '',
    country: '',
    country_code: '',
    additional_description: '',
    is_default: false,
    created_at: '',
    updated_at: '',
  };
  orderRequest.order.shipping_address = shippingAddress;

  const billingAddress: Address = {
    first_name: 'John',
    last_name: 'Doe',
    identity_document: '12345678',
    lat: -41.743,
    lng: 11.987,
    address1: 'José Luis Lagrange 456, Colonia Polanco',
    address2: 'José Luis Lagrange 456, Colonia Polanco',
    zipcode: '11510',
    state_name: 'Miguel Hidalgo',
    address_type: 'home',
    identity_document_type: 'RFC',
    identification: '',
    id: 0,
    user_id: '',
    phone: '',
    city: '',
    country: '',
    country_code: '',
    additional_description: '',
    is_default: false,
    created_at: '',
    updated_at: '',
    email: userEmail,
  };
  orderRequest.order.billing_address = billingAddress;

  return orderRequest;
}
