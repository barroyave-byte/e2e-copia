import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund';

let merchantId: string;
let privateKey: string;
let merchantToken: string;
let orderToken: string;
let processorId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Refund Generic', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantId = merchantConfig.merchantId;
    privateKey = merchantConfig.privateKey;
    merchantToken = merchantConfig.merchantToken;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
    processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorAuthorize,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T1773 Refund a una transaccion captured (procesador eliminado)',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@refund', '@api'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      let externalTransactionId: string;
      let transactionId: string;

      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.kushkiProcessorAuthorize.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A partial capture is sent to the authorized transaction', async () => {
        await paymentService.captureV2(privateKey, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
      });

      await test.step('The processor is removed before the refund is executed', async () => {
        await paymentService.deletePaymentProcessor(processorId, merchantId, merchantToken);
      });

      await test.step('The partial captured transaction is refunded', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
          orderToken,
        });
      });

      await test.step('Send webhook for refund if preprod', async () => {
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        externalTransactionId = orderResponse?.data?.order?.payment?.data?.external_transaction_id;
        transactionId = orderResponse?.data?.order?.payment?.data?.id;

        await apiCallNewman.sendWebhookRefundIfPreprod(
          'refunded',
          transactionId,
          externalTransactionId,
          processorId
        );
      });

      await test.step('Validate that the transaction has been refunded', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });
    }
  );
});
