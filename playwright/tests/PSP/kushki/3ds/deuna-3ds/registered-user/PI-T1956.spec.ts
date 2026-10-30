import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression Purchase exitoso - Kushki + DEUNA 3DS - Challenge - Usuario registrado', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, userAuthService, merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    // Register user and set address
    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardMX.phone,
        identity_document: creditCardData.cieloVisaSuccessful.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    // Set credit card for user
    await apiCallNewman.setCreditCardForUser(
      userEmail,
      creditCardData.cybersource3dsMastercardChallenge,
      userAddressCreditCard.userAddressCreditCardMX,
      merchantId,
      privateKey
    );

    // Tokenize order with registered user
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: userEmail,
      amount: 250000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1956 Purchase exitoso - Kushki + DEUNA 3DS - Challenge - Usuario registrado',
    {
      tag: [
        '@payments_integration',
        '@admin_connection',
        '@smoke',
        '@admin-preprod',
        '@team_payment_integration',
        '@preprod',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user navigates to the payment widget screen as registered user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User logs in', async () => {
        await paymentDeunaNowPage.enterOTPCode();
      });

      await test.step('The user inserts cvv code from credit card "cybersource3dsMastercardChallenge" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCvvCode(
          creditCardData.cybersource3dsMastercardChallenge.cvv_code
        );
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });

        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending', 200);

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await page.waitForTimeout(7000);
        await challenge3ds.selectSuccessChallengeCybersource();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed', 8, 9000);
      });
    }
  );
});
