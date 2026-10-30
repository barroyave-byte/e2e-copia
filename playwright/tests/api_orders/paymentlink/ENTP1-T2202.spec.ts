import { test, expect } from '@support/fixtures';
import * as crypto from 'crypto';
import { TokenizeOrderRequestData } from '@support/http/models/order';

const order_id = crypto.randomUUID();
const body_sent: TokenizeOrderRequestData = {
  order_type: 'PAYMENT_LINK',
  order: {
    order_id: order_id,
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    tax_amount: 3000,
    shipping_amount: 3000,
    items_total_amount: 3000,
    sub_total: 3000,
    processor_name: 'all',
    total_amount: 3000,
    store_code: 'all',
    items: [],
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let privateKey = '';
  let merchantId: string;
  let merchantName: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@ENTP1-T2202 Tokenizar una orden de tipo PAYMENT_LINK con el campo items vacio',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ emaService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        const response = await emaService.tokenizeOrderWithCustomBody(privateKey, body_sent);
        expect(response.status).toBe(200);
        expect(response.data.token).toBeTruthy();
        expect(response.data.order_type).toBe('PAYMENT_LINK');
        expect(response.data.order.payment_link).toContain(response.data.token);
        expect(response.data.order.items.length).toBe(0);
      });
    }
  );
});
