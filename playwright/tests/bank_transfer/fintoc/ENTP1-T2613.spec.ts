import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FintocOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT/FintocOrderBuilder';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Fintoc APM - Payment Widget back button',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let publicKey = '';
    let privateKey = '';

    test.describe.configure({ retries: 2 });

    test.beforeAll(async () => {
      const merchant = await configMerchantCheckout.basicSetup('CL');
      publicKey = merchant.publicKey;
      privateKey = merchant.privateKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.fintocProcessor,
        merchant.merchantId,
        merchant.merchantToken
      );
    });

    let orderToken = '';

    test.beforeEach(async ({ emaService }) => {
      const orderBody = FintocOrderBuilder.createOrder();
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test(
      '@ENTP1-T2613 Fintoc APM - Payment Widget: clicking back from embedded view keeps widget open',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken,
          merchantCredentials: { publicKey, privateKey },
        });

        await testing.run({
          step: [
            {
              action: 'checkout.apm.fintoc.assertFintocInfoVisible',
              stepName:
                'Should validate Fintoc pre-purchase info (title and subtitle) is visible in widget',
            },
            {
              action: 'checkout.apm.fintoc.clickPayForm',
              stepName: 'Should click Pay to trigger embedded Fintoc view',
            },
            {
              action: 'checkout.apm.fintoc.assertFintocPopupVisible',
              stepName:
                'Should verify embedded Fintoc wizard renders inside the payment widget (bank list visible)',
            },
            {
              action: 'checkout.apm.fintoc.clickEmbeddedBack',
              stepName:
                'Should click the back button in the EmbeddedApmModal TopBar to dismiss Fintoc',
            },
            {
              action: 'checkout.apm.fintoc.assertFintocInfoVisible',
              stepName:
                'Should verify payment widget is still open and Fintoc pre-purchase screen is shown (widget did not close)',
            },
          ],
        });
      }
    );
  }
);
