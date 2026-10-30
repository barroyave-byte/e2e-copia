import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import type { TokenizeOrderRequestData } from '@support/http/models/order';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let transactionId: string;
let responsePurchase: any;

const order_id = crypto.randomUUID();

const body_sent = {
  order_type: 'AIRLINE_ORDER',
  order: {
    payer_info: {
      email: 'audrey.hepburn-1720721058131@superstar.com',
    },
    currency: 'COP',
    shipping_address: {
      id: 0,
      address_type: 'u',
      is_default: false,
      created_at: '0001-01-01T00:00:00Z',
      updated_at: '0001-01-01T00:00:00Z',
      address1: 'test address',
      address2: '',
      first_name: 'qa test',
      last_name: 'automation',
      phone: '3001234567',
      identity_document: '12345678',
      lat: 4.711,
      lng: -74.0721,
      city: 'Bogotá',
      zipcode: '110111',
      state_name: 'Cundinamarca',
      country: 'CO',
      country_code: 'CO',
    },
    items: [
      {
        unit_price: {
          currency_symbol: '$',
        },
        tax_amount: {
          currency: 'COP',
          currency_symbol: '$',
        },
        taxable: false,
        id: 'IT001',
        name: 'Prueba',
        description: 'Description',
        quantity: 1,
      },
    ],
    discounts: [
      {
        free_shipping: {
          is_free_shipping: false,
        },
      },
    ],
    billing_address: {
      country: 'CO',
      address_type: 'home',
      is_default: false,
    },
    shipping_options: {
      type: 'delivery',
    },
    order_id: order_id,
    timezone: 'America/Mexico_City',
    sub_total: 10000,
    total_amount: 10000,
    total_tax_amount: 0,
    store_code: 'all',
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
};

test.describe('@regression Pays with Placetopay CO and Airline Order should fail', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('PLACE_TO_PAY_PROCESSOR_CO');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      body_sent as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PI-T1722 order with airline information denied - Colombia',
    {
      tag: ['@payments_integration', '@preprod', '@purchase', '@team_payment_integration', '@api'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CO',
            processorName: processorsConfig.placeToPayProcessor.name,
            card: creditCardData.placetopayVisaDenied,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('The transaction is denied', async () => {
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });
    }
  );
});
