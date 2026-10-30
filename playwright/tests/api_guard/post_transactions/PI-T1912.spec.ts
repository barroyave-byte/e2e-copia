import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as apiCallNewman from '@support/newman/apiCallNewman';
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
let privateKey!: string;
let orderToken!: string;
let orderId!: string;
let merchantId!: string;

test.describe('@regression your description test suite', () => {
  let publicKey: string;
  test.beforeAll(async ({ emaService }) => {
    const merchantSetup = await configMerchant.basicSetup('MX');
    const { privateKey: pk, merchantId: merchantIdParam, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    merchantId = merchantIdParam;
    privateKey = pk;

    // create order token from postman
    const response = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 20000,
    });
    orderToken = response.data.token;
    orderId = response.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1912 Transaccion en manual review pasa a refunded- Clearsale int',
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

      const transactionID = orderId;
      // clearsale respond with the transactionID in uppercase in sandbox
      let transactionIDUpper = transactionID.toUpperCase();

      // make request to post transaction webhook
      const response = await makeRequest('POST', envConfig.BASE_URL_POSTMAN + '/manual-review', {
        headers: {
          'Clearsale-Apikey': '2E747CE7-2E1E-4CFF-89CF-27E95F951DF1',
        },
        data: {
          ID: `${transactionIDUpper}`,
          Score: '',
          Status: 'FRD',
        },
      });

      await test.step('Validate response from clearsale webhook, to be 200', async () => {
        expect(response.status).toBe(200);
      });

      await test.step('Validate order is refunded in admin', async () => {
        const pollingInterval = 15000;
        const maxDuration = 90000;
        const maxIterations = maxDuration / pollingInterval;
        let orderStatusChanged = false;
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);

        for (let i = 0; i < maxIterations; i++) {
          try {
            await adminOrderDetailsPage.assertPaymentStatus('refunded');
            orderStatusChanged = true;
            console.log('Order refunded by post transaction service');
            break;
          } catch (error) {
            await adminOrderDetailsPage.page.reload();
            console.log('Order has not yet changed status.');
          }

          if (i < maxIterations - 1) {
            await new Promise((resolve) => setTimeout(resolve, pollingInterval));
          } else {
            console.log('the order has not changed its status, it will wait 15 seconds more');
          }
        }

        if (!orderStatusChanged) {
          throw new Error(
            'Order didnt change status on 90 secs, error in post transaction service'
          );
        }

        await adminOrderDetailsPage.assertPaymentStatus('refunded');
      });
    }
  );
});
