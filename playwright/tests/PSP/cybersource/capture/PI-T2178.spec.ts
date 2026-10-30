import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';

let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Cybersource Authorize US', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('US');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const tokenized = await emaService.tokenizeAirlineOrder('US', privateKey, { amount: 1000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cybersourceProcessorAuthorize_US,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PI-T2178 Successful airline partial capture via Cybersource in the USA',
    {
      tag: [
        '@payments_integration',
        '@team_payment_integration',
        '@preprod',
        '@partial_capture',
        '@api',
      ],
      annotation: { type: 'bug', description: 'PI-6283' },
    },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'US',
            processorName: processorsConfig.cybersourceProcessorAuthorize_US.name,
            card: creditCardData.cybersourceVisaCardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A partial capture is sent to the authorized transaction', async () => {
        await paymentService.captureV2(privateKey, orderToken, { amount: 5 });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_capturing');
      });
    }
  );
});
