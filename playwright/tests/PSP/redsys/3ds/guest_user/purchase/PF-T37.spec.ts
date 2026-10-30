import { test } from '@support/fixtures';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { avoidAntibot } from '@support/utils/avoidAntibot';

test.describe('@regression 3DS with payment processor Redsys - Payconnect ES', () => {
  // Redsys rejects 3DS (SIS0754) when the browser timezone offset is 0 (UTC CI runners):
  // payconnect drops the zero-valued time_zone_offset. Pin a Spanish shopper timezone.
  test.use({ timezoneId: 'Europe/Madrid' });

  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('REDSYS_PROCESSOR_WITH3_DS_ES');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('ES', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      await avoidAntibot(page);
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PF-T37 Purchase exitoso con 3DS - 3DS Method + Challenge - Guest User - Redsys',
    { tag: ['@team_payconnect'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card "redsys 3dsChallengeWith3DSMethod" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.redsysVisaThreeDSChallengeWithThreeDSMethod,
          { country: 'ES' }
        );
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 250000 });
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending', 200);

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await challenge3ds.selectSuccessChallengeRedsys();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed', 8, 9000);
      });
    }
  );
});
