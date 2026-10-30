import { expect, test } from '@support/fixtures';
import { WebSdkHarnessPage } from '@pages/checkout/websdk';
import { WebSDKClient } from '@support/clients/checkout/websdk';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

test.describe(
  '@regression WebSDK - Payment Widget',
  { tag: ['@checkout', '@deuna-web-sdk', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;

    let publicKey: string;

    let orderToken: string;

    let orderId: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('CASH_PROCESSOR_EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2552 WebSDK - Payment Widget: Successful initialization',
      { tag: ['@team_enterprise', '@visual'] },
      async ({ page }) => {
        const webSdkHarnessTestAppPage = new WebSdkHarnessPage(page);
        const webSDKClient = new WebSDKClient(page);
        let startTime: number;

        await test.step('Should go to the harness test app', async () => {
          await webSdkHarnessTestAppPage.goToHarness();
        });

        await test.step('Should open the Payment Widget', async () => {
          const publicApiKey = publicKey;

          await webSDKClient.init({ publicApiKey });
          await webSDKClient.openPaymentWidget({ orderToken, hidePayButton: true, language: 'es' });

          startTime = performance.now();
        });

        await test.step('Should assert the widget content', async () => {
          await webSdkHarnessTestAppPage.assertPaymentWidgetProcessorTitle();
        });

        await test.step('Should assert the time elapsed', async () => {
          const elapsed = Number((performance.now() - startTime).toFixed(2));
          expect(elapsed).toBeGreaterThan(1500);
        });

        await test.step('Should verify the widget content consistency', async () => {
          await page.waitForTimeout(1500); // Secure the content load
          await verifyVisualConsistency(
            page,
            commonViewportSets.desktopAndFullscreen,
            'verify-widget-content'
          );
        });
      }
    );
  }
);
