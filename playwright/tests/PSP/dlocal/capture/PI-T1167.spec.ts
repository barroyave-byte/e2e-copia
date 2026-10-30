import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';

let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Capture with Dlocal CL', () => {
  const configMerchant = new ConfigMerchant();

  let merchantId: string;
  let merchantToken: string;

  let merchantName: string;

  let privateKey: string;

  let orderToken: string;

  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessorPayconnectCLAuthorize,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1167 Crear una transacción con estado Captured como usuario invitado con procesador DLocal desde el Payment widget',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@capture', '@api'],
    },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CL',
            processorName: processorsConfig.dlocalProcessorPayconnectCLAuthorize.name,
            card: creditCardData.dlocalMasterCardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been authorized successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A capture is sent to the authorized transaction', async () => {
        await paymentService.captureV2(privateKey, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
      });
    }
  );
});
