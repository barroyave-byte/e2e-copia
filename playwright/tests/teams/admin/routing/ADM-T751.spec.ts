import { test } from '@support/fixtures';
import { expect } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();

test.describe('@regression Routing Rule Creation Button State', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@ADM-T751 Verify save button is disabled during rule creation to prevent duplicate records from rapid clicks',
    { tag: ['@admin', '@admin-preprod'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');

      await test.step('Login to admin and configure Kushki connection', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminHomePage.goToConnections();
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessorAuthorize
        );
      });

      await test.step('Create specific routing rule with email list condition', async () => {
        await adminHomePage.goToPaymentStrategy();
        await adminPaymentStrategyPage.createSpecificRule();
        await adminPaymentStrategyPage.firstStepSpecificRule();
        await adminPaymentStrategyPage.addConditionStepSpecificRule();
        await adminPaymentStrategyPage.addConditionManualEmailList();
        await adminPaymentStrategyPage.nextStepRouting();
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.kushki,
          undefined,
          'create'
        );
      });

      await test.step('Save rule and verify button disabled state prevents duplicate submissions', async () => {
        await adminPaymentStrategyPage.assertButtonIsEnabledBeforeClick();

        await adminPaymentStrategyPage.clickSaveButtonAndAssertIsDisabled();

        // Validate only one rule was created
        await adminPaymentStrategyPage.validateRuleCreated();
        await expect(adminPaymentStrategyPage.labelRuleName).toHaveCount(1);
      });
    }
  );
});
