import * as crypto from 'crypto';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as voidData from '@support/interfaces/void';

const payloadOrder = {
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'UYU',
    items_total_amount: 1000,
    tax_amount: 0,
    sub_total: 900,
    shipping_amount: 100,
    payment_method: 'credit_card',
    shipping_tax_amount: 0,
    total_tax_amount: 100,
    total_amount: 1000,
    items: [
      {
        id: crypto.randomUUID(),
        name: 'First item name',
        description: 'First item description',
        total_amount: {
          original_amount: 0,
          amount: 105000,
          total_discount: 0,
          currency: 'UYU',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 52500,
          currency: 'UYU',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 50,
          currency: 'UYU',
          currency_symbol: '$',
        },
        quantity: 2,
        taxable: true,
      },
    ],
    shipping_address: {
      id: 111,
      first_name: 'Jhon',
      last_name: 'Smith',
      email: 'john@mail.com',
      address1: 'Av. Primavera',
      address2: 'Edificio Santa Rosa',
      zipcode: '15023',
      city: 'Montevideo',
      state_name: 'Montevideo',
      country_code: 'UY',
      identity_document: '123456789',
      identity_document_type: 'RUT',
      phone: '+51987654321',
      lat: -12.0563,
      lng: -76.9358,
      additional_description: 'Descripción adicional',
      address_type: 'home',
    },
    billing_address: {
      id: 222,
      first_name: 'Jhon',
      last_name: 'Smith',
      email: 'john@mail.com',
      address1: 'Calle Los Sauces',
      address2: 'Residencial Los Olivos',
      zipcode: '07006',
      city: 'Montevideo',
      state_name: 'Montevideo',
      country_code: 'UY',
      identity_document: '123456789',
      identity_document_type: 'RUT',
      phone: '+51987654321',
      lat: -12.06502,
      lng: -76.98295,
      address_type: 'home',
    },
    user_instructions: 'User instructions',
    metadata: {
      origin: 'core',
    },
    browser_details: {
      screen_height: 1000,
      screen_width: 2000,
    },
    webhook_urls: {
      notify_order: '',
      apply_coupon: '',
      remove_coupon: '',
      get_shipping_methods: '',
      update_shipping_method: '',
      'Tarifa de envio': '',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let privateKey: string;
  let orderToken: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('BAMBOO_AUTHORIZE_PROCESSOR_UY');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    privateKey = merchant.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      payloadOrder as any
    );
    orderToken = tokenizeResponse.data.token;
  });

  test(
    '@PI-T2040 Void a transaction with authorized status using Bamboo in Uruguay',
    { tag: ['@payments_integration', '@team_payment_integration', '@api', '@fixme_preprod'] },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'UY',
            processorName: processorsConfig.bambooAuthorizeProcessorUY.name,
            card: creditCardData.bambooCreditCardUY,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A void is sent to the authorized transaction', async () => {
        await apiCallNewman.voidOrder(voidData.successVoid, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });
    }
  );
});
