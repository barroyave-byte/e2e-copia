import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as pagbankPayload from '@support/interfaces/orders';

test.describe('@regression feature to validate Failed Authorize Pagbank with the automated test case', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    // create merchant for a country
    const merchant = await merchantPool.acquire('PAGBANK_AUTHORIZE_PROCESSOR_BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey; // MX, CO, PE, CL or other
    // tokenize order type deunanow (payment widget)
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      pagbankPayload.orderCompletePayload() as any
    );
    orderToken = tokenized.data.token;
    // create payment processor
  });

  test(
    '@PF-T61 Failed Authorize Pagbank test',
    { tag: ['@payments_integration', '@preprod', '@authorization', '@team_payconnect'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'BR',
            processorName: processorsConfig.pagbankAuthorizeProcessor.name,
            card: creditCardData.pagbankVisaRejected,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        // Validate that the /purchase request is correct.
        expect(responsePurchase.status).toBe(422);
        // Validate that when doing a get order, the status is correct.
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });
    }
  );
});
