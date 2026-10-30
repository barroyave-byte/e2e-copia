import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { test } from '@support/fixtures';

test.describe('@regression Effective logout without a 404 error on the view', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@ADM-T462 Logout without a 404 error',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@preprod', '@admin_ui'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to metrics and click to menu settings', async () => {
        await page.waitForTimeout(2500);
        await adminHomePage.goToMetrics();
        await page.waitForTimeout(800);
        await adminHomePage.clickToMenuSettings();
      });

      await test.step('Logout session and verify if navigate to login page', async () => {
        await adminHomePage.logout();
        await page.waitForTimeout(500);
        await adminHomePage.unexpectedApplicationErrorToBeHidden();

        await page.waitForTimeout(1500);
        await adminLoginPage.assertLoginPageAsCurrentPage();
      });
    }
  );
});
