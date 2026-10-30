import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund/successRefund';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test } from '@support/fixtures';

const configMerchant = new ConfigMerchant();

test.describe('@regression', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.fiservProcessorAR,
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

  test(
    '@ADM-T758 Successful partial refund with Fiserv using Payment Widget in Argentina',
    { tag: ['@admin', '@orders', '@refund', '@team_admin', '@fixme_preprod', '@admin_ui'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user enters the credit card details', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.fiservARVisaSuccessful,
          { country: 'AR' }
        );
      });

      await test.step('The user clicks on Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order was processed successfully', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Initiate partial refund request', async () => {
        const partialRefundAmount = 100;
        await apiCallNewman.refundOrderV2(
          validationRefund.successRefund,
          privateKey,
          partialRefundAmount,
          false,
          { orderToken }
        );
        await adminOrderDetailsPage.assertPaymentStatus('partial_refunded');
      });
    }
  );
});
