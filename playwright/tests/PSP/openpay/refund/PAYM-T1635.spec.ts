import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as refundData from '@support/interfaces/refund';
import * as voidData from '@support/interfaces/void';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let transactionId: string;
let responsePurchase: any;

test.describe('@regression Pays with OpenPay MX', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('OPEN_PAY_PROCESSOR_AUTHORIZE_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PAYM-T1635 Refund a una transaccion con estado voided',
    {
      tag: [
        '@payments_integration',
        '@openpay_fixme_preprod',
        '@team_payment_integration',
        '@preprod',
        '@refund',
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
            processorName: processorsConfig.openPayProcessorAuthorize.name,
            card: creditCardData.openpayVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('Total void order is made', async () => {
        await apiCallNewman.voidOrder(voidData.successVoid, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });

      await test.step('Validate error refund to transaction voided', async () => {
        await apiCallNewman.refundOrderV2(refundData.errorRefundOrderVoided, privateKey, 0, false, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });
    }
  );
});
