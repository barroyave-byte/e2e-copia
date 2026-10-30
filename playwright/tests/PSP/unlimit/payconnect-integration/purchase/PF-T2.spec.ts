import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test } from '@support/fixtures';
import * as crypto from 'crypto';

const order_id = crypto.randomUUID();

const body_sent_purchase_v2 = {
  payer_info: {
    save_user_info: false,
    email: 'jhondoe@deuna.com',
  },
  payment_source: {
    method_type: 'credit_card',
    processor: 'UNLIMIT',
    card_info: {
      expiry_month: '11',
      expiry_year: '2029',
      card_number: '4111111111111111',
      card_holder: 'John Doe',
      card_holder_dni: '1234567891',
      zip: '12345',
      city: 'Ibarra',
      address1: 'Avenida Mariano Acosta & Obispo Alejandro Pasquel Monge, Ibarra, Ecuador',
      state: 'Quito',
      phone: '+59123456789',
      country: 'Ecuador',
      card_cvv: '123',
    },
  },
  billing_address: {
    country: 'ECU',
    address_type: 'home',
    is_default: false,
    id: 1896,
    user_id: '{{user.id}}',
    first_name: 'Jhon',
    last_name: 'Doe',
    phone: '+5999999999',
    identity_document: '1234567891',
    identity_document_type: 'DNI',
    lat: -0.100032,
    lng: -78.46956,
    address1: 'Av. Eloy Alfaro 14, Quito 170515, Ecuador',
    address2: 'Av. Eloy Alfaro 14, Quito 170515, Ecuador',
    city: 'Quito',
    zipcode: '170515',
    state_name: 'Quito',
    additional_description: 'No tocar timbre',
  },
  shipping_address: {
    is_default: false,
  },
  anti_fraud_info: {
    browser_details: {
      screen_height: 101,
      screen_width: 303,
      color_depth: 20,
      java_enabled: true,
      java_script_enabled: true,
      language: 'en-US',
      time_zone_offset: 289,
      accept_header: '*/*',
    },
    secure_authentication: {
      eci: 'ECI123',
      cavv: 'CAVV123',
      xid: 'XID123',
      flow_type: 'challenge',
    },
  },
  store_code: 'all',
  amount: 50000,
  order: {
    browser_details: {
      screen_width: 350,
      screen_height: 500,
    },
    order_id,
    store_code: 'all',
    currency: 'MXN',
    tax_amount: 0,
    display_tax_amount: 'MXN     19.00',
    shipping_amount: 0,
    display_shipping_amount: 'MXN0,00',
    items_total_amount: 1900,
    display_items_total_amount: 'MXN     19.00',
    sub_total: 1900,
    display_sub_total: 'MXN0',
    total_amount: 1900,
    display_total_amount: 'MXN     19.00',
    items: [
      {
        name: 'Polo Shirt',
        image_url: 'https://cdn.stg.deuna.io/explore-deuna/assets/shirt.png',
        quantity: 1,
        price: 1900,
        slug: 'polo-shirt',
        displayPrice: '$ 19.00',
        productTitle: 'Camisa Polo',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod bibendum laoreet.',
        brand: 'Generic Brand',
        category: 'Electronics',
        collections: ['Electronics', 'Headphones'],
        color: 'Black',
        details_url: '',
        id: '789456123',
        item_details: [],
        isbn: '123-456-789',
        manufacturer: 'Generic Manufacturer',
        options: 'string option',
        size: '',
        sku: 'HEADPH001',
        tax_amount: {
          original_amount: 0,
          discount_amount: 0,
          display_original_amount: '',
          amount: 0,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 0.00',
        },
        taxable: true,
        total_amount: {
          amount: 1900,
          discount_amount: 0,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 19.00',
          display_original_amount: '$ 19.00',
          original_amount: 0,
        },
        type: 'Electronics',
        unit_price: {
          original_amount: 1900,
          discount_amount: 0,
          display_original_amount: '',
          amount: 1900,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 19.00',
        },
        uom: 'Piece',
        upc: 'string',
        weight: {
          weight: 1,
          unit: 'kg',
        },
      },
    ],
    discounts: [],
    shipping_address: {
      first_name: 'John',
      last_name: 'Doe',
      phone: '99999999999',
      identity_document: 'XAXX010101000',
      lat: -41.743,
      lng: 11.987,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Ciudad de México',
      zipcode: '11510',
      state_name: 'Cundinamarca',
      country_code: 'MX',
      additional_description: '',
      address_type: 'home',
      email: 'john@doe.com',
      state_code: '',
      country: 'MX',
    },
    shipping_options: {
      type: 'delivery',
      details: {
        store_name: '',
        address: '',
        address_coordinates: {
          lat: 0,
          lng: 0,
        },
        contact: {
          name: '',
          phone: '',
        },
        additional_details: {},
      },
    },
    user_instructions: 'This item is a gift.',
    status: '',
    redirect_url: '',
    total_discount: 0,
    display_total_discount: '',
    shipping_methods: [],
    timezone: '',
    scheduled_at: '',
    billing_address: {
      first_name: 'John',
      last_name: 'Doe',
      phone: '99999999999',
      identity_document: 'XAXX010101000',
      lat: -41.743,
      lng: 11.987,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Ciudad de México',
      zipcode: '11510',
      state_name: '',
      country_code: 'MX',
      additional_description: '',
      address_type: '',
      email: 'john@doe.com',
      state_code: '',
      country: 'MX',
    },
    payment_link: '',
    display_total_tax_amount: '',
    total_tax_amount: 0,
  },
  order_type: 'DEUNA_CHECKOUT',
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('UNLIMIT_PROCESSOR_PAYCONNECT_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PF-T2 Purchase V2 EMA',
    {
      tag: [
        '@payments_integration',
        '@team_payment_integration',
        '@team_payconnect',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page, paymentService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        await paymentService.purchaseV2(privateKey, userAuthToken, body_sent_purchase_v2 as any);
      });
    }
  );
});
