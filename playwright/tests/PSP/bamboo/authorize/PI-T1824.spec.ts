import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as crypto from 'crypto';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let transactionId: string;
let responsePurchase: any;

const payloadOrder = {
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'USD',
    items_total_amount: 2175,
    tax_amount: 0,
    sub_total: 2175,
    shipping_amount: 100,
    payment_method: 'credit_card',
    shipping_tax_amount: 0,
    total_tax_amount: 65,
    total_amount: 2240,
    shipping_methods: [
      {
        code: '12345JR',
        name: 'entregas Speed',
        cost: 250,
      },
    ],
    discounts: [],
    items: [
      {
        id: crypto.randomUUID(),
        name: 'Papas',
        description: 'Papas fritas con paprica',
        total_amount: {
          original_amount: 2100,
          amount: 2050,
          total_discount: 100,
          currency: 'USD',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 1050,
          currency: 'USD',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 50,
          currency: 'USD',
          currency_symbol: '$',
        },
        quantity: 2,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
      {
        id: crypto.randomUUID(),
        name: 'Refresco',
        description: 'Coca-cola Sprite',
        total_amount: {
          original_amount: 75,
          amount: 90,
          total_discount: 0,
          currency: 'USD',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 75,
          currency: 'USD',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 15,
          currency: 'USD',
          currency_symbol: '$',
        },
        quantity: 1,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
    ],

    shipping_address: {
      id: 111,
      first_name: 'Pablo',
      last_name: 'Murillo',
      email: 'shipping@deuna.com',
      address1: 'Av. Primavera',
      address2: 'Edificio Santa Rosa',
      zipcode: '15023',
      city: 'Lima',
      state_name: 'Lima',
      country_code: 'Peru',
      identity_document: '12345678901',
      identity_document_type: 'DNI',
      phone: '+51987654321',
      lat: -12.0563,
      lng: -76.9358,
      additional_description: 'Descripción adicional',
      address_type: 'home',
    },
    billing_address: {
      id: 222,
      first_name: 'Jean',
      last_name: 'Roldan',
      email: 'billing@deuna.com',
      address1: 'Calle Los Sauces',
      address2: 'Residencial Los Olivos',
      zipcode: '07006',
      city: 'Callao',
      state_name: 'Callao',
      country_code: 'Peru',
      identity_document: '74857601',
      identity_document_type: 'DNI',
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
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('BAMBOO_AUTHORIZE_PROCESSOR_PE');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      payloadOrder as any
    );
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PI-T1824 (1.0) Autorizacion con status Denied con Bamboo para PE con USD con una tarjeta VISA',
    {
      tag: [
        '@payments_integration',
        '@team_payment_integration',
        '@api',
        '@preprod',
        '@authorization',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'PE',
            processorName: processorsConfig.bambooAuthorizeProcessorPE.name,
            card: creditCardData.bambooFailed,
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
