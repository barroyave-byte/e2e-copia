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
let transactionId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();
const userEmail = 'test@testuser.com';

test.describe('@regression Pay Form DeunaNow Success Credit Card', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: userEmail,
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PLAT-T1327 Compra exitosa con procesador Mercadopago TC-VISA usuario invitado- DEUNA NOW',
    { tag: ['@payments_integration', '@test_base', '@team_payment_integration', '@api'] },
    async ({ paymentService, userAuthService, emaService, transactionTraceService }) => {
      await test.step('User inserts Credit Card for DeunaNow', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.mercadoPagoProcessor.name,
            card: creditCardData.mercadoPagoVisaCardSuccessful,
            token: orderToken,
            email: userEmail,
          })
        );
      });

      await test.step('User inserts Credit Card for DeunaNow', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('Validate transaction visibility timeline', async () => {
        await transactionTraceService.waitForValidTransactionVisibilityLogs(
          transactionId,
          merchantId,
          merchantToken
        );
      });
    }
  );
});
