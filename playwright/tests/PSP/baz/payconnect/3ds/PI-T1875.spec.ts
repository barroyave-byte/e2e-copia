import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { retryGetOrderStatus } from '@support/utils/retries';

// NOTE: This test can fail due to the static IP'S being changed. We need to regularly update them

const configMerchant = new ConfigMerchant();

test.describe('@regression DEUNA 3DS + BAZ - Authorize exitoso con challenge', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    const processorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.bazAuthorizeProcessorPayconnectWithDeuna3DS,
      merchantId,
      merchantToken
    );
    expect(processorID).toBeDefined();
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T1875 DEUNA 3DS + BAZ - Authorize exitoso con challenge',
    { tag: ['@payments_integration', '@team_payment_integration'] },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.cybersource3dsVisaChallenge,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay and completes 3DS challenge', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });

        await paymentDeunaNowPage.clickOnPayButton();

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await challenge3ds.selectSuccessChallengeCybersource();
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized', 8, 9000);
      });
    }
  );
});
