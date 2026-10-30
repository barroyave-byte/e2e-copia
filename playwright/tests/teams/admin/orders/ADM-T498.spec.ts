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
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';
import { TokenizeOrderResponse } from '@support/http/models/order';
import { ApiResponse } from '@support/http/BaseHttpClient';

const configMerchant = new ConfigMerchant();

let merchant1Config: BasicMerchantResult;
let merchant2Config: BasicMerchantResult;
let tokenizeOrder: ApiResponse<TokenizeOrderResponse>;

let userEmail: string;
let processorId = '';
let externalTransactionId = '';
let transactionId = '';

test.describe('@regression DEUNA SuperAdmin - Total Refund with payment processor Kushki MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    merchant1Config = await configMerchant.basicSetup('MX');
    merchantId = merchant1Config.merchantId;
    merchantToken = merchant1Config.merchantToken;
    merchantName = merchant1Config.merchantName;
    privateKey = merchant1Config.privateKey;
    publicKey = merchant1Config.publicKey;
    const { networkId } = await apiCallNewman.createNetwork(
      merchant1Config.merchantId,
      merchant1Config.merchantToken
    );

    merchant2Config = await configMerchant.basicSetup('MX');
    merchantId = merchant2Config.merchantId;
    merchantName = merchant2Config.merchantName;
    privateKey = merchant2Config.privateKey;
    publicKey = merchant2Config.publicKey;
    await apiCallNewman.addMerchantToNetwork(
      networkId,
      merchant2Config.merchantId,
      merchant2Config.merchantToken
    );

    userEmail = await apiCallNewman.createMerchantUserV2WithNework(
      'superadmin',
      'all',
      merchant1Config.merchantId,
      networkId,
      merchant1Config.merchantToken
    );

    tokenizeOrder = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeOrder.data.token;
    orderId = tokenizeOrder.data.order.order_id;
    processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T498 DEUNA SuperAdmin refunds a transaction',
    { tag: ['@admin', '@smoke', '@preprod', '@admin_ui', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchant2Config.merchantId);
      });

      await test.step('The user navigates to the payment widget screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
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
        await adminHomePage.setMerchantIdSessionStorage(merchant2Config.merchantId);
        await adminOrderDetailsPage.goToOrderDetails(
          merchant2Config.merchantId,
          tokenizeOrder.data.token
        );
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('The processed transaction is refunded', async () => {
        await adminOrderDetailsPage.refundTotalOrder();
      });

      await test.step('Send webhook for refund if preprod', async () => {
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
        transactionId = paymentData?.orderPayment?.data?.id;

        await apiCallNewman.sendWebhookRefundIfPreprod(
          'refunded',
          transactionId,
          externalTransactionId,
          processorId
        );
      });

      await test.step('Validate that the transaction has been refunded', async () => {
        await adminOrderDetailsPage.assertPaymentStatus('refunded');
      });
    }
  );
});
