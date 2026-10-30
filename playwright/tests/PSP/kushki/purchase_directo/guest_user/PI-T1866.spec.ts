import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantConfig;
let order;

test.describe('@regression Pays with Kushki', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_CL');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    order = await emaService.tokenizeDeunaNowOrder('CL', merchantConfig.privateKey);
    orderToken = order.data.token;
    orderId = order.data.order.order_id;
  });

  test(
    '@PI-T1866 Kushki Final Status must be displayed in the admin in the history section of the order.',
    { tag: ['@test_base', '@payments_integration', '@team_payment_integration'] },
    async ({ page, paymentService, userAuthService, emaService }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CL',
            processorName: processorsConfig.kushkiProcessorCL.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        const status = 'processed';
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, status);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Validate status must be displayed in the history section of the order', async () => {
        await adminOrderDetailsPage.assertPaymentHistoryStatus('processed');
      });
    }
  );
});
