import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();

test.describe('@regression Routing CSV for Void Transactions by StoreCode', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;

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
    '@ADM-T525 Routing CSV ingreso manual (store) -> Store all',
    {
      tag: [
        '@admin',
        '@smoke',
        '@admin_connection',
        '@admin-preprod',
        '@team_admin',
        '@admin_smoke',
      ],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure Stripe connection', async () => {
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
    }
  );
});
