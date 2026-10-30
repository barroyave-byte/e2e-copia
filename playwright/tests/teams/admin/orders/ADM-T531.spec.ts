import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';

const fileName = `test_automation_${new Date().toISOString()}`;

test.describe('@regression Admin: Verificar que se descargue una sola vez un Reporte', () => {
  test(
    '@ADM-T531 Admin: Verificar que se descargue una sola vez un Reporte',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      // Report generation can take a minute or more, and waitForAvailableReportFile
      // polls for it, so this needs more room than the default test timeout.
      test.setTimeout(10 * 60 * 1000);

      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminReportsPage = new AdminReportsPage(page);

      const startDate = new Date(2026, 0, 1); // Jan 1, 2026
      const endDate = new Date(); // today

      let trackPromise: Promise<void>;
      let countPromise: Promise<void>;

      await test.step('Open Admin and set the merchant ID in sessionStorage', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(getDefaultMerchant());
      });

      await test.step('Generate an Orders report for a specific date range', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.clickExportButton();
        await adminOrdersPage.setFileName(fileName);
        await adminOrdersPage.selectOrderTypeReportToExport();
        await adminOrdersPage.setRangeDates(startDate, endDate);
        await adminOrdersPage.clickExportFileButton();
        await adminReportsPage.assertModalGoToReportIsVisible();
        await adminReportsPage.clickGoToReports();
      });

      await test.step('Navigate to the Reports section', async () => {
        await adminReportsPage.assertPresenceInReports();
        await adminReportsPage.selectPaginationOption('100');
        trackPromise = adminReportsPage.waitForAvailableReportFile('100', fileName);
        countPromise = adminReportsPage.countDownloadRequests();
      });

      await test.step('Download the report and validate it was downloaded only once', async () => {
        await Promise.all([trackPromise, countPromise]);
        const file = await adminReportsPage.getFile();
        await adminReportsPage.waitForDownloadResponse();
        await adminReportsPage.downloadReport(file.report_id);
        await adminReportsPage.assertDownloadUrlStatusIs200();
        await adminReportsPage.assertDownloadUrlCalledTimes(1);
      });
    }
  );
});
