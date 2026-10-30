import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as refundData from '@support/interfaces/refund';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { retryGetOrderStatus } from '@support/utils/retries';

const globalAssert = new GlobalAssert();

test.describe('@regression Pays with PayU MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('PAY_U_PROCESSOR_AUTHORIZE_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchantConfig.privateKey);
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
    '@PI-T432 Partial Refund por monto menor',
    { tag: ['@payments_integration', '@team_payment_integration', '@fixme_preprod'] },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card "payUMasterCardSuccessful" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.payUMasterCardSuccessful,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Total Capture order', async () => {
        await adminOrderDetailsPage.captureTotalOrder();
        await adminOrderDetailsPage.assertPaymentStatus('captured');
      });
      //No se puede hacer refund a una transacción capturada y la verificacion se hace por api hasta el final
      await test.step('Validate partial refund to transaction captured', async () => {
        const partialRefundAmount = 1401;
        await apiCallNewman.refundOrderV2(
          refundData.successRefund,
          privateKey,
          partialRefundAmount,
          false,
          { orderToken }
        ); //TODO review Erika
        await page.waitForTimeout(3500);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_refunded');
      });
    }
  );
});
