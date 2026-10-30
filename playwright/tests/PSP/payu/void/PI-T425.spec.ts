import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as voidData from '@support/interfaces/void';

test.describe('@regression Pays with PayU MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('PAY_U_PROCESSOR_AUTHORIZE_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
    orderId = tokenizeResponse.data.order.order_id;
  });

  test(
    '@PI-T425 Void a una transaccion con estado captured',
    {
      tag: [
        '@fixme_payu_preprod',
        '@payments_integration',
        '@team_payment_integration',
        '@preprod',
        '@void',
        '@api',
      ],
    },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.payUProcessorAuthorize.name,
            card: creditCardData.payUMasterCardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('Total order is captured', async () => {
        const captureResponse = await paymentService.captureV2(privateKey, orderToken);
        expect(captureResponse.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
      });

      await test.step('Error when void order is made', async () => {
        await apiCallNewman.voidOrder(voidData.errorVoidOrderCaptured, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
      });
    }
  );
});
