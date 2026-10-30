import * as crypto from 'crypto';
import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect } from '@support/fixtures';
import DateTime from '@support/utils/datetime';
import * as creditCard from '@support/interfaces/credit_cards';

const order_id = crypto.randomUUID();

const body_sent_purchase_v2 = {
  order_type: 'AIRLINE_ORDER',
  payer_info: {
    email: 'john@doe.com',
    card_holder_dni: '12345678',
  },
  payment_source: {
    method_type: 'credit_card',
    card_info: {
      expiry_month: '12',
      expiry_year: '2025',
      card_holder: 'John Doe',
      card_holder_dni: '12345678',
      card_number: creditCard.kushkiVisaSuccessfull.number,
      card_cvv: '123',
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      zip: '11510',
      city: 'Ciudad de México',
      phone: '',
      is_single_use: false,
    },
  },
  order: {
    order_id,
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
    expires_at: DateTime.now().addMinutes(20).toJSON(),
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
      phone: '21988939196',
      identity_document: '12345678',
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
      identity_document_type: 'DNI',
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
    metadata: {},
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
      phone: '21988939196',
      identity_document: '12345678',
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
      identity_document_type: 'DNI',
      email: 'john@doe.com',
      state_code: '',
      country: 'MX',
    },
    payment_link: '',
    display_total_tax_amount: '',
    total_tax_amount: 0,
    airline_information: {
      booking_reference: 'brx_123',
      charge_type: 'FIRST_CLASS',
      invoice_code: 'ivx_123',
      itinerary: {
        routes: [
          {
            carrier_ticket_details: {
              carrier_code: '123',
              conjunction_ticket_number: '123',
              exchange_ticket_number: '123',
              coupon_number: '123',
              endorsements_restrictions: '123',
            },
            flight_details: {
              flight_number: 'flt_123',
              travel_class: 'ECONOMY',
              seat_location: '24F',
              origin: {
                iata_code: 'IATA_123',
                date: '1994-01-01',
                time: '1900',
                tax: 20000,
              },
              destination: {
                iata_code: 'IATA_123',
                date: '1994-01-01',
                time: '1900',
                tax: 20000,
              },
            },
            financial_details: {
              tax: 100000,
              fee: 200000,
              fare: 300000,
              fare_basis: 400000,
            },
          },
        ],
        trip_target: {
          departure_place: 'London',
          departure_date: '1994-01-01',
          arrival_place: 'New_York',
          arrival_date: '1994-01-01',
        },
        stopover_permitted: false,
        number_in_party: 0,
        round_trip: false,
      },
      passengers: [
        {
          user_id: 'abc123',
          name: 'abc123',
          first_name: 'abc123',
          last_name: 'abc123',
          middle_name: 'abc123',
          document_type: 'abc123',
          document: 'abc123',
          email: 'abc123',
          phone: 'abc123',
          frequent_flyer_code: 'abc123',
          title: 'abc123',
        },
      ],
      plan_number: 'plan_123',
      ticket: {
        conjunction_ticket_indicator: false,
        e_ticket: true,
        exchanged_ticket_number: 'abc123',
        issuer: {
          address: 'abc123',
          carrier_code: 'abc123',
          carrier_name: 'abc123',
          city: 'abc123',
          state: 'abc123',
          zip_code: 'abc123',
          country: 'abc123',
          date: 'abc123',
          travel_agent_code: 'abc123',
          travel_agent_name: 'abc123',
        },
        restricted: false,
        taxes_and_fees: [
          {
            amount: 10000,
            type: 'abc123',
          },
        ],
        ticket_number: '123',
        check_digit: 12,
        financial_details: {
          tax: 10000,
          fee: 10000,
          fare: 10000,
          fare_basis: 10000,
        },
        total_fare: 10000,
        total_fees: 10000,
        total_taxes: 10000,
      },
      transaction_type: 'trx_123',
    },
  },
  anti_fraud_info: {
    device: {
      id: crypto.randomUUID(),
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PLAT-T1578 |Should purchase a valid order with future expiration date',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ paymentService }) => {
      await test.step('User tries to purchase an order with future expiration date', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        // Purchase V2
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_sent_purchase_v2 as any)
        ).data as any;

        const orderToken = purchase_v2?.order_token ?? purchase_v2?.order?.order_token;

        expect(orderToken).toBeDefined();
      });
    }
  );
});
