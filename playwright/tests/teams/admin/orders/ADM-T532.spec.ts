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
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();

let userEmail;

test.describe('@regression DEUNA SuperAdmin - multiples captures with payment processor Kushki MX', () => {
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

    userEmail = await apiCallNewman.createMerchantUserV2WithNework(
      'superadmin',
      'all',
      merchantId,
      networkId,
      merchantToken
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey2);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@ADM-T532 DEUNA SuperAdmin multiples captures a transaction',
    {
      tag: [
        '@admin',
        '@smoke',
        '@review_action',
        '@admin-preprod',
        '@team_admin',
        '@preprod',
        '@admin_ui',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId2);
      });
      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure Kushki connection with Multiple Partial Capture', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessorAuthorizeMPC
        );
      });

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnActiveProcessorsTab();
      });

      await test.step('The user check Kushki connection info', async () => {
        await adminConnectionsPage.assertProcessorAdded(
          processorsConfig.kushkiProcessorAuthorizeMPC.name
        );
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
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId2);
        await adminOrderDetailsPage.goToOrderDetails(merchantId2, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('The processed transaction is partially captured for the first time', async () => {
        await adminOrderDetailsPage.capturePartialOrder(10);
        await adminOrderDetailsPage.assertPaymentStatus('partial_capturing', 5);
      });

      await test.step('The processed transaction is partially captured for the second time', async () => {
        await adminOrderDetailsPage.capturePartialOrder(10);
        await adminOrderDetailsPage.assertPaymentStatus('partial_capturing', 5);
      });

      await test.step('The processed transaction is partially captured for the third time', async () => {
        await adminOrderDetailsPage.capturePartialOrder(10);
        await adminOrderDetailsPage.assertPaymentStatus('captured', 5);
      });
    }
  );
});
