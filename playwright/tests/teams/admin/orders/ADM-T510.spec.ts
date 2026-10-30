import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';

test.describe('@regression feature to validate with automated test case', () => {
  test(
    '@ADM-T510 Reports pagination',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminReportsPage = new AdminReportsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(getDefaultMerchant());
      });

      await test.step('The user goes to Reports', async () => {
        await adminHomePage.goToReports();
        await adminReportsPage.assertPresenceInReports();
      });

      await test.step('The user clicks on paginator 20 button and sees at least a report on list', async () => {
        await adminReportsPage.selectPaginationOption('20');
        await adminReportsPage.assertTableHaveAtLeastOneRow();
      });

      await test.step('The user clicks on paginator 50 button and sees at least a report on list', async () => {
        await adminReportsPage.selectPaginationOption('50');
        await adminReportsPage.assertTableHaveAtLeastOneRow();
      });

      await test.step('The user clicks on paginator 100 button and sees at least a report on list', async () => {
        await adminReportsPage.selectPaginationOption('100');
        await adminReportsPage.assertTableHaveAtLeastOneRow();
      });
    }
  );
});
