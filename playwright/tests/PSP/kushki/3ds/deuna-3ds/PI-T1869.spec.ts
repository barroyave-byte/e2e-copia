import { test } from '@support/fixtures';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

test.describe('@regression DEUNA 3DS + Kushki - Purchase exitoso con challenge', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX');
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
    '@PI-T1869 DEUNA 3DS + Kushki - Purchase exitoso con challenge',
    {
      tag: [
        '@payments_integration',
        '@smoke',
        '@team_payment_integration',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.cybersource3dsMastercardChallenge,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });

        await paymentDeunaNowPage.clickOnPayButton();
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
