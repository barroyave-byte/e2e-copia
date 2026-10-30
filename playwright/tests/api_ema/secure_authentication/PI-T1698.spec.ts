import { test } from '@support/fixtures';

import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';
import { expect } from '@support/fixtures';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';

const order_id = crypto.randomUUID();

const body_sent_order = {
  order: {
    order_id: order_id,
    store_code: 'all',
    currency: 'MXN',
    tax_amount: 0,
    display_tax_amount: '$     44.33',
    shipping_amount: 0,
    display_shipping_amount: 'MXN0,00',
    items_total_amount: 4433,
    display_items_total_amount: '$     44.33',
    sub_total: 4433,
    display_sub_total: 'MXN0',
    total_amount: 4433,
    display_total_amount: '$     44.33',
    items: [
      {
        name: 'Polo Shirt',
        image_url: 'https://cdn.stg.deuna.io/explore-deuna/assets/shirt.png',
        quantity: 1,
        price: 4433,
        slug: 'polo-shirt',
        displayPrice: '$ 44.33',
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
          amount: 4433,
          discount_amount: 0,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 44.33',
          display_original_amount: '$ 44.33',
          original_amount: 0,
        },
        type: 'Electronics',
        unit_price: {
          original_amount: 4433,
          discount_amount: 0,
          display_original_amount: '',
          amount: 4433,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 44.33',
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
      phone: '+5221988939196',
      identity_document: '12345678',
      lat: -41.743,
      lng: 11.987,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Ciudad de México',
      zipcode: '11510',
      state_name: 'Cundinamarca',
      country_code: 'UY',
      additional_description: '',
      address_type: 'home',
      identity_document_type: 'DNI',
      email: 'john@doe.com',
      state_code: '',
      country: 'UY',
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
      phone: '+5221988939196',
      identity_document: '12345678',
      lat: -41.743,
      lng: 11.987,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Ciudad de México',
      zipcode: '11510',
      state_name: '',
      country_code: 'UY',
      additional_description: '',
      address_type: '',
      identity_document_type: 'DNI',
      email: 'john@doe.com',
      state_code: '',
      country: 'UY',
    },
    payment_link: '',
    display_total_tax_amount: '',
    total_tax_amount: 0,
  },
  order_type: 'DEUNA_CHECKOUT',
  shipping_rate: {
    service_name: '',
    description: '',
    cost: 0,
    tax_amount: 0,
    display_tax_amount: '',
    reference: '',
    estimated_delivery_date: '',
    tax_code: '',
  },
};

const purchaseRequest: PurchaseRequestV2 = {
  order_token: '',
  payer_info: { email: 'john@doe.com' },
  payment_source: {
    method_type: MethodType.CREDIT_CARD,
    processor: 'dlocal',
    card_info: {
      expiry_month: '12',
      expiry_year: '2030',
      card_holder: 'John Doe',
      card_holder_dni: '12345678',
      card_number: '4111111111111111',
      card_cvv: '123',
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      zip: '11510',
      city: 'Ciudad de México',
      phone: '',
      secure_authentication: {
        eci: 'ECI123',
        cavv: 'CAVV123',
        xid: 'XID123',
        flow_type: 'challenge',
      },
    } as any,
  },
  anti_fraud_info: {
    device: {
      id: crypto.randomUUID(),
      fingerprint: '',
      fingerprint_provider: '',
      name: '',
    },
    secure_authentication: {
      eci: 'ECI123',
      cavv: '***V123',
      xid: '**D123',
      flow_type: 'challenge',
    },
  } as any,
};

let orderToken = '';
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PI-T1698 Purchase V2 EMA Secure Authentication',
    { tag: ['@team_platform'] },
    async ({ page, emaService, paymentService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          body_sent_order as unknown as TokenizeOrderRequestData
        );
        orderToken = tokenizeResponse.data.token;
        expect(orderToken).not.toBeUndefined();

        purchaseRequest.order_token = orderToken;
        await paymentService.purchaseV2(privateKey, userAuthToken, purchaseRequest);

        await page.waitForTimeout(2000);
        const getOrderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(getOrderResponse.status).toBe(200);
        const secureAuth = (getOrderResponse.data.order.payment?.data as any)
          ?.secure_authentication;
        expect(secureAuth).not.toBeUndefined();
        expect(secureAuth).not.toBeNull();
        expect(secureAuth.eci).toEqual('ECI123');
        expect(secureAuth.cavv).toEqual('***V123');
        expect(secureAuth.xid).toEqual('**D123');
        expect(secureAuth.flow_type).toEqual('challenge');
      });
    }
  );
});
