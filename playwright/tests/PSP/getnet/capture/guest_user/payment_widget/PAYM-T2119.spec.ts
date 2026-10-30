import { EmailGenerator } from '@support/utils/EmailGenerator';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
const globalAssert = new GlobalAssert();

test.describe('@regression capture with Getnet BR', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('GETNET_PROCESSOR_AUTHORIZE_BR');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      user_email: EmailGenerator.generatePayerEmail(),
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PAYM-T2119 Capture falla cuando una authorization ha sido denegada',
    {
      annotation: { type: 'bug', description: 'PI-2821' },
      tag: ['@payments_integration', '@team_payment_integration', '@api', '@preprod', '@capture'],
    },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'BR',
            processorName: processorsConfig.getnetProcessorAuthorize.name,
            card: creditCardData.getnetMastercardDenied,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('It is validated that the order has been denied', async () => {
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
        // Wait for transaction status reflection
        await new Promise((resolve) => setTimeout(resolve, 3500));
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken);
      });

      await test.step('A total capture is sent to the processed transaction', async () => {
        await apiCallNewman.captureV2(
          validationCapture.errorCaptureOrderDenided,
          privateKey,
          0,
          undefined,
          { orderToken }
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken);
      });
    }
  );
});
