import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

const configMerchantVault = new ConfigMerchant();

const identityNumber = IDENTITY_DOCUMENTS.EC.CI;
const language = 'EN';

test.describe(
  '@regression Elements: Configuración de idioma independiente del país desde el WebSdk',
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
      const merchant = await configMerchantVault.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

      const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
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
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Vault (Web SDK)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          language,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2150 Elements: Configuración de idioma independiente del país desde el WebSdk',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page, language);

        await test.step('Verify title load in main view', async () => {
          await vaultWidgetPage.assertTitleVisibleInMainView();
        });

        await test.step('Fill out the credit card form and save', async () => {
          await vaultWidgetPage.fillFormVault(
            {
              ...creditCardData.stripeVisaSuccessful,
              document_number: identityNumber,
            },
            { avoidInstallmentsCall: true }
          );

          await vaultWidgetPage.assertDocumentNumberHasContentOnlyNumbers(identityNumber);
          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('confirm card save', async () => {
          await vaultWidgetPage.clickOnSaveCards();
        });
      }
    );
  }
);
