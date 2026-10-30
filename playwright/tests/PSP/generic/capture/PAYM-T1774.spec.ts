import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';

let merchantId: string;
let privateKey: string;
let merchantToken: string;
let orderToken: string;
let processorId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Capture with Kushki MX', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantId = merchantConfig.merchantId;
    privateKey = merchantConfig.privateKey;
    merchantToken = merchantConfig.merchantToken;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
    processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorAuthorize,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T1774 Capture a una transaccion authorized (procesador eliminado)',
    {
      tag: ['@preprod', '@capture', '@payments_integration', '@team_payment_integration', '@api'],
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
            processorName: processorsConfig.kushkiProcessorAuthorize.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('The processor is removed before the refund is executed', async () => {
        await paymentService.deletePaymentProcessor(processorId, merchantId, merchantToken);
      });

      await test.step('A capture is sent to the authorized transaction', async () => {
        await paymentService.captureV2(privateKey, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
      });
    }
  );
});
