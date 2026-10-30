import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { defaultCheckoutModules } from '@support/utils/checkoutModules';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { expect, test } from '@support/fixtures';
import envConfig from '@support/envConfig';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';

const configMerchantCheckout = new ConfigMerchantCheckout();
let merchantConfig: BasicMerchantResult;
let merchant2Config: BasicMerchantResult;

const userEmail = `persistlaurente${Date.now()}.qa@deuna.com`;
const exploreAlternativeUrl = envConfig.EXPLORE_ALTERNATIVE_URL;

test.describe(
  '@regression PaymentLink - CDL with private networks',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let network: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      merchantConfig = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      merchantName = merchantConfig.merchantName;
      privateKey = merchantConfig.privateKey;
      publicKey = merchantConfig.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.paymentezProcessor,
        merchantId,
        merchantToken
      );

      const { networkId } = await apiCallNewman.createNetwork(
        merchantConfig.merchantId,
        merchantConfig.merchantToken
      );

      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.conektaFraud.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.paymentezVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      // The first merchant's order: what `beforeEach` opens. Reassigned further down to
      // merchant2's order, which is the one the "Explore Alternative" step opens.
      orderToken = (
        await emaService.tokenizeDeunaPaymentLinkOrder('MX', merchantConfig.privateKey, {
          user_email: userEmail,
        })
      ).data.token;

      await apiCallNewman.createCheckoutModulesConfig(
        defaultCheckoutModules,
        merchantId,
        merchantToken
      );

      network = networkId;
    });

    test.beforeEach(async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    });

    test(
      '@ENTP1-T2460 PaymentLink - CDL with private networks',
      { tag: ['@team_enterprise'] },
      async ({ page, emaService }) => {
        //random visitorID
        const visitorId = `c07c2cc8beaa54f282aa35e58fb9c300-${Date.now()}`;

        // Known backend issue: reusing the same visitorID across different emails
        // breaks the CDL flow. We mock the /users/probe response with a unique
        // visitorID per run to isolate the test from this behavior.
        // TODO: revisit once the backend handles this case correctly.
        await page.context().route('**/users/probe', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 'success',
              data: {
                visitorId: visitorId,
                confidence: 0.9,
                version: '1.0',
                createdAt: '2026-07-22T19:11:23Z',
                salt: '',
              },
            }),
          });
        });

        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);

        async function enterOtpAndReload() {
          await loginPage.enterOtpCode('010101');
          await loginPage.waitForLoginFinish();

          await paymentPage.assertCvvCodeToBeVisible();
          await paymentLinkPage.reload();
        }

        await test.step('The user inputs otp and reloads page', async () => {
          await enterOtpAndReload();
        });

        await test.step('The user fills existing credit card information cvv from CDL', async () => {
          await paymentPage.fillCvvCode(creditCardData.paymentezVisaSuccessful.cvv_code);
        });

        await test.step('create another merchant', async () => {
          merchant2Config = await configMerchantCheckout.basicSetup('MX');
          merchantId = merchant2Config.merchantId;
          merchantName = merchant2Config.merchantName;
          privateKey = merchant2Config.privateKey;
          publicKey = merchant2Config.publicKey;
          await apiCallNewman.createPaymentProcessor(
            processorsConfig.paymentezProcessor,
            merchantId,
            merchantToken
          );

          await apiCallNewman.addMerchantToNetwork(
            network,
            merchant2Config.merchantId,
            merchant2Config.merchantToken
          );

          const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder(
            'MX',
            merchant2Config.privateKey,
            {
              user_email: userEmail,
            }
          );
          orderToken = tokenized.data.token;
          orderId = tokenized.data.order.order_id;

          await apiCallNewman.createCheckoutModulesConfig(
            defaultCheckoutModules,
            merchantId,
            merchantToken
          );
        });

        await test.step('User navigates to another "Explore Alternative" domain and opens the payment link', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          const options = {
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
            deleteSession: false,
            exploreUrl: exploreAlternativeUrl,
          };
          await testingTool.navigateAndSetup(options);
          expect(page.url()).toBe(`${exploreAlternativeUrl}cart`);
        });

        const paymentLinkPage2 = await page.waitForEvent('popup');
        const paymentPage2 = new PaymentPage(paymentLinkPage2);

        await test.step('The user fills existing credit card information cvv from CDL', async () => {
          await paymentLinkPage2.reload();

          await paymentPage2.fillCvvCode(creditCardData.paymentezVisaSuccessful.cvv_code);
        });

        await test.step('The user clicks on sign out and confirms signout', async () => {
          await paymentPage2.clickOnSignOut();
          await paymentPage2.confirmSignOut();
        });
      }
    );
  }
);
