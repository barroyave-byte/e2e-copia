import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test, expect } from '@support/fixtures';
import { withUniqueOrderAmount } from '@support/utils/uniqueOrderAmount';
import * as crypto from 'crypto';
import * as creditCardData from '@support/interfaces/credit_cards';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

const payloadOrder = {
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'ARS',
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
          currency: 'ARS',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 1050,
          currency: 'ARS',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 50,
          currency: 'ARS',
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
          currency: 'ARS',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 75,
          currency: 'ARS',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 15,
          currency: 'ARS',
          currency_symbol: '$',
        },
        quantity: 1,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
    ],
    billing_address: {
      id: 222,
      first_name: 'Jean',
      last_name: 'Roldan',
      email: 'jroldan@deuna.com',
      address1: 'La Ballena',
      address2: 'Capilla virgen del valle',
      zipcode: '7521',
      city: 'Buenos Aires',
      state_name: 'Buenos Aires',
      country_code: 'ARG',
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

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('AR');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      withUniqueOrderAmount(payloadOrder) as any
    );
    orderToken = tokenizeResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.fiservAuthorizeProcessorAR,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1800 (1.0) Void Exitoso con Fiserv usando el api para AR a una transaccion autorizada',
    { tag: ['@payments_integration', '@team_payment_integration', '@api'] },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'AR',
            processorName: processorsConfig.fiservAuthorizeProcessorAR.name,
            card: creditCardData.fiservARVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validates that the order has been placed correctly with the status of both the payment and the order', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(orderResponse.data.order.status).toBe('succeeded');
      });

      await test.step('The authorized transaction is voided', async () => {
        await paymentService.voidAsync(orderToken, privateKey, 0, 'void reason');
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided', 30, 3000);
      });
    }
  );
});
