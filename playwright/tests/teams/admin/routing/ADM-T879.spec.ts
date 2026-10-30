import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { AdminPaymentStrategyByPercentagePage } from '@pages/admin/payment_strategies/adminPaymentStrategyByPercentagePage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();

const COUNTRY = 'MX';

test.describe('@regression Routing by percentage with split paths', () => {
  let merchantId: string;
  let privateKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup(COUNTRY);
    merchantId = merchant.merchantId;
    privateKey = merchant.privateKey;
    await emaService.tokenizeDeunaNowOrder(COUNTRY, privateKey);
  });

  test(
    '@ADM-T879 Routing by percentage split - Route A PSP shadow / Route B PSP shadow',
    { tag: ['@admin', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminCommercePage = new AdminCommercePage(page);
      const adminPaymentStrategyByPercentagePage = new AdminPaymentStrategyByPercentagePage(
        page,
        'ES'
      );

      await test.step('The user opens the admin page and sets the merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user configures payment and shadow mode connections', async () => {
        await adminHomePage.goToConnections();
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessor
        );
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.conekta,
          processorsConfig.conektaProcessor
        );
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.sift,
          processorsConfig.siftFraudProcessor
        );
      });

      await test.step('The user enables shadow mode in commerce', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.selectPaymentsConfigTab();
        await adminCommercePage.configurationShadowMode();
      });

      await test.step('The user configures routing by percentage with shadow mode on both paths', async () => {
        await adminHomePage.goToPaymentStrategy();
        await adminPaymentStrategyByPercentagePage.clickEditDefaultProcessing();
        await adminPaymentStrategyByPercentagePage.addRoutingSplit();

        await adminPaymentStrategyByPercentagePage.setRoutingSplitPercentage(0, 50);
        await adminPaymentStrategyByPercentagePage.selectSplitRootProcessor(
          0,
          ConnectionsAvailable.kushki
        );
        await adminPaymentStrategyByPercentagePage.addSplitShadowMode(0, ConnectionsAvailable.sift);

        await adminPaymentStrategyByPercentagePage.setRoutingSplitPercentage(1, 50);
        await adminPaymentStrategyByPercentagePage.selectSplitRootProcessor(
          1,
          ConnectionsAvailable.conekta
        );
        await adminPaymentStrategyByPercentagePage.addSplitShadowMode(1, ConnectionsAvailable.sift);

        await adminPaymentStrategyByPercentagePage.saveEditedRoutingRule();
      });
    }
  );
});
