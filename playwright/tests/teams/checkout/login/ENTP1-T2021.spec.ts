import { expect, test } from '@support/fixtures';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { defaultCheckoutModules } from '@support/utils/checkoutModules';
import { MessageFeed } from '@support/utils/MessageFeed';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { OTP_REQUEST_CODE_GLOB } from '@support/mocks/requests/blockTransactionalEmails';
import { retryGetDeunaCheckoutEmailOTP } from '@support/utils/retries';

const messageFeed = new MessageFeed();
const configMerchantCheckout = new ConfigMerchantCheckout();

let inboxObj = null;

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

    test.beforeAll(async ({ userAuthService, emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      inboxObj = await messageFeed.createNewEmail();

      const email = inboxObj.email;
      const inbox = inboxObj.inbox;

      console.log(email, 'email');

      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: '+54',
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

      // send otp to email
      await userAuthService.requestOtpCode(email, privateKey);

      const otp = await retryGetDeunaCheckoutEmailOTP(
        (params) => messageFeed.getDeunaCheckoutEmailOTP(params),
        { inbox, timeout: 60000, unreadOnly: false },
        () => userAuthService.requestOtpCode(email, privateKey)
      );
      // Set credit card for user
      await apiCallNewman.setCreditCardForUser(
        email,
        creditCardData.kushkiMasterCardExitosa,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey,
        otp
      );

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBodyFromCommerce({
          country: 'MX',
          user_email: email,
          order_id: `test_order_${Math.floor(Math.random() * 9999999)}`,
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createCheckoutModulesConfig(
        defaultCheckoutModules,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        // This test reads the real OTP from the inbox, so the passwordless
        // email request must reach SES. Opt out of the global email block for
        // the whole context (the payment-link popup inherits it).
        await page.context().unroute(OTP_REQUEST_CODE_GLOB);

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test.fixme(
      '@ENTP1-T2021 Compra exitosa con TC/TD y usuario EXISTENTE - Email desde ecommerce y Autenticacion',
      { annotation: { type: 'bug', description: 'PF-3806' }, tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('The user inputs otp', async () => {
          await expect(
            loginPage.changeChannelButton,
            'Change channel button not visible'
          ).toBeVisible({ timeout: 30000 });
          await loginPage.clickOnChangeChannelButton();
          const inbox = inboxObj.inbox;

          const otp = await retryGetDeunaCheckoutEmailOTP(
            (params) => messageFeed.getDeunaCheckoutEmailOTP(params),
            { inbox, timeout: 60000, unreadOnly: true },
            () => loginPage.clickOnChangeChannelButton()
          );

          console.log(`OTP needed for login: ${otp}`);
          await loginPage.assertPresenceInputOTP();
          await loginPage.enterOtpCode(otp);
        });

        await test.step('The user fills existing credit card information cvv', async () => {
          await paymentPage.fillCvvCode(creditCardData.kushkiMasterCardExitosa.cvv_code);
        });

        await test.step('The user does NOT see terms and conditions', async () => {
          await paymentPage.assertUserDoesNotSeeTermsAndConditions();
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
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
