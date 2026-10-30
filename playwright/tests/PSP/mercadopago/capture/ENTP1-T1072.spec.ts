import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as validationCapture from '@support/interfaces/capture';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe(
  '@regression Pays with  MercadoPago MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let orderToken: string;
    let orderId: string;
    let responsePurchase: any;
    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;

      privateKey = merchant.privateKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: 'test@testuser.com',
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessorAuthorize,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T1072 Check MX Usuario Invitado MP Captura Parcial dentro del monto de la orden total',
      {
        tag: ['@payments_integration', '@preprod', '@checkout_ui', '@team_payment_integration'],
      },
      async ({ page, paymentService, userAuthService, emaService }) => {
        await test.step('The user send purchase request', async () => {
          const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
          const userToken = responseUserAuth.data.token;
          responsePurchase = await paymentService.purchaseV2(
            privateKey,
            userToken,
            buildPurchaseV2Payload({
              country: 'MX',
              processorName: processorsConfig.mercadoPagoProcessorAuthorize.name,
              card: creditCardData.mercadoPagoVisaCardSuccessful,
              token: orderToken,
              email: 'test@testuser.com',
            })
          );
        });

        await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized', 15, 5000);
        });

        await test.step('A partial capture is sent to the authorized transaction', async () => {
          await apiCallNewman.captureV2(
            validationCapture.captureSuccess,
            privateKey,
            1000,
            undefined,
            { orderToken }
          );
          await page.waitForTimeout(1500);
          await retryGetOrderStatus(
            emaService,
            privateKey,
            orderToken,
            'partial_captured',
            15,
            5000
          );
        });
      }
    );
  }
);
