import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();

test.describe('@regression Validate Manual review from DeunaNow', () => {
  let merchantId: string;
  let merchantToken: string;
  let privateKey: string;
  let orderToken: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, paymentService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'test@testuser.com',
    });
    orderToken = tokenized.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessor,
      merchantId,
      merchantToken
    );
    await paymentService.configurationMerchantPayments({
      merchantToken: merchantToken,
      merchantId: merchantId,
      storeId: 'all',
      configurationMerchantPaymentsData: {
        config_code: 'MERCADOPAGO_BINARY_MODE',
        config_value: 'DISABLED',
      },
    });
  });

  test(
    '@PLAT-T1378 Procesador Mercadopago TC-MASTER usuario invitado- DEUNA NOW (Manual review)',
    { tag: ['@preprod', '@purchase', '@payments_integration', '@team_payment_integration'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.mercadoPagoProcessor.name,
            card: creditCardData.mercadoPagoVisaCardManualReview,
            token: orderToken,
            email: 'test@testuser.com',
          })
        );
      });

      await test.step('It is validated that the order has been denied', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processing');
      });
    }
  );
});
