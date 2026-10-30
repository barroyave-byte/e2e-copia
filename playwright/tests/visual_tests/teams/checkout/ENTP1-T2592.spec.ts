import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

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
  '@regression @visual Alert Success - Tarjeta eliminada exitosamente',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      orderToken = (
        await emaService.tokenizeDeunaNowOrder('MX', privateKey, { user_email: userEmail })
      ).data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.kushkiMasterCardExitosa.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.kushkiMasterCardExitosa,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.kushkiVisaSuccessfull,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test(
      '@ENTP1-T2592 Alert Success - Tarjeta eliminada exitosamente',
      { tag: ['@visual', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('Open Payment Widget with authenticated user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Wait for widget to fully load with saved cards', async () => {
          await paymentDeunaNowPage.waitForWidgetSkeletonToDisappear();
        });

        await test.step('Navigate to "Ver mis tarjetas" screen', async () => {
          await paymentDeunaNowPage.clickOnSeeAllMyCards();
        });

        await test.step('Visual snapshot of saved cards list', async () => {
          await verifyVisualConsistency(
            page,
            commonViewportSets.desktopOnly,
            'visual-alert-cards-list'
          );
        });

        const lastFourToDelete = creditCardData.kushkiVisaSuccessfull.number.slice(-4);

        await test.step('Open card actions menu (three dots)', async () => {
          await paymentDeunaNowPage.openCardActions(lastFourToDelete);
        });

        await test.step('Click delete option from card actions menu', async () => {
          await paymentDeunaNowPage.clickDeleteCardOption(lastFourToDelete);
        });

        await test.step('Confirm deletion and capture alert immediately', async () => {
          await paymentDeunaNowPage.clickConfirmDeleteCard();
          await paymentDeunaNowPage.waitForSuccessAlertVisible();
          await verifyVisualConsistency(
            page,
            commonViewportSets.desktopOnly,
            'visual-alert-card-deleted-success'
          );
        });
      }
    );
  }
);
