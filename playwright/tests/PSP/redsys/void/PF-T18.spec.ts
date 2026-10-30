import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as validationCapture from '@support/interfaces/capture';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Pay Form DeunaNow Success Credit Card', () => {
  // Redsys rejects 3DS (SIS0754) when the browser timezone offset is 0 (UTC CI runners):
  // payconnect drops the zero-valued time_zone_offset. Pin a Spanish shopper timezone.
  test.use({ timezoneId: 'Europe/Madrid' });

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('ES');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('ES', privateKey);
    orderToken = tokenizeResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.redsysAuthorizeProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T18 Void exitoso - Redsys',
    { tag: ['@team_payconnect', '@preprod', '@void', '@api'] },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'ES',
            processorName: processorsConfig.redsysAuthorizeProcessor.name,
            card: creditCardData.redsysMastercardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A void is sent to the authorized transaction', async () => {
        await apiCallNewman.voidOrder(
          validationCapture.captureSuccess,
          privateKey,
          250000,
          orderToken
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });
    }
  );
});
