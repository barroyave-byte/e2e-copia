import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { LinkLocator } from '@support/interfaces/vaultWidgetPage';

const configMerchantVault = new ConfigMerchant();

test.describe(
  '@regression Visualización correcta de URL legales por Usuario Nuevo',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantVault.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page }) => {
        // Open the testing page and navigate to the widget to be tested
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2064 Visualización correcta de URL legales por Usuario Nuevo',
      { tag: ['@smoke', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Validate user sees terms and conditions and privacy policy', async () => {
          await vaultWidgetPage.assertUserSeeTermsAndConditions();
        });

        await test.step('Validate that the new user can be redirected to the correct URLs for Terms and Conditions and Privacy Policy', async () => {
          await vaultWidgetPage.assertProperLegalLinks();
        });

        await test.step('Validate that the new user can be redirected to the correct URLs for Privacy Politics ', async () => {
          await vaultWidgetPage.validateLinkContent(LinkLocator.privacyLink);
        });

        await test.step('Validate that the new user can be redirected to the correct URLs for Terms and Conditions ', async () => {
          await vaultWidgetPage.validateLinkContent(LinkLocator.termsAndConditionsLink);
        });
      }
    );
  }
);
