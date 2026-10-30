import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as refundData from '@support/interfaces/refund';
import * as voidData from '@support/interfaces/void';

test.describe('@regression Pays with PlaceToPay CO', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let transactionId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('PLACE_TO_PAY_PROCESSOR_CO');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
    orderToken = tokenizeResponse.data.token;
    orderId = tokenizeResponse.data.order.order_id;
    transactionId = tokenizeResponse.data.order.order_id;
  });

  test(
    '@PAYM-T1676 Void a una transaccion con estado refunded con placetopay usando el payment widget',
    {
      tag: [
        '@payments_integration',
        '@fixme_placetopay_preprod',
        '@team_payment_integration',
        '@api',
      ],
    },
    async ({ userAuthService, paymentService, emaService, transactionTraceService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CO',
            processorName: processorsConfig.placeToPayProcessor.name,
            card: creditCardData.placetopayDinersSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('Validate total refund to transaction processed', async () => {
        await apiCallNewman.refundOrderV2(refundData.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });

      await test.step('Error when void order is made to refunded order', async () => {
        await apiCallNewman.voidOrder(voidData.errorVoidOrderRefunded, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });

      await transactionTraceService.waitForValidTransactionVisibilityLogs(
        transactionId,
        merchantId,
        merchantToken
      );
    }
  );
});
