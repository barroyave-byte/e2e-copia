import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as validationRefund from '@support/interfaces/refund';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe('@regression Refund DeunaNow Success Credit Card in Mexico', () => {
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
      processorsConfig.mitProcessor,
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
    '@PI-T1345 Refund exitoso con MIT usando deunanow en Mexico con una transaccion processada',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-2346' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.mitVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
      });

      await test.step('Validate total refund to transaction processed', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await page.waitForTimeout(1500);
        await globalAssert.assertTransactionPaymentStatus('refunded', privateKey, orderToken);
      });
    }
  );
});
