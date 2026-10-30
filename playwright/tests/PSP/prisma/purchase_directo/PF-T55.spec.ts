import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import * as crypto from 'crypto';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

const order_id = crypto.randomUUID();
const userEmail = EmailGenerator.generatePayerEmail();

const body_sent = {
  order_type: 'AIRLINE_ORDER',
  order: {
    order_id: order_id,
    currency: 'ARS',
    timezone: 'America/Buenos_Aires',
    tax_amount: 10000,
    shipping_amount: 10000,
    items_total_amount: 10000,
    sub_total: 10000,
    processor_name: 'all',
    total_amount: 10000,
    store_code: 'all',
    items: [
      {
        unit_price: {
          original_amount: 10000,
          discount_amount: 0,
          display_original_amount: '',
          amount: 10000,
          currency: 'ARS',
          currency_symbol: '$',
          display_amount: '$ 100.00',
        },
        total_amount: {
          amount: 10000,
          discount_amount: 0,
          currency: 'ARS',
          currency_symbol: '$',
          display_amount: '$ 100.00',
          display_original_amount: '$ 100.00',
          original_amount: 0,
        },
        tax_amount: {
          original_amount: 0,
          discount_amount: 0,
          display_original_amount: '',
          amount: 0,
          currency: 'ARS',
          currency_symbol: '$',
          display_amount: '$ 0.00',
        },
        taxable: false,
        id: 'IT001',
        name: 'Prueba',
        description: 'Description',
        quantity: 1,
      },
    ],
    discounts: [],
    shipping_options: {
      type: 'delivery',
    },
    billing_address: {
      first_name: 'qa test',
      last_name: 'automation',
      address1: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      state_name: 'Buenos Aires',
      zipcode: 'C1043AAZ',
      country_code: 'AR',
      email: userEmail,
    },
    shipping_address: {
      first_name: 'qa test',
      last_name: 'automation',
      phone: '5551234567',
      identity_document: '20304050607',
      address1: 'Av. Corrientes 1234',
      address2: 'Piso 3',
      city: 'Buenos Aires',
      state_name: 'Buenos Aires',
      zipcode: 'C1043AAZ',
      country: 'AR',
      country_code: 'AR',
      lat: -34.603722,
      lng: -58.381592,
      address_type: 'home',
      is_default: false,
      email: userEmail,
    },
    airline_information: {
      ticketing_travel_agency: {
        iata_code: 'ABC123',
      },
    },
  },
};

test.describe('@regression Purchase exitoso con airline data Prisma Payway', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      body_sent as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenized.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessorAirline,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T55 Purchase exitoso con airline data Prisma Payway',
    { tag: ['@payments_integration', '@team_payconnect', '@preprod', '@purchase'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'AR',
            processorName: processorsConfig.prismaPaywayProcessorAirline.name,
            card: creditCardData.prismaPaywayVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
