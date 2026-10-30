import { EmailGenerator } from '@support/utils/EmailGenerator';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { retryGetOrderStatus } from '@support/utils/retries';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';

const globalAssert = new GlobalAssert();

test.describe('@regression Pay Form DeunaNow denied Credit Card', () => {
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
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1389 Authorize exitoso - UNLIMIT',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@authorization'],
    },
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
            card: creditCardData.unlimitVisaSuccessful,
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
    }
  );
});
