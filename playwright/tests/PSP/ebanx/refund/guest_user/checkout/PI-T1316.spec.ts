import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refundV2';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;

const configMerchant = new ConfigMerchant();

test.describe('@regression EBANX Refund PE', () => {
  test.beforeAll(async ({ emaService }) => {
    orderId = new Date().getTime().toString();
    const merchantConfig = await configMerchant.basicSetup('PE');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('PE', privateKey, {
      order_id: orderId.toString(),
      billing_address1: '1230',
      billing_address2: '1230',
      billing_identity_document: '11960610767',
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.createEbanxProcessor('PE', false, 'PEN'),
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1316 Refund exitoso Visa con EBANX en Peru',
    {
      tag: [
        '@payments_integration',
        '@flaky',
        '@fix_ebanx_preprod',
        '@team_payment_integration',
        '@preprod',
        '@api',
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
            country: 'PE',
            processorName: processorsConfig.createEbanxProcessor('PE', false, 'PEN').name,
            card: creditCardData.ebanxVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('The user send refund request', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefundV2, privateKey, 0, false, {
          orderToken,
        });
      });

      await test.step('The transaction is refunded', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });
    }
  );
});
