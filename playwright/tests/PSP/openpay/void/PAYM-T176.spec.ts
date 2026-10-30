import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as voidData from '@support/interfaces/void';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;

test.describe('@regression Pays with OpenPay MX', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('OPEN_PAY_PROCESSOR_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
  });

  test(
    '@PAYM-T176 Void a una transaccion con estado processed con Openpay desde el payment widget',
    {
      tag: [
        '@payments_integration',
        '@openpay_fixme_preprod',
        '@team_payment_integration',
        '@preprod',
        '@void',
        '@api',
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
            country: 'MX',
            processorName: processorsConfig.openPayProcessor.name,
            card: creditCardData.openpayVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('Total void order is made', async () => {
        await apiCallNewman.voidOrder(voidData.successVoid, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });
    }
  );
});
