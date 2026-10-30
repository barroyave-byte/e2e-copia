import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Payment Widget (Form)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId = '';
    let merchantId = '';
    let merchantToken = '';
    let privateKey = '';
    let publicKey = '';
    let orderToken = '';

    test.beforeEach(async ({ emaService }) => {
      const basicSetup = await configMerchantCheckout.basicSetup('US');
      merchantId = basicSetup.merchantId;
      merchantToken = basicSetup.merchantToken;
      privateKey = basicSetup.privateKey;
      publicKey = basicSetup.publicKey;

      processorId = await apiCallNewman.createPaymentProcessor(
        processorsConfig.venmoProcessor,
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('US');
      const order = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = order.data.token;
    });

    test('@ENTP1-T2565 Venmo: UI consistency', { tag: ['@team_enterprise'] }, async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'checkout.openCheckout',
            params: {
              experienceType: 'Formularios',
              language: 'EN',
              privateKey,
              publicKey,
              orderToken,
            },
            stepName: 'Should opens the testing page and the required form',
          },
          {
            action: 'checkout.wallet.venmo.selectVenmoForm',
            stepName: 'Should selects Venmo as payment method',
          },
          {
            action: 'checkout.wallet.venmo.assertPaypalSpbButton',
            stepName: 'Should verify the pay button is visible',
          },
          {
            action: 'checkout.wallet.venmo.verifyDisclaimerVisualConsistency',
            params: { snapshotName: 'screen-venmo-disclaimer' },
            stepName: 'Should verify the disclaimer consistency',
          },
        ],
      });
    });

    test.afterEach(async () => {
      await ServiceFactory.getService(SERVICE_KEYS.PAYMENT).deletePaymentProcessor(
        processorId,
        merchantId,
        merchantToken
      );
    });
  }
);
