import * as processorsConfig from '@support/interfaces/payment_processors';
import { test, expect } from '@support/fixtures';
import * as crypto from 'crypto';
import * as creditCardData from '@support/interfaces/credit_cards';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

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
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let privateKey: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('BAMBOO_AUTHORIZE_PROCESSOR_PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, payloadOrder as any);
    orderToken = tokenized.data.token;
  });

  test(
    '@PI-T1823 (1.0) Authorize Existoso con Bamboo para PE con USD con una tarjeta VISA',
    { tag: ['@payments_integration', '@team_payment_integration'] },
    async ({ paymentService, userAuthService, emaService }) => {
      let userToken: string;

      await test.step('Selecting user guest', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        userToken = responseUserAuth.data.token;
      });

      await test.step('The user send purchase request', async () => {
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'PE',
            processorName: processorsConfig.bambooAuthorizeProcessorPE.name,
            card: creditCardData.bambooVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('Validates that the order has been placed correctly with the status of both the payment and the order', async () => {
        // Validate this http code and payment status
        expect(responsePurchase.status).toBe(200);
        // Validate that when doing a get order, the status is correct.
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        // Validates the order status
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(orderResponse.data.order.status).toBe('succeeded');
      });
    }
  );
});
