import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';
import type { TokenizeOrderRequestData } from '@support/http/models/order';

const orderID = crypto.randomUUID();

const payload = {
  order_type: 'DEUNA_CHECKOUT',
  order: {
    order_type: 'DEUNA_CHECKOUT',
    order_id: orderID,
    currency: 'COP',
    timezone: 'America/Bogota',
    sub_total: 10000,
    total_amount: 10000,
    total_tax_amount: 0,
    store_code: 'all',
    processor_name: 'payu_pse',
    payer_info: {
      email: 'test@deuna.com',
      person_type: 'LEGAL_PERSON',
      date_of_birth: '2024-10-10T00:00:00Z',
    },
    items: [
      {
        unit_price: {
          currency_symbol: '$',
        },
        tax_amount: {
          currency: 'MXN',
          currency_symbol: '$',
        },
        taxable: false,
        id: 'IT001',
        name: 'Prueba',
        description: 'Description',
        quantity: 1,
      },
    ],
    billing_address: {
      first_name: 'Alexander',
      last_name: 'Gomez',
      email: 'agoe@gmail.com',
      identification: '14201225',
      identification_type: 'CC',
      phone: '+578315263363',
      address1: 'Avenida Carrera 72 80',
      address2: '94',
      zipcode: '110110',
      city: 'Bogota',
      state_name: 'Bogota',
      country: 'CO',
    },
    shipping_address: {
      first_name: 'Alexander',
      last_name: 'Gomez',
      email: 'agoe@gmail.com',
      identification: '14201225',
      identification_type: 'CC',
      phone: '+578315263363',
      address1: 'Avenida Carrera 72 80',
      address2: '94',
      zipcode: '110110',
      city: 'Bogota',
      state_name: 'Bogota',
      country: 'CO',
    },
  },
};

const purchasePayloadV2 = {
  order_token: '',
  payer_info: {
    email: 'test@deuna.com',
    person_type: 'LEGAL_PERSON',
  },
  payment_source: {
    method_type: 'bank_transfer',
    processor: 'payu_pse',
    method_type_specific_fields: {
      financial_institution: '1022',
      financial_institution_name: 'BANCO UNION COLOMBIANO',
    },
  },
  order: {
    billing_address: {
      first_name: 'Alexander',
      last_name: 'Gomez',
      email: 'agoe@gmail.com',
      identification: '14201225',
      identification_type: 'CC',
      phone: '+578315263363',
      address1: 'Avenida Carrera 72 80',
      address2: '94',
      zipcode: '110110',
      city: 'Bogota',
      state_name: 'Bogota',
      country: 'CO',
    },
    shipping_address: {
      first_name: 'Alexander',
      last_name: 'Gomez',
      email: 'agoe@gmail.com',
      identification: '14201225',
      identification_type: 'CC',
      phone: '+578315263363',
      address1: 'Avenida Carrera 72 80',
      address2: '94',
      zipcode: '110110',
      city: 'Bogota',
      state_name: 'Bogota',
      country: 'CO',
    },
  },
  anti_fraud_info: {
    browser_details: {
      ip_address: '127.0.0.1',
      user_agent: 'PostmanRuntime/7.42.0',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('PAYU_PSE_PROCESSOR_CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PI-T1738 Purchase V2 con Payer Info',
    { tag: ['@team_platform', '@preprod', '@purchase', '@api'] },
    async ({ emaService, paymentService }) => {
      userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

      const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        payload as unknown as TokenizeOrderRequestData
      );
      const orderToken = tokenizeResponse.data.token;
      expect(orderToken).not.toBeUndefined();

      purchasePayloadV2.order_token = orderToken;

      await paymentService.purchaseV2(privateKey, userAuthToken, purchasePayloadV2 as any);

      const getOrderResponse = await emaService.getOrder(privateKey, orderToken);
      expect(getOrderResponse.status).toBe(200);

      const order = getOrderResponse.data.order;
      const payerInfo = order.payer_info as Record<string, string>;

      expect(payerInfo).not.toBeUndefined();
      expect(payerInfo.email).toBe(purchasePayloadV2.payer_info.email);
      expect(payerInfo.person_type).toBe(purchasePayloadV2.payer_info.person_type);
      expect(payerInfo.date_of_birth).toBe(payload.order.payer_info.date_of_birth);
      expect(order.status).toBe('pending');
    }
  );
});
