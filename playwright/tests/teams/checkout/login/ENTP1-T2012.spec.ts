import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ValidateEmailPage } from '@pages/payment_link/user_data/validateEmailPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

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

    test.beforeAll(async ({ emaService, userAuthService }) => {
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
          identity_document: creditCardData.conektaFraud.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );
      console.log('user_email', email);

      // Set credit card for user
      await apiCallNewman.setCreditCardForUser(
        email,
        creditCardData.conektaFraud,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.conektaProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          country_code: 'CO',
          checkout_modules: [
            { name: 'LoginPattern' },
            { name: 'UserInfoPattern' },
            {
              name: 'OrderDetailPattern',
            },
          ],
        })
      );
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
      '@ENTP1-T2012 cierre de sesion payment Link',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const validateEmailPage = new ValidateEmailPage(paymentLinkPage);
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);

        await test.step('The user logs in with an email registered in the DEUNA network', async () => {
          await validateEmailPage.enterEmail(email);
          await loginPage.enterOtpCode();
          await paymentPage.assertLoginTextsArePresent();
        });

        await test.step('The user clicks on sign out and confirms signout', async () => {
          await paymentPage.clickOnSignOut();
          await paymentPage.confirmSignOut();
        });

        await test.step('After signout, email input is once again shown', async () => {
          await validateEmailPage.assertEmailInputIsVisible();
        });
      }
    );
  }
);
