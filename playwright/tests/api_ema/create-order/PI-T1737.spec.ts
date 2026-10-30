import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
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
      email: 'aencarnacion@deuna.com',
      person_type: 'NATURAL_PERSON',
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

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PI-T1737 Create Order con Payer Info',
    {
      tag: [
        '@preprod',
        '@checkout_configuration',
        '@api',
        '@checkout_configurations',
        '@team_platform',
      ],
    },
    async ({ emaService }) => {
      const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        payload as unknown as TokenizeOrderRequestData
      );
      const orderToken = tokenizeResponse.data.token;
      expect(orderToken).not.toBeUndefined();

      const getOrderResponse = await emaService.getOrder(privateKey, orderToken);
      expect(getOrderResponse.status).toBe(200);

      const payerInfo = getOrderResponse.data.order.payer_info as Record<string, string>;

      expect(payerInfo).not.toBeUndefined();
      expect(payerInfo.email).toBe(payload.order.payer_info.email);
      expect(payerInfo.person_type).toBe(payload.order.payer_info.person_type);
    }
  );
});
