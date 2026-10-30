import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationVoid from '@support/interfaces/void';
import { shouldSkipSameDayVoid } from '@support/utils/timeCutoffSkip';

const configMerchant = new ConfigMerchant();

const COUNTRY_CASES = [
  {
    country: 'CL',
    processor: processorsConfig.kushkiProcessorAuthorizeCL,
    statusAfterPurchase: 'authorized',
  },
  {
    country: 'EC',
    processor: processorsConfig.kushkiProcessorEC,
    statusAfterPurchase: 'processed',
  },
  {
    country: 'MX',
    processor: processorsConfig.kushkiProcessorAuthorize,
    statusAfterPurchase: 'authorized',
  },
] as const;

test.describe('@regression Void declined on voided order - Kushki Mastercard', () => {
  test(
    '@PI-T1208 Void declinado Mastercard a una orden con status voided con Kushki en Chile, Ecuador y México',
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
      for (const { country, processor, statusAfterPurchase } of COUNTRY_CASES) {
        await test.step(`${country}`, async () => {
          // EC only supports Void testing before its local business-hour cutoff; skip past it.
          if (country === 'EC') {
            if (shouldSkipSameDayVoid('EC').skip) {
              return;
            }
          }

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

          await test.step(`It is validated that the order has been processed successfully with status ${statusAfterPurchase}`, async () => {
            expect(responsePurchase.status).toBe(200);
            await retryGetOrderStatus(emaService, privateKey, orderToken, statusAfterPurchase);
          });

          await test.step('The processed transaction is voided', async () => {
            await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
          });

          await test.step('Validate error when voiding a transaction with voided status', async () => {
            await apiCallNewman.voidOrder(
              validationVoid.errorVoidOrderVoided,
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
