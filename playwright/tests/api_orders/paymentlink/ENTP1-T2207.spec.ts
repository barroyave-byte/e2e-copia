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
  },
  checkout_modules: [],
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
    '@ENTP1-T2207 Consultar una orden tipo PAYMENT_LINK SIN módulos dinámicos',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ emaService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          body_sent
        );
        expect(tokenizeResponse.status).toBe(200);
        const orderToken = tokenizeResponse.data.token;

        const getResponse = await emaService.getOrder(privateKey, orderToken);
        expect(getResponse.status).toBe(200);
        expect(getResponse.data.token).toBeTruthy();
        const checkoutModules = (getResponse.data as any).checkout_modules ?? [];
        expect(checkoutModules.length).toBe(0);
      });
    }
  );
});
