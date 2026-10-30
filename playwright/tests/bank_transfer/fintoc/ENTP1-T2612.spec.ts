import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FintocOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT/FintocOrderBuilder';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Fintoc APM - Forms Flow',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let publicKey = '';
    let privateKey = '';

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
      '@ENTP1-T2612 Fintoc APM - Forms Flow: Embedded iframe renders and widget closes on back button',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken,
          merchantCredentials: { publicKey, privateKey },
        });

        await testing.run({
          step: [
            {
              action: 'checkout.apm.fintoc.selectFintocForm',
              stepName:
                'Should select Fintoc in forms and click pay-button-desktop — auto-triggers purchase and opens embedded Fintoc view',
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
              action: 'checkout.apm.fintoc.assertWidgetClosed',
              stepName:
                'Should verify the checkout widget iframe closes after clicking back in forms flow',
            },
          ],
        });
      }
    );
  }
);
