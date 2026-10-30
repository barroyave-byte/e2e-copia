import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentLinkRedirectPage } from '@pages/bnpl/paymentLinkPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { NequiPushFormPage } from '@pages/explore/forms/nequiPushFormPage';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression @visual Payment Link form UI validation',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const email = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchantCheckout.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nequiPushProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          country: 'CO',
          checkout_modules: [
            {
              name: 'PaymentFormPattern',
            },
          ],
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2121 Payment Link: Nequi Push form UI validation',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey, privateKey },
        });

        const paymentLinkPagePromise = page.waitForEvent('popup');
        const paymentLinkPage = await paymentLinkPagePromise;
        const paymentLinkRedirectPage = new PaymentLinkRedirectPage(paymentLinkPage);
        const nequiPush = new NequiPushFormPage(paymentLinkPage);

        await test.step('Wait until load page', async () => {
          await nequiPush.waitUntilLoadPage();
          await nequiPush.assertDEUNALogoToBeVisible();
        });

        await test.step('User verifies UI ', async () => {
          console.log('User verifies UI ');
          await verifyVisualConsistency(
            paymentLinkRedirectPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step1-verify-payment-link-screen-nequi-push-form-main-view'
          );
        });
      }
    );
  }
);
