import * as apiCallNewman from '@support/newman/apiCallNewman';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const order_id = crypto.randomUUID();

const body_sent = {
  order_type: 'AIRLINE_ORDER',
  order: {
    payer_info: {
      email: 'audrey.hepburn-1720721058131@superstar.com',
    },
    currency: 'COP',
    shipping_address: {
      first_name: 'Audrey',
      last_name: 'Hepburn',
      phone: '5551234567',
      identity_document: '20304050607',
      address1: 'Calle 93 # 11-24',
      address2: 'Apto 501',
      city: 'Bogotá',
      state_name: 'Bogotá D.C.',
      zipcode: '110221',
      country: 'CO',
      country_code: 'CO',
      address_type: 'home',
      is_default: false,
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
      country: 'COP',
      address_type: 'home',
      is_default: false,
    },
    shipping_options: {
      type: 'delivery',
    },
    order_id: order_id,
    timezone: 'America/Mexico_City',
    sub_total: 1000000,
    total_amount: 1000000,
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
              tax: 10000000,
              fee: 20000000,
              fare: 30000000,
              fare_basis: 40000000,
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
          tax: 1000000,
          fee: 1000000,
          fare: 1000000,
          fare_basis: 1000000,
        },
        total_fare: 1000000,
        total_fees: 1000000,
        total_taxes: 1000000,
      },
      transaction_type: 'trx_123',
    },
  },
};

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe('@regression Pays with Placetopay CO and Airline Order', () => {
  let merchantId: string;
  let merchantToken: string;
  let orderToken: string;
  let merchantName: string;
  let privateKey: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchantCheckout.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      body_sent as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenized.data.token;
    expect(orderToken).not.toBeUndefined();
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.placetopayProcessorForVisa,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1721 order with airline information successfully - Colombia',
    { tag: ['@payments_integration', '@preprod', '@purchase', '@team_payment_integration'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CO',
            processorName: processorsConfig.placetopayProcessorForVisa.name,
            card: creditCardData.placetopayVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, status);
      });
    }
  );
});
