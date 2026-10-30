import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { buildCashPaymentPayload } from '@support/http/testData/payment/CashPaymentPayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Cash Payments from Checkout', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('CO');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
      amount: 500000,
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cashProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1582 Compra completa con usuario invitado - efectivo',
    {
      tag: ['@payments_integration', '@preprod', '@purchase', '@api', '@team_payment_integration'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send cash purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildCashPaymentPayload({
            country: 'CO',
            processorName: processorsConfig.cashProcessor.name,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is pending', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'pending');
      });
    }
  );
});
