import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { PostTransactionPage } from '@pages/checkout/post_transaction/postTransactionPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pay Form DeunaNow Failed 3DS', () => {
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
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.amex3dsProcessor,
      merchantId,
      merchantToken
    );
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
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
    '@PLAT-T1380 Compra fallida con 3DS prosesador Amex- Usuario registrado',
    { tag: ['@team_payment_integration'], annotation: { type: 'bug', description: 'PI-3233' } },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const postTransactionPage = new PostTransactionPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user selects the registered option', async () => {
        await paymentDeunaNowPage.enterOTPCode();
      });

      await test.step('User inserts Credit Card for DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.amex3DS, {
          country: 'MX',
        });
      });

      await test.step('User complete 3DSChallenge for amex3DS', async () => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });
        await paymentDeunaNowPage.clickPay();
        const challenge3ds = new Challenge3dsPage(await page3DS);
        await challenge3ds.selectWrongChallengeAmex();
      });

      await test.step('It is validated that the order has been denied', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied');
      });
    }
  );
});
