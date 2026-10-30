import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Refund with  MercadoPago MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
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
      transactionId = tokenizeResponse.data.order.transaction_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessorAuthorize,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T1058 Check MX Usuario Invitado MP Refund a una transaccion autorizada',
      {
        tag: [
          '@payments_integration',
          '@preprod',
          '@checkout_ui',
          '@team_payment_integration',
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
              processorName: processorsConfig.mercadoPagoProcessorAuthorize.name,
              card: creditCardData.mercadopagoMasterCardSuccessfulMX,
              token: orderToken,
              email: 'test@testuser.com',
            })
          );
        });

        await test.step('The transaction is authorized', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        });

        await test.step('Validate refund error', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.errorRefundOrderAuthorized,
            privateKey,
            0,
            false,
            { orderToken }
          );
        });
      }
    );
  }
);
