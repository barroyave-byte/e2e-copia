import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression 3DS with payment processor Openpay MX', () => {
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
      processorsConfig.openPay3dsProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1001 Crear una transacción con estado Processed con 3DS Challenge con Usuario Invitado con procesador OpenPay',
    { tag: ['@payments_integration', '@team_payment_integration'] },
    async ({ page, paymentService, userAuthService, emaService }) => {
      let challengeUrl: string;

      await test.step('The user send purchase request via API', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.openPay3dsProcessor.name,
            card: creditCardData.openpay3ds,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction requires 3DS authentication', async () => {
        expect(responsePurchase.status).toBe(200);
        // The purchase response already says pending_3ds, but the order can still be read
        // without its payment (status "") right after it.
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'pending_3ds');
        const orderStatus = await emaService.getOrder(privateKey, orderToken);
        const paymentData = orderStatus.data.order.payment.data as any;

        expect(paymentData.status).toBe('pending_3ds');
        expect(paymentData.next_action.action).toBe('authorization_3ds');
        challengeUrl = paymentData.next_action.authorization_3ds.url_challenge;
        expect(challengeUrl).toBeTruthy();
      });

      await test.step('The user completes 3DS challenge', async () => {
        await page.goto(challengeUrl);
        const challenge3dsPage = new Challenge3dsPage(page);
        await challenge3dsPage.selectSuccessChallengeOpenPay();
      });

      await test.step('The transaction is processed', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
