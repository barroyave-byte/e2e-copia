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
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { fullPaymentLinkCustomStyle } from '@support/mocks/customStyles/fullPaymentLink';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const checkout_modules = [
  { name: 'LoginPattern' },
  { name: 'OrderDetailPattern' },
  { name: 'UserInfoPattern' },
];

test.describe(
  '@regression Payment Link: Validate complete CustomStyle configuration',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let themeData: { config: typeof fullPaymentLinkCustomStyle };
    let email: string;
    const themeName = 'PaymentLinkFullCustomStyleE2E';

    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let merchantToken: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService, checkoutConfigurationService }) => {
      email = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      merchantToken = merchant.merchantToken;
      await userAuthService.registerUserAndSetAddress(
        {
          email,
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
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          country: 'MX',
          amount: 250000,
          checkout_modules,
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      const response = await checkoutConfigurationService.createTheme(
        privateKey,
        themeName,
        fullPaymentLinkCustomStyle
      );
      themeData = response.data as any;
    });

    test(
      '@ENTP1-T2602 Payment Link: Validate complete CustomStyle configuration',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        await test.step('The user opens the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        // Prevent the payment link tab from auto-closing on the status-change poll.
        await page.route('**/merchants/orders/*', async (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { order: { status: 'pending', payment: { data: { status: 'pending' } } } },
            }),
          });
        });

        const paymentLinkPage = await page.waitForEvent('popup', { timeout: 10000 });
        const validateEmailPage = new ValidateEmailPage(paymentLinkPage);
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);

        const patterns = fullPaymentLinkCustomStyle;

        await test.step('The user continues as guest', async () => {
          await validateEmailPage.enterEmail(email);
        });

        await test.step('theme.colors + typography applied on the login/OTP screen', async () => {
          await loginPage.assertPresenceViewOTP('sms-passwordless');
          await loginPage.assertOtpTitleTextIsVisible(
            patterns.OtpPage.overrides.Headings.props.title
          );
          await loginPage.clickOnContinueWithoutEnterCode();
        });

        await test.step('CardPattern: card form field labels', async () => {
          await paymentPage.assertCardInputIsVisible();
          const cardInputs = patterns.CardPattern.translations.es.inputs;
          await paymentPage.assertCardFormFieldLabelsAreVisible(
            cardInputs.cardNumber.label,
            cardInputs.cardHolder.label
          );
        });

        await test.step('PoweredByPattern: image url, hide-text and inline styles', async () => {
          await paymentPage.assertPoweredByLogoUrlAndWidth(
            patterns.PoweredByPattern.url,
            patterns.PoweredByPattern.imageStyle.width
          );
        });

        await test.step('UserInfoPattern: fill phone number', async () => {
          const phone = userAddressCreditCard.userAddressCreditCardMX.phone.slice(2);
          await paymentPage.fillUserInfoPhone(phone);
        });

        await test.step('The user fills credit card information and pays', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.kushkiVisaSuccessfull, {
            country: 'MX',
          });
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });

        await test.step('ThankYouView: status text and Body title override', async () => {
          await paymentPage.assertThankyouStatusTextIsVisible(
            themeData.config.ThankYouView.translations.es.thankYouPage.status.succeeded
          );

          await paymentPage.assertThankyouBodyTitleIsVisible(
            themeData.config.ThankYouView.overrides.Body.props.title
          );
        });
      }
    );
  }
);
