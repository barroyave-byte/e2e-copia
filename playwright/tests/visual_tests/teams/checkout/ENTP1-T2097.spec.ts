import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { ValidateEmailPage } from '@pages/payment_link/user_data/validateEmailPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { ThankYouPage } from '@pages/payment_link/thank_you/thankYouPage';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { THEME_PAYMENT_LINK_PATTERNS } from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression @visual Checkout Payment Link Custom Typography Prueba E2E',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let themeData;
    let email: string;
    const themeName = 'CustomTypographyE2E';
    //adding Lobster as primaryFontFamily to the theme
    const themeContent = {
      typography: {
        primaryFontFamily: 'Lobster',
      },
    };

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService, checkoutConfigurationService }) => {
      email = EmailGenerator.generateRegisteredUserEmail();

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
          identity_document: creditCardData.paymentezVisaSuccessful.document_number,
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
          checkout_modules: [
            { name: 'LoginPattern' },

            {
              name: 'OrderDetailPattern',
            },
            {
              name: 'BillingPattern',
              props: {
                fields: [
                  {
                    name: 'first_name',
                  },
                  {
                    name: 'last_name',
                  },
                  {
                    name: 'document_number',
                  },
                ],
              },
            },
          ],
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      const response = await checkoutConfigurationService.createTheme(privateKey, themeName, {
        theme: themeContent,
        ...THEME_PAYMENT_LINK_PATTERNS,
      });
      themeData = response.data as any;
    });

    test(
      '@ENTP1-T2097 - Custom Typography E2E Payment Link',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        await test.step('The user opens the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        //  We intercept the explore polling to prevent the payment link from closing when the payment status changes
        await page.route('**/merchants/orders/*', async (route) => {
          const statusPending = 'pending';
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                order: {
                  status: statusPending,
                  payment: {
                    data: {
                      status: statusPending,
                    },
                  },
                },
              },
            }),
          });
        });

        const paymentLinkPage = await page.waitForEvent('popup');

        const validateEmailPage = new ValidateEmailPage(paymentLinkPage);
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);
        const thankYouPage = new ThankYouPage(paymentLinkPage);

        let purchaseResponse;

        await test.step('The user continues as guest', async () => {
          await validateEmailPage.enterEmail(email);
        });

        await test.step('User verifies UI ', async () => {
          await loginPage.assertPresenceViewOTP('sms-passwordless');
          await loginPage.assertLockIconToBeVisible();
          await loginPage.assertPresenceInputOTP();

          await verifyVisualConsistency(
            paymentLinkPage,
            commonViewportSets.desktopAndFullscreen,
            'step1-verify-login-otp-screen',
            {
              maskLocators: [loginPage.textTimerCounter, loginPage.iconLock],
              maxDiffPixelRatio: 0.9,
            }
          );

          await loginPage.clickOnContinueWithoutEnterCode();
        });

        await test.step('User verifies UI', async () => {
          await paymentPage.assertCardInputIsVisible();
          await verifyVisualConsistency(
            paymentLinkPage,
            commonViewportSets.desktopAndFullscreen,
            'step2-verify-payment-screen'
          );
        });

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.kushkiVisaSuccessfull, {
            country: 'MX',
          });
        });

        await test.step('The user clicks on pay button', async () => {
          await paymentPage.clickOnPay();
          const response = await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });

          purchaseResponse = (await response.json()).order;
        });

        await test.step('Redirect to Thank you page and verify status', async () => {
          paymentPage.assertThankyouPageSuccess();
        });

        await test.step('User verifies UI', async () => {
          const paymentData = purchaseResponse.payment.data;

          const externalTransactionId = await paymentLinkPage.getByText(
            paymentData.external_transaction_id
          );

          await expect(externalTransactionId).toBeVisible({ timeout: 3000 });

          await thankYouPage.assertPaymentDetails(
            purchaseResponse.order_id,
            paymentData.external_transaction_id
          );

          await verifyVisualConsistency(
            paymentLinkPage,
            commonViewportSets.desktopAndFullscreen,
            'step3-verify-thank-you-screen',
            {
              maskLocators: [
                thankYouPage.rowPaymentId,
                thankYouPage.rowPaymentDate,
                thankYouPage.rowTransactionId,
                thankYouPage.rowTransactionIdDEUNA,
                thankYouPage.rowAuthorizationCode,
              ],
            }
          );
        });
      }
    );
  }
);
