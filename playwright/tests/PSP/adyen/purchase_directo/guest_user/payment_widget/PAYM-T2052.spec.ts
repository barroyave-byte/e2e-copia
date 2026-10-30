import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with Adyen', () => {
  let merchantId: string;
  let merchantToken: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: EmailGenerator.generatePayerEmail(),
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.adyenProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T2052 Compra exitosa procesador Adyen con usuario invitado',
    { tag: ['@payments_integration', '@team_payment_integration'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.adyenProcessor.name,
            card: creditCardData.adyenVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
