import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import * as creditCardData from '@support/interfaces/credit_cards';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { retryGetOrderStatus } from '@support/utils/retries';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

test.describe('@regression 3DS with payment processor Unlimit - Payconnect  MX', () => {
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
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.unlimitProcessorPayconnectWithThreeDS,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1396 Unlimit - Payconnect: purchase con 3DS exitoso',
    { tag: ['@payments_integration', '@team_payment_integration'] },
    async ({ page, paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.unlimitProcessorPayconnectWithThreeDS.name,
            card: creditCardData.unlimitThreeDSProcessed,
            token: orderToken,
            browserDetails: true,
          })
        );
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'pending_3ds');

        const orderStatus = await emaService.getOrder(privateKey, orderToken);
        const paymentData = orderStatus.data.order.payment.data as any;
        const challengeUrl = paymentData.next_action.authorization_3ds.url_challenge;
        expect(challengeUrl).toBeTruthy();

        await page.goto(challengeUrl);
        const challenge3ds = new Challenge3dsPage(page);
        await challenge3ds.selectSuccessChallengeUnlimit();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
      });
    }
  );
});
