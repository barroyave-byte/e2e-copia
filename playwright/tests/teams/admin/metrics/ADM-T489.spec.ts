import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminMetricsPage } from '@pages/admin/metrics/adminMetricsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;

  test.beforeAll(async ({ emaService }) => {
    // create merchant for a country
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
  });

  test(
    '@ADM-T489 Validate that a single-day filter is applied and metrics iframes remain present',
    {
      tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminMetricsPage = new AdminMetricsPage(page);
      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes Metrics Page', async () => {
        await adminHomePage.goToMetrics();
      });

      await test.step('The user sees principal metrics', async () => {
        await adminMetricsPage.assertPrincipalMetrics();
      });

      let selectedDate = '';
      await test.step('The user selects a single date range', async () => {
        selectedDate = await adminMetricsPage.selectsAPeriodFilter();
      });

      await test.step('Validate the applied single-day filter and metrics iframes', async () => {
        await adminMetricsPage.assertSingleDayPeriodIsApplied(selectedDate);
        await adminMetricsPage.assertPrincipalMetrics();
      });
    }
  );
});
