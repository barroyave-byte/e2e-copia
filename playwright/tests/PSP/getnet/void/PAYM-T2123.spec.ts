import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as validationVoid from '@support/interfaces/void';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as validationCapture from '@support/interfaces/capture';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
const configMerchant = new ConfigMerchant();
//In case the regression was executed outside of the 9:00 a.m. to 4:00 p.m. (Colombia time), this case must be validated again by the QA team.
test.describe('@regression Void with Getnet', () => {
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
    const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      user_email: EmailGenerator.generatePayerEmail(),
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.getnetProcessorAuthorize,
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
    '@PAYM-T2123 Test that an authorization only once captured cannot be cancelled (only refunded)',
    {
      annotation: [{ type: 'bug', description: 'PF-3774' }],
      tag: ['@payments_integration', '@team_payment_integration'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.getnetMastercardSuccessful,
          { country: 'BR' }
        );
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('A capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(validationCapture.captureSuccess, privateKey, 0, undefined, {
          orderToken,
        });
        await page.waitForTimeout(5000);
        const status = 'captured';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('A void is sent to the authorized transaction', async () => {
        await apiCallNewman.voidOrder(
          validationVoid.errorVoidOrderCaptured,
          privateKey,
          0,
          orderToken
        ); //TODO review Erika
        const status = 'captured';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
