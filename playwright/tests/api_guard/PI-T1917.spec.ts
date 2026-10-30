import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import {
  retryGetOrderStatus,
  retryGetFraudProcessor,
  retryGetPostAuthorizationEvents,
} from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let orderId: string;
let merchantName: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 4990,
    });
    orderToken = tokenizeResponse.data.token;
    orderId = tokenizeResponse.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.configDynamicRoutingWithRiskified(merchantId, merchantToken);
  });

  test(
    '@PI-T1917 Procesar una transacción con motor de fraude riskified (post authorization)',
    {
      tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities', '@api'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.stripeProcessor.name,
            card: creditCardData.stripeVisaSuccessfulFraudAprove,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('It validates that the fraud processor is riskified', async () => {
        await retryGetFraudProcessor(
          emaService,
          privateKey,
          orderToken,
          ConnectionsAvailable.riskified
        );
      });

      await test.step('It validate guard transaction request post auth parameter', async () => {
        const { body, status } = await retryGetPostAuthorizationEvents(orderId, [
          'create_order',
          'transaction',
        ]);
        expect(status).toBe(202);

        const events = body.data.rows.map(([order_id, is_post_auth, event_name]) => ({
          order_id,
          is_post_auth,
          event_name,
        }));
        expect(events).toHaveLength(2);
        expect(events).toEqual(
          expect.arrayContaining([
            { order_id: orderId, event_name: 'create_order', is_post_auth: 'false' },
            { order_id: orderId, event_name: 'transaction', is_post_auth: null },
          ])
        );
      });
    }
  );
});
