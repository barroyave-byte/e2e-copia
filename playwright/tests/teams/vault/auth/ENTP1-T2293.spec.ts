import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
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
  '@regression Usuario autenticado con OTP',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
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

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.stripeVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);

      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );

      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        creditCardData.stripeVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        userData.userDataMX,
        privateKey
      );

      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        creditCardData.stripeVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        userData.userDataMX,
        privateKey
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2293 Auth (8): Usuario autenticado con OTP, con tarjetas guardadas, con toggle',
      { tag: ['@smoke', '@auth', '@preprod', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);

        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const vaultWidgetPage = new VaultWidgetPage(page);

        const savedCard = creditCardData.stripeVisaSuccessful;
        const savedCardLastNumbers = `**** ${savedCard.number.slice(-4)}`;

        await test.step('Fill Otp', async () => {
          await vaultWidgetPage.enterOtpCode();
        });
        await test.step('Verify saved cards are visible', async () => {
          await vaultWidgetPage.assertSavedCardIsVisible(savedCardLastNumbers);
        });
        await test.step('Verify "Save card" toggle is visible and interactive', async () => {
          await vaultWidgetPage.clickOnAddNewCard();
          await vaultWidgetPage.assertSaveCardToggleIsVisible();
        });

        await test.step('Fill in new card details and enable "Save card" toggle', async () => {
          await vaultWidgetPage.fillFormVault(
            creditCardData.mercadoPagoVisaCardTokenizationSuccessful,
            { avoidInstallmentsCall: true, country: 'MX' }
          );
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
