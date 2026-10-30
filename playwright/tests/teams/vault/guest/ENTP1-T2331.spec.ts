import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
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
        amount: 250000,
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
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Vault (Web SDK)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2331 Visibilidad del campo de cuotas según elegibilidad del BIN de la tarjeta',
      { tag: ['@smoke', '@installments', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('It is validated that user sees terms and conditions and privacy policy', async () => {
          await vaultWidgetPage.assertUserSeeTermsAndConditions();
        });

        await test.step('Fill out the form with a valid card that does not support installments', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.cieloRejectedUnauthorized, {
            avoidInstallmentsCall: true,
            country: 'CO',
          });
        });

        await test.step('Verify that the installments field is hidden and no loader is displayed', async () => {
          await vaultWidgetPage.assertInstallmentsFieldHidden();
        });

        await test.step('Fill out the form with a valid card that supports installments', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.cieloMasterCardSuccessful, {
            avoidInstallmentsCall: true,
            country: 'CO',
          });
        });

        await test.step('Verify that the installments field is visible for a card with installments and no loader is displayed', async () => {
          await vaultWidgetPage.assertInstallmentsLoaderIsHidden();
          await vaultWidgetPage.assertInstallmentsFieldVisible();
        });

        await test.step('Fill out the form with another valid card (with or without installments)', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.kushkiVisaMSI, {
            avoidInstallmentsCall: true,
            country: 'CO',
          });
        });

        await test.step('Shows installments loader', async () => {
          await vaultWidgetPage.assertInstallmentsFieldVisible();
        });
      }
    );
  }
);
