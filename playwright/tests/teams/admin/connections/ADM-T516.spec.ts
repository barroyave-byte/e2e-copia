import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { test } from '@support/fixtures';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';

test.describe('@regression feature to validate with the automated test case', () => {
  test(
    '@ADM-T516 validate inputs in connections page to fraud processor',
    {
      tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'],
    },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(getDefaultMerchant());
      });

      await test.step('click on Connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('click on active processors', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
      });

      await test.step('click on Fraud processor section', async () => {
        await adminConnectionsPage.clickOnListProcessorTypes();
        await adminConnectionsPage.clickOnFraudProcessorOption();
      });

      await test.step('click options first fraud processor', async () => {
        await adminConnectionsPage.clickOnButtonOptionsProcessor();
        await adminConnectionsPage.clickOnEditProcessorOption();
      });

      await test.step('validate inputs in fraud processor when edit', async () => {
        await adminConnectionsPage.assertSelectedProcessorTypeInputs();
      });
    }
  );
});
