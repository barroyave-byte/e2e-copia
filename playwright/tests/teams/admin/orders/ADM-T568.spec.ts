import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';

const configMerchant = new ConfigMerchant();

const PARTIAL_REFUND_AMOUNT = 19.56;
const RETRY_AMOUNT = 15;
let processorId = '';
let externalTransactionId = '';
let transactionId = '';

test.describe('@regression Admin: SuperAdmin successfully refunds a transaction with a decimal amount', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let merchantId2: string;
  let merchantName2: string;
  let privateKey2: string;
  let publicKey2: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const { networkId } = await apiCallNewman.createNetwork(merchantId, merchantToken);

    const merchantConfig2 = await configMerchant.basicSetup('MX');
    merchantId2 = merchantConfig2.merchantId;
    merchantName2 = merchantConfig2.merchantName;
    privateKey2 = merchantConfig2.privateKey;
    publicKey2 = merchantConfig2.publicKey;
    await apiCallNewman.addMerchantToNetwork(networkId, merchantId2, merchantToken);

    await apiCallNewman.createMerchantUserV2WithNework(
      'superadmin',
      'all',
      merchantId,
      networkId,
      merchantToken
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey2);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId2,
      merchantToken
    );
  });

  test(
    '@ADM-T568 Admin: SuperAdmin successfully refunds a transaction with a decimal amount',
    {
      tag: [
        '@admin',
        '@smoke',
        '@preprod',
        '@admin_ui',
        '@admin-preprod',
        '@team_admin',
        '@admin_smoke',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId2);
      });

      await test.step('The user navigates to the payment widget screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey2, privateKey: privateKey2 },
        });
      });

      await test.step('The user inserts a credit card from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId2);
        await adminOrderDetailsPage.goToOrderDetails(merchantId2, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('The processed transaction is partially refunded', async () => {
        await adminOrderDetailsPage.refundPartialOrder(PARTIAL_REFUND_AMOUNT);
      });

      await test.step('Send webhook for partial refunded if preprod', async () => {
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey2, orderToken);
        externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
        transactionId = paymentData?.orderPayment?.data?.id;

        await apiCallNewman.sendWebhookRefundIfPreprod(
          'partial_refunded',
          transactionId,
          externalTransactionId,
          processorId
        );
      });

      await test.step('Validate that the transaction has been partially refunded', async () => {
        await adminOrderDetailsPage.assertPaymentStatus('partial_refunded', RETRY_AMOUNT);
      });
    }
  );
});
