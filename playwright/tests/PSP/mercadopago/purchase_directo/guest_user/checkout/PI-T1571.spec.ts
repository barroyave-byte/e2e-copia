import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as debitCardData from '@support/interfaces/debit_cards';
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

test.describe('@regression Pays with MercadoPago CL', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('CL');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorChile,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1571 Realizar pago con tarjeta de débito',
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
            country: 'CL',
            processorName: processorsConfig.mercadoPagoProcessorChile.name,
            card: debitCardData.mercadopagoDebitCardMastercardVSuccessfulCL,
            token: orderToken,
            email: 'test_user_12345678@testuser.com',
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
