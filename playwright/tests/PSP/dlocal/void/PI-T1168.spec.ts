import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as voidData from '@support/interfaces/void';

let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with Dlocal CL', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessorAuthorize,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1168 Void a una transaccion con estado authorized',
    {
      tag: [
        '@payments_integration',
        '@test_base',
        '@admin-preprod',
        '@team_payment_integration',
        '@api',
        '@preprod',
        '@void',
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
            country: 'CL',
            processorName: processorsConfig.dlocalProcessorAuthorize.name,
            card: creditCardData.dlocalMasterCardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A void is sent to the authorized transaction', async () => {
        await apiCallNewman.voidOrder(voidData.successVoid, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });

      await test.step('Validate the oderID inside activity table JSON', async () => {
        const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        const orderData = resultGetOrder.bodyResponse;
        expect(orderData).toBeDefined();
        expect(orderData.order).toBeDefined();
        expect(orderData.order.order_id).toBeDefined();
        expect(orderData.order.merchant_id).toBeDefined();
        expect(orderData.order.shipping_address).toBeDefined();
        expect(orderData.order.items).toBeDefined();
      });
    }
  );
});
