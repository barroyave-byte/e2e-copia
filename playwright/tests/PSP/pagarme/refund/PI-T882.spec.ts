import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as validationRefund from '@support/interfaces/refund';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe('@regression Partial Refund with Pagarme', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.pagarmeProcessor,
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
    '@PI-T882 Partial refund exitoso Visa para luego hacer refund a resto de orden con Pagarme usando el payment widget',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-2752' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'PT');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.pagarmeVisaSuccessful, {
          country: 'BR',
        });
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      //(BY NOW FIXME)
      await test.step('The processed transaction is partially refunded', async () => {
        await apiCallNewman.refundOrderV2(
          validationRefund.successRefund,
          privateKey,
          100000,
          false,
          { orderToken }
        ); //TODO: review Erika
        await page.waitForTimeout(1500);
        await globalAssert.assertTransactionPaymentStatus(
          'partial_refunded',
          privateKey,
          orderToken
        );
      });

      await test.step('The partially refunded transaction is completely refunded', async () => {
        await apiCallNewman.refundOrderV2(
          validationRefund.successRefund,
          privateKey,
          150000,
          false,
          { orderToken }
        ); //TODO: review Erika
        const status = 'refunded';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
