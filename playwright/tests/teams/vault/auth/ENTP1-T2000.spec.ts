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
const updateInstallment = {
  language: 'es',
  one_or_no_installment_option: '{installments} de ${total_amount} sin interés',
  MSI: '{installments} de ${amount} sin interés',
  MCI: '{installments} de ${amount} con interés del {rate}%',
};
const customInstallmentLabel = '1 de $2500.00 sin interés';

test.describe(
  '@regression Compra Exitosa de Usuario Nuevo: con tarjeta nueva e installments usando el Vault Widget',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let orderToken: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, paymentMsiService }) => {
      const merchantSetup = await configMerchantVault.basicSetup('CO');
      const { merchantId, merchantToken } = merchantSetup;
      privateKey = merchantSetup.privateKey;
      publicKey = merchantSetup.publicKey;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

      orderToken = (
        await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
          user_email: userEmail,
          amount: 250000,
        })
      ).data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );

      await paymentMsiService.configCampaign(
        merchantId,
        merchantToken,
        'COP',
        'MSI',
        undefined,
        updateInstallment
      );
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
      '@ENTP1-T2000 Compra Exitosa de Usuario Nuevo: con tarjeta nueva e installments usando el Vault Widget',
      { tag: ['@smoke', '@installments', '@remove_preprod', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);
        const installments = '1';

        await test.step('it is validated that user sees terms and conditions and privacy policy', async () => {
          await vaultWidgetPage.assertUserSeeTermsAndConditions();
        });

        await test.step('fill out the credit card form and click save', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.globalpayVisaSuccessful, {
            country: 'CO',
          });
          await vaultWidgetPage.assertButtonEnabled();
        });
        await test.step('User clicks in No Installments Option', async () => {
          await vaultWidgetPage.selectInstallmentsMSI(installments, customInstallmentLabel);
        });

        await test.step('User select Pay', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('It is validated that the card, installments plan_option_id and purchase V2 request is sent', async () => {
          const cardId = await vaultWidgetPage.assertCardRequest();

          await vaultWidgetPage.assertPurchaseSendInstallmentObject();
          await vaultWidgetPage.assertPurchaseSendProperPlanOptionId(installments);
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardId);
        });
      }
    );
  }
);
