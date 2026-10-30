import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import * as creditCardData from '@support/interfaces/credit_cards';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';

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
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let userAuthToken: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.bambooAuthorizeProcessorAR,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T6 (1.0) Authorize V1 exitoso VISA con BAMBOO usando API en ARGENTINA',
    { tag: ['@payments_integration', '@team_payconnect', '@fixme_preprod'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to make a purchase using new browser detail fields', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
      });

      const result = await emaService.tokenizeOrderWithCustomBody(privateKey, payloadOrder);
      orderId = result.data.order.order_id;

      orderToken = result.data.token;

      await paymentService.purchaseV2(
        privateKey,
        userAuthToken,
        buildPurchaseV2Payload({
          country: 'AR',
          processorName: processorsConfig.bambooAuthorizeProcessorAR.name,
          card: creditCardData.bambooVisaSuccessfull,
          token: orderToken,
        })
      );
    }
  );
});
