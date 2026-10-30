import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;

const BAD_INPUT_BILLING_ADDRESS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur ornare placerat eros gravida lacinia. Praesent sit amet ornare tellus, condimentum pellentesque nulla. ';

test.describe('@regression Purchase with Unlimit in Mexico', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('UNLIMIT_PROCESSOR_MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      billing_first_name: 'NELSON 423423 ',
      billing_last_name: 'JIMENEZ 094586 ',
      billing_phone: '+529911387182',
      billing_address1: BAD_INPUT_BILLING_ADDRESS,
      billing_address2: BAD_INPUT_BILLING_ADDRESS,
      billing_city: 'Quito',
      billing_zipcode: '170515',
      billing_state_name: 'CRT',
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PI-T1379 Purchase exitoso VISA con Unlimit usando datos con mal formato en México',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@purchase', '@api'],
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
            processorName: processorsConfig.unlimitProcessor.name,
            card: creditCardData.unlimitVisaSuccessful,
            token: orderToken,
            browserDetails: true,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
