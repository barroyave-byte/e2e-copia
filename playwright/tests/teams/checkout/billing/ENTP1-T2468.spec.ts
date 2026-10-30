import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { orderPayloadWithoutUserData } from '@support/mocks/orders';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

const configMerchantVault = new ConfigMerchant();

test.describe(
  '@regression Payment Vault (Modal) - Billing',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantVault.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
      orderToken = (
        await emaService.tokenizeOrderWithCustomBody(privateKey, orderPayloadWithoutUserData as any)
      ).data.token;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2468 Verify the phone country code in the billing form',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Should open the billing form', async () => {
          await vaultWidgetPage.assertBillingFormTitleIsVisible();
          await vaultWidgetPage.showBillingFormIFrame();
        });

        await test.step('Should validate the phone country code visually', async () => {
          await verifyVisualConsistency(
            vaultWidgetPage.page,
            commonViewportSets.desktopAndFullscreen,
            'verify-billing-form-screen-with-correct-phone-country-code'
          );
        });
      }
    );
  }
);
