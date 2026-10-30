import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';
import { AdminMetricsPage } from '@pages/admin/metrics/adminMetricsPage';

const metricsType = 'reconciliation';

test.describe('@regression feature to validate iframe with charts', () => {
  test(
    '@RECON-T17 Reconciliation Metrics',
    {
      tag: ['@admin', '@admin-preprod', '@team_admin'],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminMetricsPage = new AdminMetricsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(getDefaultMerchant());
      });

      await test.step('The user goes Metrics Page', async () => {
        await adminHomePage.goToMetrics();
      });

      await test.step('The user selects Reconciliation Metrics and validate iframes', async () => {
        await adminMetricsPage.selectMetricsTab(metricsType);
        await adminMetricsPage.assertMetricsTabIsSelected(metricsType);
        await adminMetricsPage.assertReconciliationIframesAreAttached();
      });
    }
  );
});
