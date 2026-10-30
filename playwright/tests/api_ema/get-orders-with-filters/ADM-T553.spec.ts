import { test } from '@support/fixtures';

import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';
import { expect } from '@support/fixtures';
import { retryApiCall } from '@support/utils/retries';
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
    airline_information: {
      booking_items: [
        {
          pnr: 'ABC123',
          ticket_number: '0123456789123',
          e_ticket: true,
          airline_3_digit_code: '123',
          airline_iata_designator: 'AA',
          ancillaries: [],
          ticketing_travel_agency: {
            iata_code: 'XYZ789',
            name: 'Global Travel Agency',
          },
          passenger: {
            user_id: '123456-abc-7890-def-1234567890',
            first_name: 'John',
            middle_name: 'Michael',
            last_name: 'Doe',
            document_type: 'Passport',
            identity_document_number: 'A123456789',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            frequent_flyer_code: 'FF12345',
            title: 'Mr',
            date_of_birth: '1980-02-16',
            country_code: '',
          },
          legs: [
            {
              carrier_code: 'AA',
              carrier_name: 'American Airlines',
              flight_number: 'AA123',
              seat_location: '12A',
              fare_basis_code: 'Y',
              stopover_code: 'NONE',
              service_class: '',
              sub_total_amount: 0,
              tax_amount: 0,
              total_amount: 0,
            },
          ],
        },
      ],
    },
  },
  order_type: 'AIRLINE_ORDER',
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
    },
  },
  anti_fraud_info: {
    device: {
      id: crypto.randomUUID(),
      fingerprint: '',
      fingerprint_provider: '',
      name: '',
    },
  },
};

let orderToken = '';
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@ADM-T553 [Orders] - Ticket number search',
    { tag: ['@team_platform'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tokenize an order successfully', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          body_sent_order as unknown as TokenizeOrderRequestData
        );
        orderToken = tokenizeResponse.data.token;
        expect(orderToken).not.toBeUndefined();

        const getOrderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(getOrderResponse.status).toBe(200);
        expect(getOrderResponse.data.order.airline_information).not.toBeUndefined();
        expect(getOrderResponse.data.order.airline_information).not.toBeNull();
      });
      await test.step('User purchase an order successfully', async () => {
        purchaseRequest.order_token = orderToken;
        const purchase = (
          await paymentService.purchaseV2(privateKey, userAuthToken, purchaseRequest)
        ).data as any;
        expect(purchase).not.toBeUndefined();
        expect(purchase).not.toBeNull();
        expect(purchase.order.airline_information.booking_items).toHaveLength(1);
      });
      await test.step('User get orders with filters successfully', async () => {
        const resultGetOrders = await retryApiCall(
          () => apiCallNewman.getOrdersWithFilters('ticket_number', '0123456789123', privateKey),
          (result) => result && result.order_token === orderToken,
          5,
          2000
        );

        expect(resultGetOrders).not.toBeUndefined();
        expect(resultGetOrders).not.toBeNull();
        expect(resultGetOrders.order_token).toBe(orderToken);
      });
    }
  );
});
