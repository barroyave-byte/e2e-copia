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
const configMerchant = new ConfigMerchant();

test.describe('@regression Pay Form DeunaNow Success Credit Card', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T1923 Log Order TC + 1 procesador + rechazada + 2 procesador + aprobada',
    { tag: ['@fixme_trace_preprod', '@team_payments_capabilities', '@api'] },
    async ({ paymentService, userAuthService, emaService, transactionTraceService }) => {
      let userToken: string;

      await test.step('Get guest user token', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        userToken = responseUserAuth.data.token;
      });

      await test.step('First purchase attempt on Stripe is denied', async () => {
        const responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.stripeProcessor.name,
            card: creditCardData.stripeVisaFailed,
            token: orderToken,
          }),
          true
        );
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });

      await test.step('Second purchase attempt on OpenPay is processed', async () => {
        const responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.openPayProcessor.name,
            card: creditCardData.openpayVisaSuccessful,
            token: orderToken,
          })
        );
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('Validate trace logs', async () => {
        await apiCallNewman.assertTraceLogs(
          transactionTraceService,
          await apiCallNewman.getTraceTransactionIds(emaService, privateKey, orderToken),
          [
            { message: 'tl_order_created', payload: { status: 'pending' } },
            { message: 'tl_payment_status_updated', payload: { payment_status: 'denied' } },
            { message: 'tl_order_updated', payload: { status: 'succeeded' } },
          ],
          merchantId,
          merchantToken
        );
      });
    }
  );
});
