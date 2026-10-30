import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;

test.describe('@regression Refund with payment processor Nuvei MX', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('NUVEI_PROCESSOR_AUTHORIZE_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
  });

  test(
    '@PI-T311 Refund a una transaccion con estado authorized',
    {
      tag: ['@preprod', '@refund', '@payments_integration', '@team_payment_integration', '@api'],
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
            processorName: processorsConfig.nuveiProcessorAuthorize.name,
            card: creditCardData.nuveiMasterCardSucessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('Validate error when making refund to the order with authorized status', async () => {
        await apiCallNewman.refundOrderV2(
          validationRefund.errorRefundOrderAuthorized,
          privateKey,
          0,
          false,
          { orderToken }
        );
      });

      await test.step('Validate that the status of the transaction continues to be authorized', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });
    }
  );
});
