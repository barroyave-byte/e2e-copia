import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

test.describe('@regression NuPay', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test(
    '@PI-T1659 Actualizar el ID de una orden tokenizada',
    { tag: ['@preprod', '@purchase', '@api', '@team_payment_integration'] },
    async ({ emaService }) => {
      await test.step('The ORDER ID is modified', async () => {
        const merchant = await configMerchant.basicSetup('BR');
        merchantId = merchant.merchantId;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;

        const tokenizeResponse = await emaService.tokenizeNupayOrder(privateKey);
        orderToken = tokenizeResponse.data.token;
        orderId = tokenizeResponse.data.order.order_id;
        const orderIdModified = `${orderId}_modified`;

        const updateResponse = await emaService.updateNupayOrderId(
          privateKey,
          orderToken,
          orderIdModified
        );

        expect(updateResponse.data.order.order_id).toBe(orderIdModified);
        expect(updateResponse.data.token).toBe(orderToken);
      });
    }
  );
});
