import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefundV2 from '@support/interfaces/refundV2';
import * as validationVoid from '@support/interfaces/void';

const configMerchant = new ConfigMerchant();

const COUNTRY_CASES = [
  { country: 'CL', processor: processorsConfig.kushkiProcessorCL },
  { country: 'CO', processor: processorsConfig.kushkiProcessorCO },
  { country: 'EC', processor: processorsConfig.kushkiProcessorEC },
  { country: 'PE', processor: processorsConfig.kushkiProcessorPE },
] as const;

test.describe('@regression Void declined on refunded order - Kushki Visa', () => {
  test.describe.configure({ timeout: 300_000 });
  test(
    '@PI-T1188 Void declinado Visa a una orden con status refunded con Kushki en Chile, Colombia, Ecuador y Perú',
    {
      tag: [
        '@smoke',
        '@payments_integration',
        '@preprod',
        '@void',
        '@flaky',
        '@team_payment_integration',
        '@api',
      ],
    },
    async ({ userAuthService, paymentService, emaService }) => {
      for (const { country, processor } of COUNTRY_CASES) {
        await test.step(`${country}`, async () => {
          let merchantId: string;
          let merchantToken: string;
          let merchantName: string;
          let privateKey: string;
          let orderToken: string;
          let orderId: string;
          let responsePurchase: any;
          let processorId = '';
          let externalTransactionId = '';
          let transactionId = '';

          await test.step('Merchant and order setup', async () => {
            const merchantConfig = await configMerchant.basicSetup(country);
            merchantId = merchantConfig.merchantId;
            merchantToken = merchantConfig.merchantToken;
            merchantName = merchantConfig.merchantName;
            privateKey = merchantConfig.privateKey;
            const tokenized = await emaService.tokenizeDeunaNowOrder(country, privateKey);
            orderToken = tokenized.data.token;
            orderId = tokenized.data.order.order_id;
            processorId = await apiCallNewman.createPaymentProcessor(
              processor,
              merchantId,
              merchantToken
            );
          });

          await test.step('The user send purchase request', async () => {
            const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
            const userToken = responseUserAuth.data.token;
            responsePurchase = await paymentService.purchaseV2(
              privateKey,
              userToken,
              buildPurchaseV2Payload({
                country,
                processorName: processor.name,
                card: creditCardData.kushkiVisaSuccessfull,
                token: orderToken,
              })
            );
          });

          await test.step('It is validated that the order has been processed successfully with status processed', async () => {
            expect(responsePurchase.status).toBe(200);
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed', 15, 5000);
          });

          await test.step('The processed transaction is refunded', async () => {
            await apiCallNewman.refundOrderV2(
              validationRefundV2.successRefundV2,
              privateKey,
              0,
              false,
              { orderToken }
            );
          });

          await test.step('Send webhook for refund if preprod', async () => {
            const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
            externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
            transactionId = paymentData?.orderPayment?.data?.id;

            await apiCallNewman.sendWebhookRefundIfPreprod(
              'refunded',
              transactionId,
              externalTransactionId,
              processorId
            );
          });

          await test.step('Validate that the transaction has been refunded', async () => {
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded', 15, 5000);
          });

          await test.step('Validate error when voiding a transaction with refunded status', async () => {
            await apiCallNewman.voidOrder(
              validationVoid.errorVoidOrderRefunded,
              privateKey,
              0,
              orderToken
            );
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded', 15, 5000);
          });
        });
      }
    }
  );
});
