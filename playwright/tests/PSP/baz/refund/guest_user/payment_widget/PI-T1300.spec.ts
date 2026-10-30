import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe(
  '@regression BAZ Refund MX',
  { tag: ['@payments_integration', '@preprod', '@team_payment_integration'] },
  () => {
    test.beforeAll(async ({ emaService }) => {
      const merchantConfig = await configMerchant.basicSetup('MX');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      await apiCallNewman.configSmartRouting(merchantId, merchantToken, '2');
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.bazProcessor_MX,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.conektaProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@PI-T1300 Refund exitoso Smart Routing con BAZ usando el Payment widget en Mexico',
      {
        tag: ['@payments_integration', '@preprod', '@refund', '@team_payment_integration', '@api'],
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
              processorName: processorsConfig.bazProcessor_MX.name,
              card: creditCardData.bazVisaCardSuccessful,
              token: orderToken,
            })
          );
        });

        await test.step('The transaction is processed', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        });
      }
    );
  }
);
