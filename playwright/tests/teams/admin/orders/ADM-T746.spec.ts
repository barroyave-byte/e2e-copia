import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

const configMerchant = new ConfigMerchant();

let merchantId: string;
let merchantToken: string;

let merchantName: string;

let privateKey: string;
let publicKey: string;

let orderToken: string;

let orderId: string;

test.beforeAll(async ({ emaService }) => {
  await test.step('Create a basic setup for a merchant that comes from Chile', async () => {
    const merchant = await configMerchant.basicSetup('CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalDebitProcessor,
      merchantId,
      merchantToken
    );
  });
});

test.describe('@regression The order attribute cartType must be validated as credit card or debit card', () => {
  test(
    '@ADM-T746 Make a purchase with a guest user PSP Dlocal using a debit card in CL',
    { tag: ['@payments_integration', '@preprod', '@admin_ui'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('Display the Payment Widget and Navigate into', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });
      await test.step('The user inserts a credit card "dlocalDebitCardSuccessful" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.dlocalDebitCardSuccessful,
          { country: 'CL' }
        );
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed" and cartType is "debit_card"', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
        await adminOrderDetailsPage.assertPaymentMethod('debit_card');
      });
    }
  );
});
