import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantVault = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Compra Exitosa de Usuario Nuevo: con tarjeta nueva e installments usando el Vault Widget',
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
      const merchant = await configMerchantVault.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        // Open the testing page and navigate to the widget to be tested
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    // Test case pending to validate a successful purchase with a new user and a new card with installments
    test(
      '@ENTP1-T2008 Compra Exitosa de Usuario Nuevo: con tarjeta nueva e installments usando el Vault Widget',
      { tag: ['@smoke', '@installments', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);
        const installments = '3';

        await test.step('it is validated that user sees terms and conditions and privacy policy', async () => {
          await vaultWidgetPage.assertUserSeeTermsAndConditions();
        });

        await test.step('fill out the credit card form and click save', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.globalpayVisaSuccessful, {
            avoidInstallmentsCall: true,
            country: 'CO',
          });
          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('Validate that the BIN is correctly sent within the request to retrieve installments params request', async () => {
          await vaultWidgetPage.sendPostMessageToRefetchOrder();
        });
      }
    );
  }
);
