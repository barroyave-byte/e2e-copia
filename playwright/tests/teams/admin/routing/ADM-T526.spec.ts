import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe('@regression Routing CSV for Void Transactions by StoreCode', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 7000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T526 Routing CSV ingreso manual (store) -> Store all',
    { tag: ['@admin', '@smoke', '@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
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

      await test.step('The user configure kushki connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessorAuthorize
        );
      });
      await test.step('The user configure MercadoPago connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.mercadopago,
          processorsConfig.mercadoPagoProcessorAuthorize
        );
      });

      await test.step('The user goes to the payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user default rule', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.mercadopago);
      });

      await test.step('The user goes to create specific rule page', async () => {
        await adminPaymentStrategyPage.createSpecificRule();
      });
      await test.step('Assign Name', async () => {
        await adminPaymentStrategyPage.firstStepSpecificRule();
      });
      await test.step('Add condition', async () => {
        await adminPaymentStrategyPage.addConditionStepSpecificRule();
      });

      await test.step('User create storecode list', async () => {
        await adminPaymentStrategyPage.addConditionManualStoreCodeList('eq', 'all');
      });

      await test.step('routing and save the rule', async () => {
        await adminPaymentStrategyPage.nextStepRouting();
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.kushki,
          undefined,
          'create'
        );
        await adminPaymentStrategyPage.saveRule();
      });

      await await test.step('validate rule created', async () => {
        await adminPaymentStrategyPage.validateRuleCreated();
      });

      await page.waitForTimeout(15000);

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
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.mercadoPagoVisaCardSuccessful,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been declined with status denied', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('authorized', privateKey, orderToken);
      });

      await test.step('validate routing by default rule', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertRouting(ConnectionsAvailable.kushki);
      });
    }
  );
});
