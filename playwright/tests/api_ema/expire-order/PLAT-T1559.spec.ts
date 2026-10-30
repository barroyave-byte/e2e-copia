import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PLAT-T1559 | Should return expired status when order is expired',
    { tag: ['@team_platform', '@preprod', '@purchase', '@order_expiration', '@api'] },
    async ({ emaService }) => {
      await test.step('User tokenizes an order with an expiration date in the past and tries to retrieve it', async () => {
        const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
        orderToken = tokenized.data.token;
        orderId = tokenized.data.order.order_id;
        const expireResponse = await emaService.expireOrder(orderToken, privateKey);
        expect((expireResponse.data as any)?.token).toBeDefined();

        const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        expect(resultGetOrder.bodyResponse.order).toBeDefined();
        expect(resultGetOrder.bodyResponse.order.status).toBe('expired');
      });
    }
  );
});
