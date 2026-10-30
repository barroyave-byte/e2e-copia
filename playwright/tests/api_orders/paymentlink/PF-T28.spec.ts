import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';
import { expect } from '@support/fixtures';

const order_id = crypto.randomUUID();
const body_sent = {
  order_type: 'PAYMENT_LINK',
  order: {
    order_id: order_id,
    payer_info: {
      date_of_birth: '1995-01-09T00:00:00Z',
    },
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    tax_amount: 3000,
    shipping_amount: 3000,
    items_total_amount: 3000,
    sub_total: 3000,
    processor_name: 'all',
    total_amount: 3000,
    store_code: 'all',
  },
};

let privateKey: string;
let merchantId: string;
let merchantName: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PF-T28 Tokenizar una orden con payer_info date_of_birth',
    { tag: ['@preprod', '@purchase', '@api', '@team_payconnect'] },
    async ({ emaService }) => {
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, body_sent as any);

      const order_token = tokenized.data.token;
      expect(order_token).not.toBeUndefined();

      const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, order_token);
      expect(resultGetOrder.bodyResponse.order.payer_info).not.toBeUndefined();
      expect(resultGetOrder.bodyResponse.order.payer_info).not.toBeNull();
      expect(resultGetOrder.bodyResponse.order.payer_info.date_of_birth).not.toBeUndefined();
      expect(resultGetOrder.bodyResponse.order.payer_info.date_of_birth).not.toBeNull();
    }
  );
});
