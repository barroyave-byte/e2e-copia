import { EmailGenerator } from '@support/utils/EmailGenerator';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import * as validationCapture from '@support/interfaces/capture';
import { retryGetOrderStatus } from '@support/utils/retries';

const globalAssert = new GlobalAssert();

test.describe('@regression Pay Form DeunaNow Success Credit Card', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('UNLIMIT_AUTHORIZE_PROCESSOR_PAYCONNECT_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: EmailGenerator.generatePayerEmail(),
      amount: 300000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1393 Capture total exitoso - Unlimit - Payconnect',
    { tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@capture'] },
    async ({ page, paymentService, userAuthService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.unlimitAuthorizeProcessorPayconnect.name,
            card: creditCardData.unlimitVisaAuthorized,
            token: orderToken,
            browserDetails: true,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('authorized', privateKey, orderToken);
      });

      await test.step('A capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          300000,
          undefined,
          { orderToken }
        );
        await page.waitForTimeout(2000);
        await globalAssert.assertTransactionPaymentStatus('captured', privateKey, orderToken);
      });
    }
  );
});
