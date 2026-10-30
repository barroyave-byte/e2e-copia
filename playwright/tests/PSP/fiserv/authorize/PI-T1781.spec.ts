import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test, expect } from '@support/fixtures';
import * as crypto from 'crypto';
import * as creditCardData from '@support/interfaces/credit_cards';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import { withUniqueOrderAmount } from '@support/utils/uniqueOrderAmount';

const configMerchant = new ConfigMerchant();

const payloadOrder = {
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'MXN',
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
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 1050,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 50,
          currency: 'MXN',
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
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 75,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 15,
          currency: 'MXN',
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
      address1: 'Avenida Paseo de la Reforma',
      address2: 'Colonia Juárez',
      zipcode: '06600',
      city: 'Ciudad de México',
      state_name: 'Ciudad de México',
      country_code: 'MEX',
      identity_document: '74857601',
      identity_document_type: 'DNI',
      phone: '+5521987654321',
      lat: -22.943934,
      lng: -43.182984,
      additional_description: 'Descripción adicional',
      address_type: 'home',
    },
    billing_address: {
      id: 222,
      first_name: 'Jean',
      last_name: 'Roldan',
      email: 'billing@deuna.com',
      address1: 'Calle Independencia',
      address2: 'Centro Histórico',
      zipcode: '44100',
      city: 'Guadalajara',
      state_name: 'Jalisco',
      country_code: 'MEX',
      identity_document: '74857601',
      identity_document_type: 'DNI',
      phone: '+5521987654321',
      lat: -23.555425,
      lng: -46.677048,
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
  let merchantName: string;
  let privateKey: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.fiservAuthorizeProcessorMX,
      merchantId,
      merchantToken
    );
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      withUniqueOrderAmount(payloadOrder) as any
    );
    orderToken = tokenized.data.token;
  });

  test(
    '@PI-T1781 (1.0) Authorize Exitoso con Fiserv usando el API para MX',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
    },
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
            country: 'MX',
            processorName: processorsConfig.fiservAuthorizeProcessorMX.name,
            card: creditCardData.fiservMastercardSuccessful,
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
