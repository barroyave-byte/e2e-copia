import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';

const configMerchant = new ConfigMerchant();

let orderToken = '';
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;
let publicKey: string;
let orderId: string;

test.describe('@regression Cancel order by merchant with pending_3ds payment status', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenizeResult = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderId = tokenizeResult.data.order.order_id;
    orderToken = tokenizeResult.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cybersourceProcessor_PE_Deuna3DS,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2036 Cancel order by merchant with pending_3ds payment status',
    { tag: ['@payments_integration', '@team_platform'] },
    async ({ page, emaService }) => {
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
          creditCardData.cybersource3dsVisaChallenge,
          { country: 'PE' }
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending_3ds', 200);

        const page3DS = page.waitForEvent('popup', { timeout: 20000 });
        const challenge3ds = new Challenge3dsPage(await page3DS);
        challenge3ds.page.close();
      });

      await test.step('Cancel order by merchant', async () => {
        await emaService.cancelOrder(orderToken, privateKey);
      });

      await test.step('Validate order payment status is cancelled', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('cancelled');
      });
    }
  );
});
