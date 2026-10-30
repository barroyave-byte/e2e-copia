import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { PostTransactionPage } from '@pages/checkout/post_transaction/postTransactionPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as validationUserDevice from '@support/interfaces/user_device';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

test.describe('@regression Get user device information', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T1713 Identificar dispositivo de usuario exitoso con session ID de Sift',
    { tag: ['@user_auth', '@preprod', '@authorization', '@team_payments_capabilities'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const postTransactionPage = new PostTransactionPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user enters the credit card information of the Kushki Visa', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
      });

      await test.step('Validate that the order has been processed successfully with status "processed"', async () => {
        const status = 'processed';
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Validates that the user device session was found', async () => {
        const response = await paymentDeunaNowPage.responsePromise;
        const headers = response.request().headers();
        const sessionID = headers['x-session-id'];

        expect(sessionID).toBeTruthy();

        await apiCallNewman.getUserDeviceInformation(
          sessionID,
          validationUserDevice.successUserDevice,
          privateKey,
          merchantId
        );
      });
    }
  );
});
