import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { ValidateEmailPage } from '@pages/payment_link/user_data/validateEmailPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { PaymentLinkRedirectPage } from '@pages/bnpl/paymentLinkPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import {
  THEME_PAYMENT_LINK_COLORS,
  THEME_PAYMENT_LINK_PATTERNS,
} from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const email = EmailGenerator.generateRegisteredUserEmail();

declare const window: Window & { disablePolling: any };
const checkout_modules = [
  {
    name: 'OrderDetailPattern',
    props: {
      hide_product_image: true,
    },
  },
  {
    name: 'LoginPattern',
  },
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: false,
      fields: [
        {
          name: 'first_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'identity_document',
          validation: {
            required: false,
          },
        },
        {
          name: 'phone',
          validation: {
            required: true,
          },
        },
        {
          name: 'address1',
          validation: {
            required: false,
          },
        },
        {
          name: 'address2',
          validation: {
            required: false,
          },
        },
        {
          name: 'zipcode',
          validation: {
            required: true,
          },
        },
        {
          name: 'country',
          validation: {
            required: true,
          },
        },
        {
          name: 'state_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'city',
          validation: {
            required: true,
          },
        },
      ],
    },
  },
];

test.describe(
  '@regression BillingForm with User Authenticated',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let themeData;
    const themeName = 'PaymentLinkCustomStyleE2E';

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService, checkoutConfigurationService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

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
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: MERCHANT_LOGO_WIDGETS_CONFIG },
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder('MX', privateKey, {
        user_email: email,
        checkout_modules: checkout_modules,
        amount: 250000,
        phone: '+525566794032',
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      const response = await checkoutConfigurationService.createTheme(privateKey, themeName, {
        theme: THEME_PAYMENT_LINK_COLORS,
        ...THEME_PAYMENT_LINK_PATTERNS,
      });
      themeData = response.data as any;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        await page.addInitScript(() => {
          window.disablePolling = true;
        });
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2115 Payment Link: Purchase successfully with billing custom data as user authenticated',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup', { timeout: 20000 });

        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const validateEmailPage = new ValidateEmailPage(paymentLinkPage);
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);
        const paymentLinkRedirect = new PaymentLinkRedirectPage(paymentLinkPage);
        let purchaseResponse;

        await test.step('The user continues as guest', async () => {
          await validateEmailPage.enterEmail(email);
        });

        await test.step('Enter login OTP Code ', async () => {
          await loginPage.assertLockIconToBeVisible();
          await loginPage.assertPresenceInputOTP();

          await loginPage.enterOtpCode();
        });

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.kushkiVisaSuccessfull, {
            country: 'MX',
          });
        });

        await test.step('The user fills billing data information', async () => {
          await paymentLinkRedirect.openBillingFormFlexible();
          await paymentLinkRedirect.selectCountry();
          await paymentLinkRedirect.fillBillingForm();
        });

        await test.step('The user clicks on pay button', async () => {
          await paymentPage.clickOnPay();
          const response = await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });

          purchaseResponse = (await response.json()).order;
        });

        await test.step('Redirect to Thank you page and verify status', async () => {
          await paymentLinkRedirect.assertPaymentStatusOnPage(
            themeData.config.ThankYouView.translations.es.thankYouPage.status.succeeded
          );
        });

        await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
