import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { ALLOW_STRIPE_DIRECT_CONFIGURATION } from '@support/http/testData/payment/PaymentMerchantConfigurations';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { RiskOption } from '@support/interfaces/riskOption';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { makeRequest } from '@support/request_helper/requestUtil';
import envConfig from '@support/envConfig';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

test.describe('@regression Purchase with manual review and fraud status accepted', () => {
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let orderId: string;
  test.beforeAll(async ({ emaService, paymentService }) => {
    const responseBasicSetup = await configMerchant.basicSetup('MX');
    merchantId = responseBasicSetup.merchantId;
    merchantToken = responseBasicSetup.merchantToken;
    merchantName = responseBasicSetup.merchantName;
    privateKey = responseBasicSetup.privateKey;
    publicKey = responseBasicSetup.publicKey;
    await paymentService.createConfigMerchantPayments(
      ALLOW_STRIPE_DIRECT_CONFIGURATION,
      merchantId,
      merchantToken
    );

    const responseTokenizeOrder = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 20000,
    });
    orderId = responseTokenizeOrder.data.order.order_id;
    orderToken = responseTokenizeOrder.data.token;
  });

  test(
    '@PF-T160 Purchase manual review - fraud status in_review and then accepted',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminCommercePage = new AdminCommercePage(page, 'ES');
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configures a Stripe connection', async () => {
        await adminHomePage.goToConnections();
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.stripeDirect,
          processorsConfig.stripeProcessor
        );
      });

      await test.step('The user configure a new connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.clearsale,
          processorsConfig.clearsaleFraudProcessor
        );
      });

      await test.step('The user goes to commerce to activate general fraud adjusts', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.activateManualReview();
        await adminCommercePage.activateOpsAutoExecution();
      });

      await test.step('The user select payment strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      const risk: RiskOption[] = [
        {
          riskLevel: 'medium',
          action: 'process',
          processor: {
            name: ConnectionsAvailable.stripeDirect,
            validateCvv: true,
            require3ds: false,
            actionForProcessor: 'decline',
          },
        },
        {
          riskLevel: 'low',
          action: 'process',
          processor: {
            name: ConnectionsAvailable.stripeDirect,
            validateCvv: true,
            require3ds: false,
            actionForProcessor: 'decline',
          },
        },
      ];

      await test.step('The user create specific rules', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.clearsale, risk);
      });

      await test.step('The user open the widget and navigate to the payment page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Selecting user guest to avoid otp', async () => {
        await paymentDeunaNowPage.userGuest();
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.stripeVisaSuccessful, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        const fraudProcessStatus = 'in_review';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await paymentDeunaNowPage.assertFraudProcessStatus(fraudProcessStatus, {
          privateKey,
          orderToken,
        });
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      const transactionID = orderId;
      // clearsale respond with the transactionID in uppercase in sandbox
      let transactionIDUpper = transactionID.toUpperCase();

      // make request to post transaction webhook
      const response = await makeRequest('POST', envConfig.BASE_URL_POSTMAN + '/manual-review', {
        headers: {
          'Clearsale-Apikey': processorsConfig.clearsaleFraudProcessor.properties[0].property_name,
        },
        data: {
          ID: `${transactionIDUpper}`,
          Score: '',
          Status: 'APA',
        },
      });

      await test.step('Validate response from clearsale webhook, to be 200', async () => {
        expect(response.status).toBe(200);
      });

      await test.step('Validate fraud process status change', async () => {
        await paymentDeunaNowPage.assertFraudProcessStatusChanged(
          'accepted',
          privateKey,
          orderToken
        );
      });
    }
  );
});
