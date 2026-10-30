import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';

const globalAssert = new GlobalAssert();

test.describe('@regression Pay Form DeunaNow Success Credit Card', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const emaResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = emaResponse.data.token;
  });

  test(
    '@PAYM-T1931 Log Order TC + 1 procesador + rechazada + cambio PM (TC) + 1 procesador + rechazada',
    { tag: ['@fixme_trace_preprod', '@team_payments_capabilities'] },
    async ({ paymentService, userAuthService, emaService, transactionTraceService }) => {
      let userToken: string;

      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.kushkiProcessor.name,
            card: creditCardData.stripeMastercardFailed,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('Validate that the order has been denied', async () => {
        expect(responsePurchase.status).toBe(422);
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken); //TODO verificado con Julian que no es necesario ir al admin
      });

      await test.step('The user send purchase request', async () => {
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.kushkiProcessor.name,
            card: creditCardData.stripeMastercardFailed,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('Validate that the order has been denied', async () => {
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
        await apiCallNewman.assertTraceLogs(
          transactionTraceService,
          await apiCallNewman.getTraceTransactionIds(emaService, privateKey, orderToken),
          [
            { message: 'tl_order_created', payload: { status: 'pending' } },
            { message: 'tl_payment_status_updated', payload: { payment_status: 'processing' } },
            { message: 'tl_payment_status_updated', payload: { payment_status: 'denied' } },
          ],
          merchantId,
          merchantToken
        );
      });
    }
  );
});
