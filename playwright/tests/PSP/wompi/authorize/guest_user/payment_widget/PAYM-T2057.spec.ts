import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

test.describe('@regression Pays with Wompi CO', () => {
  let merchantId: string;
  let merchantToken: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('WOMPI_PROCESSOR_AUTHORIZE_CO');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PAYM-T2057 Authorize exitoso Wompi',
    {
      tag: [
        '@payments_integration',
        '@flaky',
        '@review_action',
        '@preprod',
        '@authorization',
        '@team_payment_integration',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CO',
            processorName: processorsConfig.wompiProcessorAuthorize.name,
            card: creditCardData.wompiVisaSuccessfull,
            token: orderToken,
            browserDetails: true,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('Validate name processor is "wompi_direct"', async () => {
        const objProcessorName: string = 'wompi_direct';
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(orderResponse.data.order.payment.data.processor).toBe(objProcessorName);
      });
    }
  );
});
