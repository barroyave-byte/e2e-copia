import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { getMerchantByConfig } from '@pages/admin/utils/getMerchantByEnv';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';
import { AdminScheduleReportsPage } from '@pages/admin/adminScheduleReportsPage';
import { reconMerchants, type ScheduleReportType } from '@pages/admin/constants/commons';

const scheduleReportType: ScheduleReportType = 'reconciliations';
const reportSource = 'merchant_source';

test.describe('@regression feature to validate schedule report creation', () => {
  test(
    '@RECON-T15 Creación de informe programado - Validación nombre obligatorio',
    {
      tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminReportsPage = new AdminReportsPage(page);
      const adminScheduleReportsPage = new AdminScheduleReportsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        const merchantIdToUse = getMerchantByConfig(reconMerchants);

        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantIdToUse);
      });

      await test.step('user go to reports page', async () => {
        await adminHomePage.goToReports();
        await adminReportsPage.assertPresenceInReports();
      });

      await test.step('go to schedule report creation form', async () => {
        await adminReportsPage.clickToOpenScheduleReportTypes();
        await adminReportsPage.goToScheduleReportCreationForm(scheduleReportType);
        await adminScheduleReportsPage.assertPresenceInScheduleReportPage(scheduleReportType);
      });

      await test.step('select report source, leaving the name empty', async () => {
        await adminScheduleReportsPage.selectReportSource(reportSource);
      });

      await test.step('select scheduled timing and monthly periodicity', async () => {
        await adminScheduleReportsPage.selectTiming('scheduled');
        await adminScheduleReportsPage.selectPeriodicity('monthly');
      });

      await test.step('add a condition filter', async () => {
        await adminScheduleReportsPage.addConditionFilter();
      });

      await test.step('select a report column', async () => {
        await adminScheduleReportsPage.expandFirstColumnGroupAndSelectColumn();
      });

      await test.step('validate that report name is required', async () => {
        await adminScheduleReportsPage.assertButtonIsDisabled(
          adminScheduleReportsPage.buttonCreateScheduleReport
        );
      });
    }
  );
});
