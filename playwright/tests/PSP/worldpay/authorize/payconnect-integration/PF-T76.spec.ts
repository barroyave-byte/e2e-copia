import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';

const order_id = crypto.randomUUID();
let orderToken = '';
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;

const purchaseRequest: PurchaseRequestV2 = {
  order_token: '',
  payer_info: { email: 'shipping@maxipago.com' },
  payment_source: {
    method_type: MethodType.CREDIT_CARD,
    processor: 'worldpay',
    card_info: {
      expiry_month: '12',
      expiry_year: '2030',
      card_holder: 'REFUSED',
      card_holder_dni: '12334568799',
      card_number: '4024007197692931',
      card_cvv: '123',
      address1: 'Avenida Paulista',
      zip: '01311000',
      city: 'São Paulo',
      state: 'SP',
      country: 'BR',
      phone: '1122334455',
    },
    method_type_specific_fields: {
      description: 'order description',
    },
  },
  anti_fraud_info: {
    user_agent: 'PostmanRuntime/7.42.0',
    device: {
      id: `${crypto.randomUUID()}`,
      fingerprint: '',
      fingerprint_provider: '',
      name: '',
    },
    browser_details: {
      accept_header: '*/*',
    } as any,
  },
};

const orderData = {
  order_type: 'DEUNA_NOW',
  order: {
    order_id: order_id,
    store_code: 'all',
    currency: 'MXN',
    tax_amount: 3000,
    shipping_amount: 3000,
    total_tax_amount: 1000,
    items_total_amount: 300000,
    sub_total: 3000,
    total_amount: 4000,
    display_total_amount: 'ARG 30.00',
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 1200,
          original_amount: 0,
          display_amount: 'MXN 12.00',
          display_original_amount: 'MXN 30.00',
          total_discount: 0,
          display_total_discount: 'MXN 0.00',
        },
        unit_price: {
          amount: 850,
          display_amount: 'CLP 8.50',
        },
        tax_amount: {
          amount: 100,
          display_amount: 'CLP 1.00',
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
        discounts: [],
        included_in_subscription: false,
      },
    ],
    discounts: [
      {
        amount: 500,
        display_amount: '',
        code: 'SUMMERFUN15',
        reference: 'SUMMERFUN15',
        description: '',
        details_url: 'https://boltswagstore.com/discounts/#12345',
        free_shipping: {
          is_free_shipping: false,
          maximum_cost_allowed: 100,
        },
        discount_category: 'coupon',
        target_type: '',
        type: '',
      },
    ],
    shipping_address: {
      id: 0,
      user_id: '',
      first_name: 'qa test',
      last_name: 'automation',
      phone: '+553986100449',
      identity_document: '050105010501',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Avenida Paulista',
      address2: '123, 11º Andar',
      zipcode: '01311000',
      city: 'São Paulo',
      state_name: 'SP',
      country: 'BR',
      country_code: 'BR',
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
      phone: '+553986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Avenida Paulista',
      address2: '123, 11º Andar',
      zipcode: '01311000',
      city: 'São Paulo',
      state_name: 'SP',
      country: 'BR',
      country_code: 'BR',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
      email: '{{user_email}}',
    },
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
          phone: '9725149104',
        },
        additional_details: {
          pickup_time: '2021-11-03T22:09:09.086990957Z',
          stock_location: '',
        },
      },
    },
    user_instructions: '',
    metadata: {
      key1: 'value1',
      key2: 'value2',
    },
    status: 'pending',
    payment: {},
    gift_card: [],
    redirect_url: '',
    webhook_urls: null,
    total_discount: 0,
    display_total_discount: 'MXN 0.00',
    shipping: {
      original_amount: 0,
      total_discount: 0,
      discounts: [],
    },
    cash_change: 0,
    shipping_method: {
      code: '',
      name: '',
      min_delivery_date: '',
      max_delivery_date: '',
      cost: 0,
      display_cost: '',
      tax_amount: 0,
      display_tax_amount: '',
      scheduler: [],
    },
    shipping_methods: [],
    timezone: 'America/Buenos_Aires',
    scheduled_at: '',
    payment_link: '',
    display_shipping_tax_amount: 'MXN 0.00',
    display_total_tax_amount: 'MXN 0.00',
    shipping_tax_amount: 0,
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('WORLDPAY_PROCESSOR_PAYCONNECT_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenizeResult = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      orderData as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenizeResult.data.token;
  });

  test(
    '@PF-T76 Purchase denegado Worldpay',
    { tag: ['@payments_integration', '@smoke', '@team_payconnect'] },
    async ({ page, paymentService }) => {
      await test.step('User makes a purchase with Worldpay', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        expect(orderToken).not.toBeUndefined();
        purchaseRequest.order_token = orderToken;

        await paymentService.purchaseV2(privateKey, userAuthToken, purchaseRequest, true);
      });

      await test.step('It is validated that the order has been processed successfully with status denied', async () => {
        await page.waitForTimeout(5000);
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        expect(paymentData.orderStatus).toBe('denied');
      });
    }
  );
});
