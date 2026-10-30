import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
const globalAssert = new GlobalAssert();
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PostTransactionPage } from '@pages/checkout/post_transaction/postTransactionPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

const configMerchant = new ConfigMerchant();

test.describe('@regression Buy with deuna now using installments', () => {
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
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.conektaProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSIwithError('MXN', merchantId, merchantToken);
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
    '@PAYM-T1934 Purchase installments 2 meses (error) - Conekta usuario invitado- DEUNA NOW',
    {
      annotation: { type: 'bug', description: 'PI-2212' },
      tag: ['@payments_integration', '@installments', '@team_payment_integration'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const installments = '2';

      await test.step('User inserts Credit Card for DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.conektaMasterCardSuccessful,
          { country: 'MX' }
        );
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the status of the order is denied, the number of installments and the type of installments', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('denied', 422);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken);
        await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
        await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
      });
    }
  );
});
