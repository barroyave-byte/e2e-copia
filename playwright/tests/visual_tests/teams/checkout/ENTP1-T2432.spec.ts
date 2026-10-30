import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { verifyElementVisualConsistency } from '@visual/utils/visualTestingUtils';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [],
  },
  elementsConfig: {
    ...newElementsConfig,
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression @visual Vault - Validación cardholder invalido',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.mercadoPagoVisaCardSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test(
      '@ENTP1-T2432 Vault - Validación cardholder invalido',
      { tag: ['@visual', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const adminHomePage = new AdminHomePage(page, 'ES');
        const adminLoginPage = new AdminLoginPage(page);
        const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user goes to connections', async () => {
          await adminHomePage.goToConnections();
        });

        await test.step('The user configure a new connection', async () => {
          await adminConnectionsPage.configureConnection(
            ConnectionsAvailable.kushki,
            processorsConfig.kushkiProcessor
          );
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true);
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Select payment method', async () => {
          await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
          await paymentPage.clickOnPayButtonEmbedded();

          // Ensure the vault widget is loaded
          await vaultWidgetPage.assertTitleVisibleInMainView();
        });

        await test.step('Fill in new card details except cardholder name & click on pay button', async () => {
          await vaultWidgetPage.fillCardForm(
            {
              ...creditCardData.kushkiVisaSuccessfull,
              cardholder_name: '',
            },
            {
              avoidInstallmentsCall: true,
              delayInMs: 1000,
              country: 'MX',
            }
          );

          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          await vaultWidgetPage.assertAlertInvalidCardInfo();

          await verifyElementVisualConsistency(
            vaultWidgetPage.page,
            'vault_embed_container',
            [
              {
                label: 'desktop',
                width: 1520,
                height: 1080,
              },
            ],
            'validate-missing-cardholder-name'
          );
        });

        await test.step('Fill cardholder name without last name & click on pay button', async () => {
          await vaultWidgetPage.fillCardHolder('John');
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          await vaultWidgetPage.assertAlertInvalidCardInfo();
          await verifyElementVisualConsistency(
            vaultWidgetPage.page,
            'vault_embed_container',
            [
              {
                label: 'desktop',
                width: 1520,
                height: 1080,
              },
            ],
            'validate-missing-last-name-cardholder-name'
          );
        });

        await test.step('Fill cardholder name with last name & click on pay button', async () => {
          await vaultWidgetPage.fillCardHolder('John Doe');
          await paymentPage.clickOnExternalButtonPay(vaultWidgetPage.page);
          await vaultWidgetPage.assertAlertInvalidCardInfoNotVisible();
        });
      }
    );
  }
);
