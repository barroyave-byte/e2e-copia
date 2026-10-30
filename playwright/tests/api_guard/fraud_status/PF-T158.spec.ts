import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { ALLOW_STRIPE_DIRECT_CONFIGURATION } from '@support/http/testData/payment/PaymentMerchantConfigurations';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { RiskOption } from '@support/interfaces/riskOption';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Purchase with fraud status rejected', () => {
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let merchantId: string;
  test.beforeAll(async ({ emaService, paymentService }) => {
    const merchantSetup = await configMerchant.basicSetup('MX');
    const { privateKey: pk, merchantId: merchantIdParam, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    merchantId = merchantIdParam;
    privateKey = pk;
    await paymentService.createConfigMerchantPayments(
      ALLOW_STRIPE_DIRECT_CONFIGURATION,
      merchantId,
      merchantToken
    );
    const response = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'declinetest@gmail.com',
      amount: 4990,
    });
    orderToken = response.data.token;
  });

  test(
    '@PF-T158 Purchase with status fraud rejected automatic_decision',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
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
          ConnectionsAvailable.riskified,
          processorsConfig.riskifiedProccesor
        );
      });

      await test.step('The user select payment strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      const risk: RiskOption[] = [
        {
          riskLevel: 'high',
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
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.riskified, risk);
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

      await test.step('It is validated that the order has been processed successfully with fraud process status rejected', async () => {
        const status = 'processed';
        const fraudProcessStatus = 'rejected';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await paymentDeunaNowPage.assertFraudProcessStatus(fraudProcessStatus, {
          privateKey,
          orderToken,
        });
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
