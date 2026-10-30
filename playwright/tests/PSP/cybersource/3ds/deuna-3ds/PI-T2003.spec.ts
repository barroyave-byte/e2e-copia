import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';

test.describe('@regression Cybersource PSP - DEUNA 3DS - Purchase exitoso frictionless - Mastercard', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('CYBERSOURCE_PROCESSOR_PE_DEUNA3_DS_PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T2003 Cybersource PSP - DEUNA 3DS - Purchase exitoso frictionless - Mastercard',
    {
      tag: [
        '@payments_integration',
        '@admin_connection',
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

      await test.step('The user navigates to the payment widget screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User validates payment form is shown', async () => {
        await paymentDeunaNowPage.assertUserSeePaymentForm();
      });

      await test.step('The user inserts a credit card', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.cybersource3dsMastercardFrictionless,
          { country: 'PE' }
        );
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });

        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending_3ds', 200);

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await page.waitForTimeout(7000);
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processing', 8, 9000);
      });
    }
  );
});
