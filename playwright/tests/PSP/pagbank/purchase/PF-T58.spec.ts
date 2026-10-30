import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import * as pagbankPayload from '@support/interfaces/orders';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Denied Purchase Pagbank automated test case', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    privateKey = merchant.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      pagbankPayload.orderCompletePayload() as any
    );
    orderToken = tokenizeResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.pagbankProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T58 Denied Purchase PagBank test',
    { tag: ['@payments_integration', '@preprod', '@purchase', '@team_payconnect', '@api'] },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'BR',
            processorName: processorsConfig.pagbankProcessor.name,
            card: creditCardData.pagbankVisaRejected,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('It is validated that the order has been processed successfully with status denied', async () => {
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });
    }
  );
});
