import { test, expect } from '@support/fixtures';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import DateTime from '@support/utils/datetime';

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PLAT-T1562 | Should retain original status if expiration date is in the future',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService }) => {
      await test.step('User tokenizes an order with an expiration date in the future and tries to retrieve it', async () => {
        const expirationDate = DateTime.now().addMinutes(20).setMilliseconds(0).toJSDate();
        const orderData = DeunacheckoutOrderBuilder.createOrder('MX', {
          expires_at: expirationDate.toJSON(),
        });

        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          orderData
        );

        expect(tokenizeResponse.data?.token).toBeDefined();
        const orderToken = tokenizeResponse.data.token;

        const getOrderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(getOrderResponse.data.order).toBeDefined();
        const resultExpiresAt = new Date(getOrderResponse.data.order.expires_at);
        expect(resultExpiresAt.getTime()).toBe(expirationDate.getTime());
      });
    }
  );
});
