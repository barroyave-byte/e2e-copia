import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe('@regression Trim dynamic routing rules', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchantCheckout.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaCheckoutOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T2067 Trim dynamic routing rules',
    { tag: ['@dynamic_routing', '@team_payments_capabilities'] },
    async ({ page }) => {
      const triggers = await apiCallNewman.trimDynamicRoutingRules(merchantId, merchantToken);

      await test.step('check rules length', async () => {
        expect(1).toBe(triggers.length);
      });
    }
  );
});
