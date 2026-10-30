import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus, retryGetFraudProcessor } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as crypto from 'crypto';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let orderId: string;
let merchantName: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();
const giftCardAmount1 = 15000;
const giftCardAmount2 = 34200;
const orderBody = {
  order_type: 'AIRLINE_ORDER',
  order: {
    order_id: crypto.randomUUID(),
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    tax_amount: 30000,
    total_tax_amount: 120076,
    shipping_amount: 30000,
    items_total_amount: 30000,
    sub_total: 250366,
    processor_name: 'all',
    total_amount: 370442,
    store_code: 'all',
    payer_info: {
      date_of_birth: '2000-04-13T00:00:00.000Z',
    },
    airlineInformation: {
      bookingItems: [
        {
          pnr: 'KFA123',
          ticket_number: '100458790',
          e_ticket: true,
          ticketing_travel_agency: {
            iata_code: 'TRA123',
            name: 'Expedia',
          },
          passenger: {
            user_id: crypto.randomUUID(),
            first_name: 'Gustavo',
            middle_name: 'Eduardo',
            last_name: 'Mena',
            date_of_birth: '2000-01-01',
            country_code: 'EC',
            document_type: 'DNI',
            document: '07277747',
            email: 'gmena@deuna.com',
            phone: '+14155688537',
            frequent_flyer_code: '51434591833',
            title: 'Mr',
          },
          legs: [
            {
              origin: {
                iata_code: 'SEA',
                date: '2024-02-01',
                time: '12:00',
              },
              destination: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '18:00',
              },
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI899',
              seat_location: '3C',
              fare_basis_code: 'Business',
            },
            {
              origin: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '23:00',
              },
              destination: {
                iata_code: 'LIM',
                date: '2024-02-02',
                time: '07:00',
              },
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI489',
              seat_location: '4C',
              fare_basis_code: 'Business',
            },
          ],
        },
        {
          pnr: 'KFA123',
          ticket_number: '100458790',
          e_ticket: true,
          ticketing_travel_agency: {
            iata_code: 'TRA123',
            name: 'Expedia',
          },
          passenger: {
            user_id: crypto.randomUUID(),
            first_name: 'Lourdes',
            middle_name: 'Daniela',
            last_name: 'Montenegro',
            country_code: 'EC',
            date_of_birth: '1987-11-08',
            document_type: 'DNI',
            document: '07277747',
            email: 'lmontenegro@deuna.com',
            phone: '+14155797662',
            frequent_flyer_code: '51703265363',
            title: 'Ms',
          },
          legs: [
            {
              origin: {
                iata_code: 'SEA',
                date: '2024-02-01',
                time: '12:00',
              },
              destination: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '18:00',
              },
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI899',
              seat_location: '3C',
              fare_basis_code: 'Business',
            },
            {
              origin: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '23:00',
              },
              destination: {
                iata_code: 'LIM',
                date: '2024-02-02',
                time: '07:00',
              },
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI489',
              seat_location: '4C',
              fare_basis_code: 'Business',
            },
          ],
        },
      ],
    },
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
    webhook_urls: {
      notify_order: '',
      apply_coupon: '',
      remove_coupon: '',
      get_shipping_methods: '',
      update_shipping_method: '',
      shipping_rate: 'g',
    },
    gift_card: [
      {
        amount: giftCardAmount1,
      },
      {
        amount: giftCardAmount2,
      },
    ],
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 1200,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 850,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 100,
          currency: 'MXN',
          currency_symbol: '$',
        },
        quantity: 1,
        uom: 'string',
        upc: 'string',
        sku: 'SKU-11021',
        isbn: '12-345-678-90123',
        brand: 'Bolt Swagstore',
        manufacturer: 'Bolt Factory',
        category: 'hats',
        color: 'Red',
        size: 'XXL',
        weight: {
          weight: 22,
          unit: 'kg',
        },
        image_url: '',
        details_url: '',
        type: 'physical',
        taxable: true,
      },
    ],
    discounts: [
      {
        amount: 500,
        code: 'SUMMERFUN15',
        reference: 'SUMMERFUN15',
        description: '',
        details_url: '',
        free_shipping: {
          is_free_shipping: false,
          maximum_cost_allowed: 100,
        },
        discount_category: 'coupon',
      },
    ],
    shipping_options: {
      type: 'pickup',
      details: {
        store_name: 'Store Name',
        address: '6 Rotermanni 11343 Talinn',
        address_coordinates: {
          lat: 4.721245,
          lng: -74.04673,
        },
        contact: {
          name: 'jhon snow',
          phone: '972514910',
        },
        additional_details: {
          pickup_time: '2021-11-03T22:09:09.086990957Z',
          stock_location: '',
        },
      },
    },
    user_instructions: 'This item is a gift.',
    metadata: {
      key1: 'value1',
      key2: 'value2',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      orderBody as any
    );
    orderToken = tokenizeResponse.data.token;
    orderId = tokenizeResponse.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.configDynamicRoutingWithRiskifiedManualReview(merchantId, merchantToken);
  });

  test(
    '@PF-T129 Purchase v1 - Riskified airline data',
    { tag: ['@admin_connection', '@admin-preprod', '@team_payments_capabilities', '@api'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.stripeProcessor.name,
            card: creditCardData.stripeMastercardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('It validates that the fraud processor is riskified', async () => {
        await retryGetFraudProcessor(
          emaService,
          privateKey,
          orderToken,
          ConnectionsAvailable.riskified
        );
      });

      await test.step('It is validated that the order has the gift_card fields set correctly', async () => {
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        const order = orderResponse.data.order as any;
        expect(order).toBeDefined();
        expect(order.gift_card).toBeDefined();
        expect(order.gift_card).toHaveLength(2);
        expect(order.gift_card[0].amount).toEqual(giftCardAmount1);
        expect(order.gift_card[1].amount).toEqual(giftCardAmount2);
      });
    }
  );
});
