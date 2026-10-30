import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';

import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression Purchase with Cielo', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ userAuthService, emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('CIELO_AUTHORIZE_BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardBR.phone,
        identity_document: creditCardData.cieloRejectedUnauthorized.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    // Set credit card for user
    await apiCallNewman.setCreditCardForUser(
      userEmail,
      creditCardData.cieloRejectedUnauthorized,
      userAddressCreditCard.userAddressCreditCardBR,
      merchantId,
      privateKey
    );

    // Tokenize order with registered user
    const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      user_email: userEmail,
    });
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
    '@PI-T1033 Authorize rechazado - Cielo (Usuario Registrado)',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@authorization'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

      await test.step('User logs in', async () => {
        await paymentDeunaNowPage.enterOTPCode();
      });

      await test.step('The user inserts cvv code from credit card "cieloRejectedUnauthorized" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCvvCode(creditCardData.cieloRejectedUnauthorized.cvv_code);
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed with error with status denied', async () => {
        const status = 'denied';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 422);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
