import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';

const configMerchant = new ConfigMerchant();
const specificRuleName = 'ADM-T813 Shadow mode disabled alert';

test.describe('@regression Routing shadow mode disabled alert on specific rule detail', () => {
  let merchantId: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
  });

  test(
    '@ADM-T813 Show alert in rule detail when commerce shadow mode is disabled and the specific rule contains shadow mode',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const adminCommercePage = new AdminCommercePage(page);

      await test.step('The user opens admin and sets merchant id in session storage', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user configures payment and fraud connections', async () => {
        await adminHomePage.goToConnections();
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessor
        );
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.sift,
          processorsConfig.siftFraudProcessor
        );
      });

      await test.step('The user enables shadow mode in commerce', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.selectPaymentsConfigTab();
        await adminCommercePage.setShadowMode(true);
      });

      await test.step('The user creates a specific rule with shadow mode', async () => {
        await adminHomePage.goToPaymentStrategy();
        await adminPaymentStrategyPage.createSpecificRule();
        await adminPaymentStrategyPage.firstStepSpecificRule(specificRuleName);
        await adminPaymentStrategyPage.addConditionStepSpecificRule();
        await adminPaymentStrategyPage.addConditionManualEmailList(
          false,
          'adqminqa+shadow@deuna.com'
        );
        await adminPaymentStrategyPage.nextStepRouting();
        await adminPaymentStrategyPage.selectDefaultFraudEngine(ConnectionsAvailable.kushki);
        await adminPaymentStrategyPage.addShadowMode(ConnectionsAvailable.sift);
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreated(specificRuleName);
      });

      await test.step('The user disables shadow mode in commerce', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.selectPaymentsConfigTab();
        await adminCommercePage.setShadowMode(false);
      });

      await test.step('The user goes back to routing and validates the alert in the rule detail', async () => {
        await adminHomePage.goToPaymentStrategy();
        await adminPaymentStrategyPage.validateShadowModeDisabledAlertInRuleDetail(
          specificRuleName
        );
      });
    }
  );
});
