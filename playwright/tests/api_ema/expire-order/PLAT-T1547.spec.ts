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
    '@PLAT-T1547 | Should create an order with a valid expiration date',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService }) => {
      await test.step('User tries to tokenize an order with a valid expiration date', async () => {
        const expirationDate = DateTime.now().addMinutes(20).setMilliseconds(0).toJSDate();
        const orderData = DeunacheckoutOrderBuilder.createOrder('MX', {
          expires_at: expirationDate.toJSON(),
        });

        const response = await emaService.tokenizeOrderWithCustomBody(privateKey, orderData);

        const { order, error } = response.data;
        expect(error).toBeUndefined();
        expect(order).toBeDefined();
        expect(new Date(order.expires_at).getTime()).toBe(expirationDate.getTime());
      });
    }
  );
});
