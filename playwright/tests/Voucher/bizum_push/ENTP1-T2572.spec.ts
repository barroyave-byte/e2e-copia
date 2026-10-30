import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant_memoize';
import { BizumPushFormPage } from '@pages/explore/forms/bizumPushFormPage';

test.describe('@regression Bizum Push - Formularios', () => {
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;

  test.beforeAll(async () => {
    const merchantSetup = await ConfigMerchant.basicSetup(
      'ES',
      processorsConfig.bizumPushProcessor
    );
    const { privateKey: privateKeyParam, merchantId, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    privateKey = privateKeyParam;
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
  });

  test(
    '@ENTP1-T2572 Bizum Push: importe mayor a 15€ devuelve error BIZ00009',
    { tag: ['@forms', '@bizum', '@team_enterprise'] },
    async ({ page, emaService }) => {
      const testing = new TestingFramework({ page, test });
      const bizumFormPage = new BizumPushFormPage(page);

      await test.step('Tokenize ES order with amount greater than 15 EUR and open Formularios', async () => {
        orderToken = (await emaService.tokenizeDeunaNowOrder('ES', privateKey, { amount: 1600 }))
          .data.token;
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

        await bizumFormPage.clickPayAndCapturePurchaseResponse();
        await bizumFormPage.assertPurchaseErrorResponse('BIZ00009');
      });
    }
  );
});
