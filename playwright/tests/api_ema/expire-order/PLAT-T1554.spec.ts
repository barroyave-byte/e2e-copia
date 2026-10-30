import { expect, test } from '@support/fixtures';

let privateKey: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let orderToken: string;
let orderId: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
  });

  test(
    '@PLAT-T1554 | Should fail to expire an order that is already expired',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService }) => {
      await test.step('User tries to expire a non-pending order', async () => {
        const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
        orderId = tokenizeResponse.data.order.order_id;
        const orderToken = tokenizeResponse.data.token;

        await emaService.expireOrder(orderToken, privateKey);

        const response = await emaService.expireOrder(orderToken, privateKey, true);
        const { error } = response.data;

        expect(error).toBeDefined();
        expect(error.code).toBe('EMA-6020');
        expect(error.description).toBe('cannot expire an order that is already expired');
      });
    }
  );
});
