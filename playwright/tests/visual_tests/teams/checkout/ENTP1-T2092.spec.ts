import { test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { stripeProcessor } from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentLinkRedirectPage } from '@pages/bnpl/paymentLinkPage';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { createPaymentLinkOrderPayload } from '@visual/utils/payment_link/create_payment_link_order_payload';

const configMerchantCheckout = new ConfigMerchantCheckout();

const checkout_modules: CheckoutModule[] = [];

test.describe(
  '@regression @visual Checkout Modules widgets configuration',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
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
      await apiCallNewman.createPaymentProcessor(stripeProcessor, merchantId, merchantToken);

      await apiCallNewman.createCheckoutModulesConfig(checkout_modules, merchantId, merchantToken);

      const orderPayload = createPaymentLinkOrderPayload();

      const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        orderPayload as unknown as TokenizeOrderRequestData
      );
      orderToken = tokenizeResponse.data.token;
    });

    test(
      '@ENTP1-T2092 Módulo: Resumen de la orden - No visible',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        let paymentLinkRedirectPage: PaymentLinkRedirectPage;

        await test.step('Should opens the payment link', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });

          const addiRedirectPagePromise = page.waitForEvent('popup');
          const popup = await addiRedirectPagePromise;
          paymentLinkRedirectPage = new PaymentLinkRedirectPage(popup);
          await paymentLinkRedirectPage.waitUntilLoaded();
        });

        await test.step('Billing form must be hidden by default', async () => {
          await paymentLinkRedirectPage.assertOrderDetailsIsHidden();
        });

        await test.step('User verifies UI ', async () => {
          await verifyVisualConsistency(
            paymentLinkRedirectPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step1-verify-payment-link-screen-order-details-hidden-main-view'
          );
        });
      }
    );
  }
);
