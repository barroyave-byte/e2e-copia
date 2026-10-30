import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { newCustomStyle } from '@support/mocks/newcustomStyle';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { getExplorerHeaderLocator } from '@visual/utils/masks_locators';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const customStyles = {
  ...newCustomStyle,
  PaymentButtonPattern: {
    label: 'Completar pago por',
    showOrderTotal: false,
  },
};
const generalWidgetConfig: apiCallNewman.CreateConfigurationV2 = {
  widgetGeneralsConfig: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(customStyles),
      },
    ],
  },
};
const amountDisplay = 'COP 1.900,00';

test.describe(
  '@regression @visual PaymentWidget: Validar aplicación correcta de CustomStyle en flujo de loggeado previamente',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
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

      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: 190000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.globalpayVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      const cards = [
        creditCardData.globalpayVisaSuccessful,
        creditCardData.redsysMastercardSuccessful,
        creditCardData.stripeMastercardSuccessful,
      ];

      for (const card of cards) {
        await apiCallNewman.setCreditCardForUser(
          userEmail,
          card,
          userAddressCreditCard.userAddressCreditCardCO,
          merchantId,
          privateKey
        );
      }

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
      await apiCallNewman.createConfigurationV2(generalWidgetConfig, merchantId, merchantToken);

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2155 PaymentWidget: Validar aplicación correcta de CustomStyle en flujo de loggeado previamente',
      { tag: ['@visual', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const explorerHeaderLocator = getExplorerHeaderLocator(page);

        await test.step('The user opens the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Assert pay button has proper custom styles', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();

          const payButton = customStyles.PaymentButtonPattern;
          const customColors = customStyles.theme.colors;

          await paymentDeunaNowPage.assertPayButtonCustomStyles(
            {
              ...payButton,
              amountDisplay,
            },
            customColors
          );
        });

        await test.step('User verifies UI ', async () => {
          await paymentDeunaNowPage.waitForWidgetSkeletonToDisappear();
          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-1-verify-welcome-view',
            {
              maskLocators: [
                paymentDeunaNowPage.iframeZoidVisible
                  .locator('p:has-text("Usar tarjeta seleccionada")')
                  .locator('..'),
                explorerHeaderLocator,
              ],
              threshold: 0.1,
              maxDiffPixelRatio: 0.02,
            }
          );
        });

        await test.step('Assert tokenized card view styles', async () => {
          await paymentDeunaNowPage.clickOnSeeAllMyCards();
          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-2-verify-tokenized-cards-view',
            {
              maskLocators: [paymentDeunaNowPage.selectCards, explorerHeaderLocator],
              threshold: 0.1,
              maxDiffPixelRatio: 0.02,
            }
          );
        });

        await test.step('Assert card actions buttons styles', async () => {
          const lastFour = creditCardData.redsysMastercardSuccessful.number.slice(-4);

          await paymentDeunaNowPage.openCardActions(lastFour);
          await paymentDeunaNowPage.assertElementHoverBgColor(
            paymentDeunaNowPage.buttonSetCardAsDefault(lastFour),
            newCustomStyle.theme.colors.buttonPrimaryFill
          );

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-3-verify-card-action-hover-background-color',
            {
              maskLocators: [paymentDeunaNowPage.selectCards, explorerHeaderLocator],
              threshold: 0.1,
              maxDiffPixelRatio: 0.02,
            }
          );
        });
      }
    );
  }
);
