import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { legacyThemeConfig } from '@support/mocks/legacyThemeConfig';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchantVault = new ConfigMerchant();

test.describe('@regression Realizar compra fallida', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchantVault.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    // configures the vault widget with the legacy theme
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken, {
      customThemeConfig: legacyThemeConfig,
    });

    const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.globalpayProcessor,
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
    '@PI-T1632 Realizar compra fallida con usuario invitado con tarjeta de crédito invalida - TiendaMia',
    { tag: ['@payments_integration', '@team_enterprise', '@preprod', '@purchase'] },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('Validate user sees terms and conditions and privacy policy', async () => {
        await vaultWidgetPage.assertUserSeeTermsAndConditions();
      });

      await test.step('Fill out the credit card form and save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.cybersourceVisaFailed, {
          avoidInstallmentsCall: true,
          country: 'CO',
        });
        await vaultWidgetPage.assertButtonEnabled();
      });

      await test.step('User selects Pay', async () => {
        await vaultWidgetPage.clickOnPay();
        await test.step('Validate card and purchase V2 failed', async () => {
          // Validate that the request /cards sent from the UI is correct.
          const cardId = await vaultWidgetPage.assertCardRequest();
          // Validate that the request v2/purchase sent from the UI is correct.
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('denied', 422, cardId);
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('denied');
        });
      });
    }
  );
});
