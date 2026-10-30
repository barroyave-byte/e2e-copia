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
    '@PLAT-T1548 | Should not create an order with an expiration date in the past',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService }) => {
      await test.step('User tries to tokenize an order with an expiration date in the past', async () => {
        const expirationDate = DateTime.now().addMinutes(-20).toJSDate();
        const orderData = DeunacheckoutOrderBuilder.createOrder('MX', {
          expires_at: expirationDate.toJSON(),
        });

        const response = await emaService.tokenizeOrderWithCustomBody(privateKey, orderData, true);

        const { error } = response.data;
        expect(error).toBeDefined();
        expect(error.code).toBe('EMA-6004');
        expect(error.description).toBe(
          'cannot register order expiration: order expiration date is in the past'
        );
      });
    }
  );
});
