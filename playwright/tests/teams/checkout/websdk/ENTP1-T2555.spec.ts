import { expect, test } from '@support/fixtures';
import { WebSdkHarnessPage } from '@pages/checkout/websdk';
import { WebSDKClient } from '@support/clients/checkout/websdk';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

test.describe(
  '@regression WebSDK - Elements',
  { tag: ['@checkout', '@deuna-web-sdk', '@payment_widget'] },
  () => {
    const configMerchant = new ConfigMerchant();

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;

    let publicKey: string;

    let orderToken: string;

    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, {
        widgets_general_config: widgetsGeneralConfig,
      });
      const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2555 WebSDK - Elements: Successful preload initialization',
      { tag: ['@team_enterprise', '@visual'] },
      async ({ page }) => {
        const webSdkHarnessTestAppPage = new WebSdkHarnessPage(page);
        const webSDKClient = new WebSDKClient(page);
        let startTime: number;

        await test.step('Should go to the harness test app', async () => {
          await webSdkHarnessTestAppPage.goToHarness('1.5');
        });

        await test.step('Should initialize the WebSDK', async () => {
          const publicApiKey = publicKey;
          await webSDKClient.init({
            publicApiKey,
            preloadWidgets: [
              {
                widget: 'elements',
                params: {
                  hidePayButton: true,
                  language: 'es',
                },
              },
            ],
          });
          await page.waitForTimeout(10000); // Simulates the user's purchase time
        });

        await test.step('Should open the Elements Widget', async () => {
          await webSDKClient.openElements({ orderToken });

          startTime = performance.now();
        });

        await test.step('Should assert the widget content', async () => {
          await webSdkHarnessTestAppPage.assertPaymentVaultProcessorTitle();
        });

        await test.step('Should assert the time elapsed', async () => {
          const elapsed = Number((performance.now() - startTime).toFixed(2));
          expect(elapsed).toBeLessThan(3000);
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
