import { expect, test } from '@support/fixtures';

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
    '@PLAT-T1551 | Should expire an order when status is pending with no payment attempts',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService }) => {
      await test.step('User tries to expire an order with no payment attempts', async () => {
        const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
        orderToken = tokenized.data.token;
        orderId = tokenized.data.order.order_id;
        const expireResponse = await emaService.expireOrder(orderToken, privateKey);
        const order = (expireResponse.data as any).order;
        expect(order).toBeDefined();
        expect(order.status).toBe('expired');
        expect(order.expired_at).toBeDefined();
      });
    }
  );
});
