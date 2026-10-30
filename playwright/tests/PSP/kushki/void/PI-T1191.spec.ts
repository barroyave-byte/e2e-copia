import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';
import * as validationVoid from '@support/interfaces/void';

const configMerchant = new ConfigMerchant();

const COUNTRY_CASES = [
  { country: 'CL', processor: processorsConfig.kushkiProcessorAuthorizeCL },
  { country: 'PE', processor: processorsConfig.kushkiProcessorAuthorizePE },
] as const;

test.describe('@regression Void declined on captured order - Kushki Mastercard', () => {
  test(
    '@PI-T1191 Void declinado Mastercard a una orden con status captured con Kushki en Chile y Perú',
    {
      tag: [
        '@smoke',
        '@payments_integration',
        '@preprod',
        '@void',
        '@team_payment_integration',
        '@api',
      ],
    },
    async ({ userAuthService, paymentService, emaService }) => {
      for (const { country, processor } of COUNTRY_CASES) {
        await test.step(`${country}`, async () => {
          let merchantId: string;
          let merchantToken: string;
          let merchantName: string;
          let privateKey: string;
          let orderToken: string;
          let orderId: string;
          let responsePurchase: any;

          await test.step('Merchant and order setup', async () => {
            const merchantConfig = await configMerchant.basicSetup(country);
            merchantId = merchantConfig.merchantId;
            merchantToken = merchantConfig.merchantToken;
            merchantName = merchantConfig.merchantName;
            privateKey = merchantConfig.privateKey;
            const tokenized = await emaService.tokenizeDeunaNowOrder(country, privateKey);
            orderToken = tokenized.data.token;
            orderId = tokenized.data.order.order_id;
            await apiCallNewman.createPaymentProcessor(processor, merchantId, merchantToken);
          });

          await test.step('The user send purchase request', async () => {
            const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
            const userToken = responseUserAuth.data.token;
            responsePurchase = await paymentService.purchaseV2(
              privateKey,
              userToken,
              buildPurchaseV2Payload({
                country,
                processorName: processor.name,
                card: creditCardData.kushkiVisaSuccessfull,
                token: orderToken,
              })
            );
          });

          await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
            expect(responsePurchase.status).toBe(200);
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
          });

          await test.step('The processed transaction is captured', async () => {
            await apiCallNewman.captureV2(
              validationCapture.captureSuccess,
              privateKey,
              0,
              undefined,
              { orderToken }
            );
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
          });

          await test.step('Validate error when voiding a transaction with captured status', async () => {
            await apiCallNewman.voidOrder(
              validationVoid.errorVoidOrderCaptured,
              privateKey,
              0,
              orderToken
            );
          });
        });
      }
    }
  );
});
