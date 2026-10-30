import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as captureData from '@support/interfaces/capture';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

test.describe(
  '@regression Pays with Wompi CO',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;
    let responsePurchase: any;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('WOMPI_PROCESSOR_AUTHORIZE_CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T1886 Captura por monto mayor al autorizado (error)',
      {
        tag: ['@payments_integration', '@preprod', '@checkout_ui', '@team_payment_integration'],
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
              processorName: processorsConfig.wompiProcessorAuthorize.name,
              card: creditCardData.wompiVisaSuccessfull,
              token: orderToken,
            })
          );
        });

        await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        });

        await test.step('Validate error "capture" with value greater than authorized: status code "422"', async () => {
          const captureAmountGreater = 555000;
          await apiCallNewman.captureV2(
            captureData.errorCaptureAmountGreaterV2,
            privateKey,
            captureAmountGreater,
            undefined,
            {
              orderToken,
            }
          );
        });
      }
    );
  }
);
