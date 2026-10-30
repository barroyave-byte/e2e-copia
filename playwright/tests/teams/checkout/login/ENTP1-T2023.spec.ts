import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { defaultCheckoutModules } from '@support/utils/checkoutModules';
import { PaymentLinkRedirectPage } from '@pages/bnpl/paymentLinkPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();
const globalAssert = new GlobalAssert();

const email = EmailGenerator.generateRegisteredUserEmail();

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

    test.beforeAll(async ({ emaService, checkoutConfigurationService, userAuthService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: IDENTITY_DOCUMENTS.MX.RFC,
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

      // Set credit card for user
      await apiCallNewman.setCreditCardForUser(
        email,
        creditCardData.kushkiVisaSuccessfull,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder('MX', privateKey, {
        user_email: email,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await checkoutConfigurationService.createConfigCheckoutV2({
        merchant_token: merchantToken,
        merchant_id: merchantId,
        config_checkout_v2_data: {
          widgets_general_config: {
            checkout_modules: defaultCheckoutModules,
          },
        },
      });
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
      '@ENTP1-T2023 Compra exitosa con TC/TD y usuario AUTENTICADO CDL - Email desde ecommerce',
      { tag: ['@review_action', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);
        const paymentlinkRedirect = new PaymentLinkRedirectPage(paymentLinkPage);

        async function enterOtpAndReload() {
          await loginPage.assertPresenceInputOTP();
          await loginPage.enterOtpCode('010101');
          await loginPage.waitForLoginFinish();

          await paymentPage.assertCvvCodeToBeVisible();
          await paymentLinkPage.reload();
        }

        await test.step('The user inputs otp and reloads page', async () => {
          await enterOtpAndReload();
        });

        await test.step('The user inputs otp and reloads page again', async () => {
          await enterOtpAndReload();
        });

        await test.step('The user fills existing credit card information cvv from CDL', async () => {
          await paymentPage.assertCvvCodeToBeVisible();
          await paymentPage.fillCvvCode(creditCardData.kushkiVisaSuccessfull.cvv_code);
        });

        await test.step('The user does NOT see terms and conditions', async () => {
          await paymentPage.assertUserDoesNotSeeTermsAndConditions();
        });

        await test.step('The user enter country required', async () => {
          await paymentlinkRedirect.selectCountry();
        });

        await test.step('The user enter zipcode required', async () => {
          await paymentPage.enterBillingZipCode();
        });

        await test.step('The user clicks on pay button', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });

        await test.step('order is processed successfully', async () => {
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
