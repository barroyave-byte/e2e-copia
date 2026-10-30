import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression Usuario autenticado sin OTP ',
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
      const userEmail = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createCampaignMCI('MXN', merchantId, merchantToken);
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

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test(
      '@ENTP1-T2277 Auth (4): Usuario autenticado sin OTP - con tarjetas guardadas - con toggle - user_authentication_flow = true',
      { tag: ['@smoke', '@auth', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);
        const savedCard = creditCardData.mercadoPagoVisaCardSuccessful;
        const savedCardLastNumbers = `**** ${savedCard.number.slice(-4)}`;

        await test.step('The user opens the testing page and opens the formularios page', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should select the payment experience', async () => {
          await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
          await paymentPage.clickOnPayButtonEmbedded();
        });

        await test.step('Verify saved cards are visible', async () => {
          await vaultWidgetPage.assertSavedCardIsVisible(savedCardLastNumbers);
        });

        await test.step('Verify "Save card" toggle is visible and interactive', async () => {
          await vaultWidgetPage.clickOnAddNewCard();
          await vaultWidgetPage.assertSaveCardToggleIsVisible();
        });

        await test.step('Fill in new card details and enable "Save card" toggle', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.mercadoPagoVisaCardSuccessful, {
            avoidInstallmentsCall: true,
            country: 'MX',
          });
        });

        await test.step('User selects Pay and assert event vaultSaveSuccess was fired', async () => {
          const eventPromise = vaultWidgetPage.assertEventWasFired('vaultSaveSuccess');
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          await eventPromise;
        });
      }
    );
  }
);
