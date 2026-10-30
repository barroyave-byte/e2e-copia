import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { legacyThemeConfig } from '@support/mocks/legacyThemeConfig';
import { newElementsConfig } from '@support/mocks/newThemeConfig';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

const globalAssert = new GlobalAssert();
const configMerchantVault = new ConfigMerchant();

const customConfig: apiCallNewman.ConfigurationV2 = {
  elementsConfig: {
    ...newElementsConfig,
    theme_config: legacyThemeConfig,
  },
};

test.describe(
  '@regression Compra Exitosa de Nuevo Usuario con Tarjeta Nueva usando el Vault Widget y Verificación de Retrocompatibilidad con Legacy Theme Config',
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
      // configures the vault widget with the legacy theme
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, customConfig);

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
      '@ENTP1-T2011 Compra Exitosa de Nuevo Usuario con Tarjeta Nueva usando el Vault Widget y Verificación de Retrocompatibilidad con Legacy Theme Config',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Validate user sees terms and conditions and privacy policy', async () => {
          await vaultWidgetPage.assertUserSeeTermsAndConditions();
        });

        await test.step('Fill out the credit card form and save', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.stripeVisaSuccessful, {
            country: 'MX',
          });
          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('User selects Pay', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('Validate card and purchase V2 request is sent', async () => {
          // Validate that the request /cards sent from the UI is correct.
          const cardId = await vaultWidgetPage.assertCardRequest();
          // Validate that the request v2/purchase sent from the UI is correct.
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardId);
          // Validate that when doing a get order, the status is correct.
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
