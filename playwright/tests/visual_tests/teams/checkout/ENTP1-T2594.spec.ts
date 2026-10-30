import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as creditCardData from '@support/interfaces/credit_cards';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression @visual Alert Error - Tarjeta rechazada por pasarela',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      orderToken = (await emaService.tokenizeDeunaNowOrder('MX', privateKey)).data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2594 [VISUAL] Alert Error - Tarjeta rechazada por pasarela',
      { tag: ['@visual', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('Open Payment Widget as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Wait for widget skeleton to disappear', async () => {
          await paymentDeunaNowPage.waitForWidgetSkeletonToDisappear();
        });

        await test.step('Fill declined Stripe card data', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.stripeVisaFailed, {
            country: 'MX',
          });
        });

        await test.step('Click pay and wait for gateway rejection', async () => {
          await paymentDeunaNowPage.clickOnPayButton(true);
          await paymentDeunaNowPage.responsePromise;
        });

        await test.step('Assert payment error alert appears with expected text', async () => {
          await paymentDeunaNowPage.waitForAlertContainerVisible();
        });

        await test.step('Visual snapshot of payment error alert', async () => {
          await verifyVisualConsistency(
            page,
            commonViewportSets.desktopOnly,
            'visual-alert-payment-error'
          );
        });
      }
    );
  }
);
