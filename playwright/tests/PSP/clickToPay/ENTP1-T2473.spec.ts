import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { FormsPage } from '@pages/explore/formsPage';
import { ClickToPayFormPage } from '@pages/explore/forms/clickToPayFormPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { avoidAntibot } from '@support/utils/avoidAntibot';
import { userDataCO } from '@support/interfaces/user_data';
import createBasicOrder from '@support/mocks/orders/basicOrder';
import { randomUUID } from 'crypto';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantVault = new ConfigMerchant();

const email = EmailGenerator.generateRegisteredUserEmail();
const customThemeConfig = {
  TermsConditionsPattern: {
    showForGuest: true,
    showForAuth: false,
    legalMessage: 'Al continuar, aceptas nuestras condiciones de uso.',
    connectorText: 'y',
    hideCompanyDisclaimer: false,
    termsAndConditionsUrl: 'https://www.example.com/terms',
    privacyPolicyUrl: 'https://www.example.com/privacy',
    termsUrlClickToPay: 'https://www.example.com/click_to_pay_terms',
    requiresAcceptance: true,
  },
};
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customThemeConfig),
      },
    ],
  },
};

test.describe(
  '@regression Click to Pay Purchase - MX',
  { tag: ['@checkout', '@elements_link', '@click_to_pay'] },
  () => {
    let orderToken: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
      const merchantSetup = await configMerchantVault.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      privateKey = merchantSetup.privateKey;
      publicKey = merchantSetup.publicKey;

      await checkoutConfigurationService.configClickToPay(
        merchantId,
        merchantToken,
        generalWidgetConfig.elementsConfig.theme_config
      );

      const basicOrder = createBasicOrder();
      const payloadOrder = {
        order: {
          ...basicOrder.order,
          first_name: '',
          last_name: '',
          shipping_address: {
            ...basicOrder.order.shipping_address,
            email: '',
            first_name: '',
            last_name: '',
          },
          billing_address: {
            ...basicOrder.order.billing_address,
            email: '',
            first_name: '',
            last_name: '',
          },
        },
      };

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, payloadOrder as any))
        .data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nuveiProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page }) => {
        await avoidAntibot(page);

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2473 Payment Widget: Payment Widget: Guest Flow: T&C acceptance in Click-to-Pay No-Email Flow',
      { tag: ['@team_enterprise', '@team_payment_integration'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const formsPage = new FormsPage(page);
        const clickToPayFormPage = new ClickToPayFormPage(page);

        await test.step('Should select Click to Pay as a Payment Method', async () => {
          await paymentPage.selectPaymentMethod('Click to Pay (Payment Widget)');
        });
        await test.step('Should open Click To Pay Form', async () => {
          await formsPage.clickOnPay();
        });
        await test.step('Should see Collect Email Page Title', async () => {
          await clickToPayFormPage.assertCollectEmailHeadings();
        });
        await test.step('Attempt to continue without Terms and Conditions acceptance', async () => {
          await clickToPayFormPage.attemptToContinue({ withoutEmail: true });
        });
        await test.step('Fill email field', async () => {
          await clickToPayFormPage.fillEmail(email);
        });
        await test.step('Attempt to continue without accepting Terms and Conditions and filling Email', async () => {
          await clickToPayFormPage.attemptToContinue({ withoutTermsAndConditions: true });
        });
        await test.step('User accepts Terms and Conditions via checkbox', async () => {
          await clickToPayFormPage.clickOnAcceptTermsAndConditions();
        });
        await test.step('User clicks on T&C link and closes the tab', async () => {
          await clickToPayFormPage.opensTermsConditionsPage(
            customThemeConfig.TermsConditionsPattern.termsUrlClickToPay
          );
        });
        await test.step('Continue with purchase after accepting Terms and Conditions', async () => {
          await clickToPayFormPage.clickOnContinue();
        });
        await test.step('Fill user data', async () => {
          await clickToPayFormPage.fillUserData({ ...userDataCO });
        });
        await test.step('Fill credit card information', async () => {
          await clickToPayFormPage.fillCardInfo(creditCardData.clickToPayMastercardSuccess);
        });
        await test.step('Click continue button', async () => {
          await clickToPayFormPage.clickOnContinue();
        });
        await test.step('Fill Mastercard User Info', async () => {
          await clickToPayFormPage.fillMastercardUserInfo();
        });
        await test.step('The thank you page should be displayed on the merchant', async () => {
          await clickToPayFormPage.assertUserDataIsSendInPurchaseRequest({ ...userDataCO });
          await paymentPage.assertThankyouPage('Pago completado');
        });
      }
    );
  }
);
