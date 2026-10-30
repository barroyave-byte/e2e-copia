import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Refunding transactions with Dlocal', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessorAuthorize,
      merchantId,
      merchantToken
    );
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

  test.fixme(
    '@PI-T1846 Dlocal - Status Partial Refunding when partial refunding transactions with Captured status',
    {
      tag: ['@test_base', '@payments_integration', '@test_base', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-4065' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.dlocalMasterCardSuccessful,
          { country: 'CL' }
        );
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
      });

      await test.step('Total Capture order', async () => {
        await adminOrderDetailsPage.captureTotalOrder();
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('captured');
      });

      await test.step('Validate partial refunding to transaction captured', async () => {
        await adminOrderDetailsPage.refundPartialOrder(800);
        await adminOrderDetailsPage.assertPaymentStatus('partial_refunding');
      });

      await test.step('Validate activity order is beeing displayed in order Auth Capture Refund', async () => {
        await adminOrderDetailsPage.assertActivityTransitionAuthCapturePartialRefund();
      });
    }
  );
});
