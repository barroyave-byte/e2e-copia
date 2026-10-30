import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Dynamic routing with DEUNA 3DS', () => {
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

    const firstMerchantProcessorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.unlimitProcessorWithDEUNAThreeDS,
      merchantId,
      merchantToken
    );
    const secondMerchantProcessorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.unlimitProcessorPayconnect,
      merchantId,
      merchantToken
    );

    await apiCallNewman.configDynamicRoutingWithDEUNA3ds(
      processorsConfig.unlimitProcessorID,
      processorsConfig.unlimitProcessorID,
      firstMerchantProcessorID,
      secondMerchantProcessorID,
      merchantId,
      merchantToken
    );
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

  test.fixme(
    '@PI-T1924 DEUNA 3DS with routing - Fallo en post-3ds purchase (con 3ds challenge) y cascadeo exitoso',
    {
      annotation: { type: 'bug', description: 'PI-4940' },
      tag: ['@payments_integration', '@team_payments_capabilities'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card', async () => {
        const creditCard = { ...creditCardData.cybersource3dsVisaChallenge };
        creditCard.cardholder_name = 'Deuna ThreeDS Success After Failure';

        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCard, { country: 'MX' });
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });

        await paymentDeunaNowPage.clickOnPayButton();

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await page.waitForTimeout(7000);
        await challenge3ds.selectSuccessChallengeCybersource();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed', 8, 9000);

        await adminOrderDetailsPage.assertPaymentHistoryHas3DS();
        await adminOrderDetailsPage.assertPaymentHistoryStatusAndProcessorName(
          'denied',
          'DEUNA 3DS',
          10,
          10000
        );
        await adminOrderDetailsPage.assertPaymentHistoryStatusAndProcessorName(
          'processed',
          'UNLIMIT',
          10,
          10000
        );
      });
    }
  );
});
