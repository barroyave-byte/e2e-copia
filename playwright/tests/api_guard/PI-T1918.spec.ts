import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { retryGetPostAuthorizationEvents } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();
let orderId: string;
let merchantId: string;
let merchantName: string;
let privateKey: string;
let publicKey: string;
let orderToken: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const responseTokenizeOrder = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = responseTokenizeOrder.data.token;
    orderId = responseTokenizeOrder.data.order.order_id;
  });

  test(
    '@PI-T1918 Procesar una transacción con motor de fraude riskified (post authorization)',
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
          ConnectionsAvailable.riskified,
          processorsConfig.riskifiedProccesor
        );
      });

      await test.step('The user configure a new connection psp', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessor
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

      await test.step('The user create specific rules', async () => {
        await adminPaymentStrategyPage.editDefaultRoutingPostAuthorization(
          ConnectionsAvailable.riskified,
          ConnectionsAvailable.kushki
        );
      });

      await test.step('The user open the widget and navigate to the payment page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
      });

      await test.step('It validates that the fraud decision is respectively correct: processor and status', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
        await adminOrderDetailsPage.assertFraudProcessor(ConnectionsAvailable.riskified);
      });

      await test.step('It validate guard transaction request post auth parameter', async () => {
        const { body, status } = await retryGetPostAuthorizationEvents(orderId, [
          'create_order',
          'transaction',
        ]);
        expect(status).toBe(202);

        const events = body.data.rows.map(([order_id, is_post_auth, event_name]) => ({
          order_id,
          is_post_auth,
          event_name,
        }));
        expect(events).toHaveLength(2);
        expect(events).toEqual(
          expect.arrayContaining([
            { order_id: orderId, event_name: 'create_order', is_post_auth: 'true' },
            { order_id: orderId, event_name: 'transaction', is_post_auth: null },
          ])
        );
      });
    }
  );
});
