import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const globalAssert = new GlobalAssert();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression Purchase with Pagarme', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, userAuthService, merchantPool }) => {
    const merchant = await merchantPool.acquire('REDE_PROCESSOR_BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    // Register user and set address
    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardBR.phone,
        identity_document: creditCardData.redeRejectedUnauthorized.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    // Set credit card for user
    await apiCallNewman.setCreditCardForUser(
      userEmail,
      creditCardData.redeRejectedUnauthorized,
      userAddressCreditCard.userAddressCreditCardBR,
      merchantId,
      privateKey
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      amount: 53,
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
    '@PI-T983 Purchase rechazado - Rede (Usuario Registrado)',
    {
      tag: [
        '@payments_integration',
        '@flaky',
        '@team_payment_integration',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('User logs in', async () => {
        await paymentDeunaNowPage.enterOTPCode();
      });

      await test.step('The user inserts cvv code from credit card "pagarme_exitosa" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCvvCode(creditCardData.redeRejectedUnauthorized.cvv_code);
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status denied', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('denied', 422);

        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken);
      });
    }
  );
});
