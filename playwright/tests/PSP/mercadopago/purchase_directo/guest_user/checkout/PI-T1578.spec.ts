import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
let testEmail: string;
const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with MercadoPago CO', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('CO');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    testEmail = 'test@testuser.com';
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorColombia,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1578 Realizar pago con tarjeta de crédito',
    {
      tag: ['@payments_integration', '@preprod', '@purchase', '@team_payment_integration', '@api'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CO',
            processorName: processorsConfig.mercadoPagoProcessorColombia.name,
            card: creditCardData.mercadopagoMasterCardSuccessfulCONoClear,
            token: orderToken,
            email: testEmail,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
