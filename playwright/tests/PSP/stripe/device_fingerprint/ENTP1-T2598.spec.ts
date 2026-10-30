import { test } from '@support/fixtures';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { GuestUserDataPage } from '@pages/payment_link/user_data/guestUserDataPage';
import * as userData from '@support/interfaces/user_data';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { STRIPE_FRAUD_SETTINGS } from '@support/http/testData/fraudSettings/FraudSettingsConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Payment Link: Stripe fraud credentials configured via API - device fingerprint is sent in purchase request',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService, userAuthService, fraudSettingsService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.stripeVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );

      // Configure Stripe fraud credentials through the fraud-settings API.
      // The hosted payment-link checkout must pick this config up and load the
      // Stripe anti-fraud SDK so the device fingerprint is generated and sent in
      // the purchase request.
      await fraudSettingsService.updateFraudSettings(
        merchantToken,
        merchantId,
        STRIPE_FRAUD_SETTINGS
      );

      orderToken = (
        await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
          privateKey,
          DeunaPaymentLinkOrderBuilder.createBodyFromCommerce({
            country: 'MX',
            user_email: email,
            order_id: `test_order_${Math.floor(Math.random() * 9999999)}`,
          })
        )
      ).data.token;

      await apiCallNewman.createCheckoutModulesConfig(
        [
          { name: 'LoginWithEmailOrderPattern' },
          { name: 'UserInfoPattern' },
          { name: 'OrderDetailPattern' },
        ],
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the Payment Link',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2598 Payment Link: Stripe - fraud credentials via API - device fingerprint is sent into purchase request',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);
        const guestUserPage = new GuestUserDataPage(paymentLinkPage);

        await test.step('The user continues as guest', async () => {
          await loginPage.clickOnContinueWithoutEnterCode();
        });

        await test.step('The user fills user information', async () => {
          await guestUserPage.enterGuestUserData(userData.userDataMX);
        });

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.stripeVisaSuccessful, {
            country: 'MX',
          });
        });

        await test.step('The user clicks on pay button', async () => {
          await paymentPage.clickOnPay(paymentLinkPage);
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });

        await test.step('The device fingerprint is sent into purchase request with Stripe', async () => {
          await paymentPage.assertDeviceIdInPurchaseRequest({
            antiFraudProvider: ['stripe'],
          });
        });
      }
    );
  }
);
