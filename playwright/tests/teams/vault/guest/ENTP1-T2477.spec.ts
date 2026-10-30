import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { verifyIframeVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModulesForWidgetConfig[] = [];
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
};

test.describe(
  '@regression Elements: Refresh installments after adding new item to cart',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'Configure merchant and then the user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        await apiCallNewman.createCampaignMCI('COP', merchantId, merchantToken);
        await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', false, true);
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const ecommercePage = new EcommercePage(page);
        await ecommercePage.clickOnProduct();
        await ecommercePage.addToCart();
        await ecommercePage.clickOnIconBasket();
        await testingTool.navigateToSelectOrderType();
      }
    );

    test(
      '@ENTP1-T2477 Elements: Refresh installments after adding new item to cart',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill card form', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.globalpayVisaSuccessful, {
            country: 'CO',
          });
        });

        await test.step('User select MSI', async () => {
          await paymentDeunaNowPage.selectInstallmentsMCI('3');
        });

        await test.step('User verifies card screen with installments', async () => {
          await vaultWidgetPage.assertInstallmentsFieldVisible();
          await verifyIframeVisualConsistency({
            frameLocator: vaultWidgetPage.iframeVault,
            viewports: commonViewportSets.desktopAndFullscreen,
            snapshotName: 'step1-verify-card-screen-with-installments',
          });
        });

        await test.step('add new item to cart', async () => {
          paymentDeunaNowPage.waitResponseFromInstallments();
          await vaultWidgetPage.clickAddProduct();
          await paymentDeunaNowPage.waitForInstallmentsResponse();
        });

        await test.step('User verifies card screen with installments recalculated', async () => {
          await vaultWidgetPage.assertInstallmentsFieldVisible();
          await verifyIframeVisualConsistency({
            frameLocator: vaultWidgetPage.iframeVault,
            viewports: commonViewportSets.desktopAndFullscreen,
            snapshotName: 'step2-verify-card-screen-with-installments-recalculated',
          });
        });
      }
    );
  }
);
