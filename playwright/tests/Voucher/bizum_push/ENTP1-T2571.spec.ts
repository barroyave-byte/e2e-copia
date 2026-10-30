import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant_memoize';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { BizumPushFormPage } from '@pages/explore/forms/bizumPushFormPage';

test.describe('@regression Bizum Push - Formularios', () => {
  let privateKey: string;
  let publicKey: string;
  let merchantId: string;
  let orderToken: string;
  test.beforeAll(async () => {
    const merchantSetup = await ConfigMerchant.basicSetup(
      'ES',
      processorsConfig.bizumPushProcessor
    );
    const {
      privateKey: privateKeyParam,
      merchantId: merchantIdParam,
      merchantToken,
    } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    privateKey = privateKeyParam;
    merchantId = merchantIdParam;
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
  });

  test(
    '@ENTP1-T2571 Bizum Push: importe entre 5€ y 10€ termina en purchase_pending y luego denied',
    { tag: ['@forms', '@bizum', '@team_enterprise'] },
    async ({ page, emaService }) => {
      const testing = new TestingFramework({ page, test });
      const bizumFormPage = new BizumPushFormPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const ecommercePage = new EcommercePage(page);

      await test.step('Tokenize ES order with amount between 5 and 10 EUR and open Formularios', async () => {
        const tokenized = await emaService.tokenizeDeunaNowOrder('ES', privateKey, { amount: 700 });
        orderToken = tokenized.data.token;
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Fill Bizum form and click Pay', async () => {
        await testing.run({
          step: [
            {
              action: 'checkout.wallet.bizum.selectBizumTab',
              stepName: 'Select Bizum payment method',
            },
            {
              action: 'checkout.wallet.bizum.waitUntilLoadPage',
              stepName: 'Wait until Bizum phone input is visible',
            },
            {
              action: 'checkout.wallet.bizum.fillPhoneNumber',
              params: { phone: '700000000' },
            },
          ],
        });
      });

      await test.step('Validate purchase is pending and then rejected view is shown in Explore', async () => {
        await bizumFormPage.clickPayAndCapturePurchaseResponse();
        await bizumFormPage.assertPurchasePendingResponse();
        await ecommercePage.assertRejectedPaymentHeadingIsVisible();
        await ecommercePage.assertBackToHomeButtonIsVisible();
      });

      await test.step('Validate rejected payment status in Admin', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied');
      });
    }
  );
});
