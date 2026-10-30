import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { commonViewportSets } from '@visual/utils/viewports';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { EmailGenerator } from '@support/utils/EmailGenerator';

test.describe(
  '@regression @visual Payment Widget - translations',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService, merchantPool }) => {
      const email = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await merchantPool.acquire('GLOBALPAY_PROCESSOR_CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.conektaFraud.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: email,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.setCreditCardForUser(
        email,
        creditCardData.globalpayVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );
    });

    test(
      '@ENTP1-T2378 Traducciones - Payment Widget - OTP - pago con tarjeta guardada - Sin datos de facturacion - EN',
      {
        tag: [
          '@visual',
          '@admin_connection',
          '@admin-preprod',
          '@team_enterprise',
          '@preprod',
          '@checkout_ui',
        ],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'EN');

        // Since the point of the test is to generate visual regressions of the payment widget in EN language,
        // the admin does not need to be opened in EN language too.
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          // The payment widget will be in EN language.
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            language: 'EN',
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Enter with OTP', async () => {
          await paymentDeunaNowPage.waitForLoadOTPPage();
          await paymentDeunaNowPage.enterOTPCode();
          await paymentDeunaNowPage.assertUserSeePaymentForm();
        });

        await test.step('Take a screenshot of the payment form content', async () => {
          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopOnly,
            'validate-payment-form-content-visible'
          );
        });

        await test.step('Click on pay button', async () => {
          await paymentDeunaNowPage.assertAddNewCreditCardButtonIsVisible();
          await paymentDeunaNowPage.fillCvvCode('123');
          await paymentDeunaNowPage.clickOnPayButtonWithoutWaitResponse();
          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopOnly,
            'validate-redirect-page-visible',
            {
              maskLocators: [paymentDeunaNowPage.progressBar],
            }
          );
          await paymentDeunaNowPage.assertRedirectPage();
        });
      }
    );
  }
);
