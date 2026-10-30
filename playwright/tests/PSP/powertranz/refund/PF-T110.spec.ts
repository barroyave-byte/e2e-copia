import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund';

const configMerchant = new ConfigMerchant();

test.describe('@regression Refund exitoso con Powertranz usando el admin HN', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('HN');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('HN', privateKey, {
      amount: 5000,
    });
    orderToken = tokenizeResponse.data.token;
    orderId = tokenizeResponse.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.powertranzProcessorHN,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T110 Refund exitoso con Powertranz usando el admin HN',
    { tag: ['@team_payconnect', '@preprod', '@refund', '@api'] },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'HN',
            processorName: processorsConfig.powertranzProcessorHN.name,
            card: creditCardData.powertranzVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('A refund is sent to the processed transaction', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });
    }
  );
});
