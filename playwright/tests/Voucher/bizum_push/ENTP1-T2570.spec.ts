import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { EcommercePage } from '@pages/explore/ecommercePage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant_memoize';

test.describe('@regression Bizum Push - Payment Widget', () => {
  let privateKey: string;
  let publicKey: string;
  test.beforeAll(async () => {
    const merchantSetup = await ConfigMerchant.basicSetup(
      'ES',
      processorsConfig.bizumPushProcessor
    );
    const { merchantId, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
  });

  test(
    '@ENTP1-T2570 Bizum Push: pago exitoso en Payment Widget con número telefónico válido',
    { tag: ['@payment_widget', '@team_enterprise'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const ecommercePage = new EcommercePage(page);

      await test.step('Open explore and select product < 5 EUR', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        // Select product (Auriculares or similar < 5 EUR product from explore)
        await ecommercePage.clickOnProduct();
        await ecommercePage.addToCart();
        await ecommercePage.clickOnIconBasket();
        await ecommercePage.clickOnFinalizePurchase();
        await ecommercePage.selectPaymentWidgetModalOption();
        await ecommercePage.clickOnConfirm();
      });

      await testing.run({
        step: [
          {
            action: 'checkout.wallet.bizum.waitUntilLoadPage',
            stepName: 'Wait until Bizum phone input is visible',
          },
          {
            action: 'checkout.wallet.bizum.fillPhoneNumber',
            params: { phone: '700000000' },
          },
          {
            action: 'checkout.wallet.bizum.clickPay',
            stepName: 'Click Pay button',
          },
        ],
      });

      await test.step('Validate payment completed view is visible', async () => {
        await ecommercePage.assertBackToHomeButtonIsVisible();
      });
    }
  );
});
