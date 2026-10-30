import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

const payloadOrder = {
  order: {
    order_id: crypto.randomUUID(),
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    total_tax_amount: 20000,
    shipping_amount: 110000,
    items_total_amount: 170000,
    sub_total: 280000,
    processor_name: 'all',
    total_amount: 300000,
    store_code: 'all',
    webhook_urls: {
      notify_order: 'https://staging-kfc-ec.deuna.io/api/v1/orders/notify',
      apply_coupon: 'https://staging-kfc-ec.deuna.io/api/v1/orders/{order_token}/coupons',
      remove_coupon:
        'https://staging-kfc-ec.deuna.io/api/v1/orders/{order_token}/coupons/{coupon_code}',
      get_shipping_methods: '',
      update_shipping_method: '',
      shipping_rate: 'https://staging-kfc-ec.deuna.io/api/v1/orders/{order_token}/shipping',
    },
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 170000,
          currency: 'MXN',
          currency_symbol: '$',
          original_amount: 170000,
        },
        unit_price: {
          amount: 170000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 0,
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
        image_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
        details_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
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
        details_url: 'https://boltswagstore.com/discounts/#12345',
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
          phone: '',
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
    shipping_address: {
      id: 0,
      user_id: '',
      first_name: 'qa test',
      last_name: 'automation',
      phone: '',
      identity_document: '050105010501',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'test address',
      address2: '',
      city: 'Ciudad de mexico',
      zipcode: '170515',
      state_name: 'Ciudad de mexico',
      country_code: 'MX',
      additional_description: '',
      address_type: '',
      is_default: false,
      created_at: '0001-01-01T00:00:00Z',
      updated_at: '0001-01-01T00:00:00Z',
    },
    billing_address: {
      identification: '050623568956124',
      id: 0,
      user_id: '',
      first_name: 'NELSON',
      last_name: 'JIMENEZ',
      phone: '',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador BILLING Purchase',
      address2: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador',
      city: 'Quito',
      zipcode: '170515',
      state_name: 'CRT',
      country: 'MX',
      country_code: 'MX',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
      email: EmailGenerator.generatePayerEmail(),
    },
  },
};

test.describe('@regression Pays with PayPal ACDC MX', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      payloadOrder as any
    );
    orderToken = tokenizeResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalACDCProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1814 Compra exitosa con procesador Paypal ACDC usuario invitado widget sin requerir numero de teléfono',
    {
      tag: ['@preprod', '@purchase', '@payments_integration', '@team_payment_integration', '@api'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.paypalACDCProcessor.name,
            card: creditCardData.paypalACDCVisaSucessful,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
