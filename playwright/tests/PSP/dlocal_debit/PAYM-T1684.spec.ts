import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe('@regression Pays with Dlocal debit CL', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('CL');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', merchantConfig.privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalDebitProcessor,
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
    '@PAYM-T1684 Purchase prcoessed con Dlocal usando tarjeta debito desde el payment widget',
    { tag: ['@preprod', '@purchase', '@payments_integration', '@team_payment_integration'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user inserts a credit card "dlocalMasterCardSuccessful" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.dlocalMasterCardSuccessful,
          { country: 'CL' }
        );
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
        await adminOrderDetailsPage.assertPaymentMethod('debit_card');
      });
    }
  );
});
