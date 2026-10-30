import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { getMerchantByConfig } from '@pages/admin/utils/getMerchantByEnv';

test.describe('@regression feature to validate with automated test case', () => {
  test(
    '@ADM-T491 Order Table Pagination: Page Navigation reset when changed merchant',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        const merchantIdToUse = getMerchantByConfig({
          production: '1aca7137-2f8a-4660-a130-dae83cbe647b',
          staging: 'f4dbd649-32d7-4ebc-b4cf-19d85ff24def',
          default: '63bda292-9eeb-4a47-b2b1-723e0fc7c59e',
        });

        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantIdToUse);
      });

      await test.step('The user goes to Orders', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('The user clicks on paginator next page button', async () => {
        await adminOrdersPage.assertFiltersLoaded();
        await adminOrdersPage.assertOrdersLoaded(10);
        await adminOrdersPage.assertPageNavigationBasedOnOrdersPerPage('next');
      });

      await test.step('The user opens the admin page and set merchant id session', async () => {
        const merchantIdToUse = getMerchantByConfig({
          production: '3e2bb759-70b1-413d-b3c4-d8a38cea5b42',
          staging: 'cfde0416-490c-4fa4-a3c0-43ab9875744d',
          default: 'cfde0416-490c-4fa4-a3c0-43ab9875744d',
        });

        await adminHomePage.setMerchantIdSessionStorage(merchantIdToUse);
      });

      await test.step('reset paginator', async () => {
        await adminOrdersPage.assertFirstPage();
      });
    }
  );
});
