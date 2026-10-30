import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
const globalAssert = new GlobalAssert();
import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as validationVoid from '@support/interfaces/void';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

test.describe('@regression Purchase with payment processor Nuvei MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('NUVEI_PROCESSOR_MX');
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
    '@PI-T322 Void a una transaccion con estado processed',
    { tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@void'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user enters the credit card information of the Nuvei Mastercard', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.nuveiMasterCardSucessfull,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('A void is sent to the processed transaction', async () => {
        await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
        const status = 'voided';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
