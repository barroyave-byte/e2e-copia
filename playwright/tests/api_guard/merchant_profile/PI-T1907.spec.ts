import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { RiskOption } from '@support/interfaces/riskOption';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

let privateKey!: string;
let orderToken!: string;
let merchantId!: string;

test.describe('@regression feature to validate with the automated test case', () => {
  let publicKey: string;
  test.beforeAll(async ({ emaService }) => {
    const merchantSetup = await configMerchant.basicSetup('MX');
    const { privateKey: pk, merchantId: merchantIdParam, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    merchantId = merchantIdParam;
    privateKey = pk;
    const response = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 20000,
    });
    orderToken = response.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1907 Procesar una transacción con motor de fraude Clearsale medium risk',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminCommercePage = new AdminCommercePage(page, 'ES');
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
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
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('It validates that the fraud decision is respectively correct: processor, risk_level, fraud_decision', async () => {
        await paymentDeunaNowPage.assertFraudDecision(
          ConnectionsAvailable.clearsale,
          'medium',
          'manual_review',
          {
            privateKey,
            orderToken,
          }
        );
      });
    }
  );
});
