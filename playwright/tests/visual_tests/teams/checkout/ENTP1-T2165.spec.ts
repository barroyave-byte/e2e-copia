import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { getExplorerHeaderLocator } from '@visual/utils/masks_locators';
import { amexSuccessfulMSI, paymentezVisaSuccessful } from '@support/interfaces/credit_cards';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const customStyles = {
  InstallmentsPattern: {
    overrides: {
      NoInstallmentsTooltip: {
        label: '¿Por qué no puedo pagar a meses sin intereses?',
        popoverProps: {
          title: '¿Por qué no puedo pagar a MSI?',
          list: [
            'Tu compra es menor a $2,500',
            'Tu tarjeta es de débito',
            'Tu banco no es participante',
            'Los productos no son aplicables a la promoción MSI',
          ],
          listType: 'unordered',
          textColor: 'red',
          styles: {
            padding: '16px',
            backgroundColor: 'blue',
          },
        },
      },
    },
  },
};
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
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
const userEmail = EmailGenerator.generateRegisteredUserEmail();
const body_register_user = {
  email: userEmail,
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  phone: `+57${faker.string.numeric(10)}`,
  identity_document: faker.string.numeric(9),
};
const lastFourDigitsCards = {
  amex: '0005',
  visa1: '1111',
  visa2: '4242',
};

test.describe(
  '@regression @visual PaymentWidget: Validar aplicación correcta de CustomStyle No Installment Pattern',
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

    test.beforeAll(async ({ emaService, paymentMsiService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);

      const registerResponse = await userAuthService.registerUser({
        merchantPrivateKey: merchant.privateKey,
        merchantId: merchant.merchantId,
        data: body_register_user,
      });
      const { token: registeredUserToken, user_id: userId } = registerResponse.data;

      const baseCardData = {
        expiry_month: '01',
        expiry_year: '2039',
        card_holder: 'Jean Roldan',
        card_holder_dni: '1315722768',
        address1: 'Santo Domingo 1',
        zip: '1215',
        city: 'Santo Domingo',
        state: 'Distrito Nacional',
        country: 'MX',
        phone: '12345755',
      };
      await userAuthService.setCard({
        userId,
        userToken: registeredUserToken,
        data: { ...baseCardData, card_number: '378282246310005', card_cvv: '0000' },
      });
      await userAuthService.setCard({
        userId,
        userToken: registeredUserToken,
        data: { ...baseCardData, card_number: '4111111111111111', card_cvv: '123' },
      });
      await userAuthService.setCard({
        userId,
        userToken: registeredUserToken,
        data: { ...baseCardData, card_number: '4242424242424242', card_cvv: '123' },
      });

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );

      await paymentMsiService.configCampaign(merchantId, merchantToken, 'COP', 'MSI', [
        'mastercard',
        'amex',
        'diners',
      ]);

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: 190000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2165 PaymentWidget: Validar aplicación correcta de CustomStyle No Installment Pattern',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
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

        await test.step('Verify view with tokenized card and MSI dropdown', async () => {
          await paymentDeunaNowPage.clickOnSeeAllMyCards();
          await paymentDeunaNowPage.selectTokenizedCard(lastFourDigitsCards.amex);
          await paymentDeunaNowPage.assertInstallmentsMSI();

          await page.waitForTimeout(5000);

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-1-verify-view-with-tokenized-card-and-msi-dropdown',
            {
              maskLocators: [explorerHeaderLocator],
            }
          );
        });

        await test.step('Verify no installments label and tooltip', async () => {
          await paymentDeunaNowPage.clickOnSeeAllMyCards();
          await paymentDeunaNowPage.selectTokenizedCard(lastFourDigitsCards.visa1);
          await paymentDeunaNowPage.assertNoInstallmentsTooltip();

          await paymentDeunaNowPage.hoverElement(paymentDeunaNowPage.noInstallmentTooltip);
          await paymentDeunaNowPage.assertNoInstallmentsPopover();
          await paymentDeunaNowPage.hoverElement(paymentDeunaNowPage.imagePoweredByDeuna, true);

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-2-verify-view-with-no-installments-label-and-tooltip-icon',
            {
              maskLocators: [explorerHeaderLocator],
            }
          );
        });

        await test.step('Verify new card form with no installments label and tooltip', async () => {
          await paymentDeunaNowPage.selectOptionAddNewCreditCard();
          await paymentDeunaNowPage.fillInputCreditCardNumber(paymentezVisaSuccessful.number);
          await paymentDeunaNowPage.assertNoInstallmentsTooltip();

          await paymentDeunaNowPage.hoverElement(paymentDeunaNowPage.noInstallmentTooltip);
          await paymentDeunaNowPage.assertNoInstallmentsPopover();
          await paymentDeunaNowPage.hoverElement(paymentDeunaNowPage.imagePoweredByDeuna, true);

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-3-verify-new-card-form-with-no-installments-label-and-tooltip',
            {
              maskLocators: [explorerHeaderLocator],
            }
          );
        });

        await test.step('Verify new card form with installments dropdown', async () => {
          await paymentDeunaNowPage.clearInputsCreditCard();
          await paymentDeunaNowPage.fillInputCreditCardNumber(amexSuccessfulMSI.number);
          await paymentDeunaNowPage.assertInstallmentsMSI();

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-4-verify-new-card-form-with-installments-dropdown',
            {
              maskLocators: [explorerHeaderLocator],
            }
          );
        });
      }
    );
  }
);
