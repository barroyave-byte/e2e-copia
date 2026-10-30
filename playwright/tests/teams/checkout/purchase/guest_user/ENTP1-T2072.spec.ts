import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { newElementsConfig, newThemeConfig } from '@support/mocks/newThemeConfig';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const email = EmailGenerator.generateRegisteredUserEmail();
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    theme: {},

    checkout_modules: [
      {
        name: 'LoginWithEmailOrderPattern',
        props: {},
      },
      {
        name: 'UserInfoPattern',
        props: {},
      },
      {
        name: 'OrderDetailPattern',
        props: {},
      },
    ],
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: newThemeConfig,
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression Validate payment functionality from checkout',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);

      const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.conektaFraud.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.conektaProcessor,
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder('MX', privateKey, {
        user_email: email,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2072 Payment Link: Validate the correct display of the "Powered By" logo',
      {
        tag: ['@preprod', '@checkout_ui', '@team_enterprise'],
      },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);

        await test.step('The user logs in with an email registered in the DEUNA network', async () => {
          await loginPage.enterOtpCode();
          await paymentPage.assertLoginTextsArePresent();
        });

        await test.step('The user can see powered by logo', async () => {
          await paymentPage.seePoweredByLogo();
          await paymentPage.assertPoweredByLogoStyles();
        });
      }
    );
  }
);
