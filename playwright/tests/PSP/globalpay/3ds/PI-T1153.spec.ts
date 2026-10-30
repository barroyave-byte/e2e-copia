import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

test.describe('@regression 3DS with payment processor Globalpay CO', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.globalpayProcessorWith3ds,
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
    '@PI-T1153 Purchase denegado - Globalpay',
    {
      annotation: { type: 'bug', description: 'PI-1791' },
      tag: ['@payments_integration', '@team_payment_integration'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The user inserts a credit card "globalpay_exitosa" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.globalpay3DS, {
          country: 'CO',
        });
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup');
        await paymentDeunaNowPage.clickPay();

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await challenge3ds.selectFailedChallengeGlobalpay();
      });

      await test.step('It is validated that the order is denied', async () => {
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken);
      });
    }
  );
});
