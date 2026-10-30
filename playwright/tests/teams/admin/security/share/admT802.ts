import { test, expect } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminAuth0Page } from '@pages/admin/authentication/adminAuth0Page';
import { AdminSecurityPolicyPage } from '@pages/admin/security/adminSecurityPolicyPage';
import { AUTH0_LOGIN_SCREEN, AUTH_MODE } from '@pages/admin/authentication/constants';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminMfaCredentials } from './adminMfaCredentials';

const FIXED_MERCHANT_IDS: Record<allowedEnvironments, string> = {
  [allowedEnvironments.DEVELOPMENT]: '2108aedf-5b3d-420a-a46b-fcae74d83c1a',
  [allowedEnvironments.STAGING]: '64b80832-cfd7-4aa1-901d-73d109732060',
  [allowedEnvironments.PRODUCTION]: '',
  [allowedEnvironments.PRE_PRODUCTION]: '',
};

const AUTH0_TEST_USER_CREDENTIALS = AdminMfaCredentials.ADM_T802;

export function registerADMT802(): void {
  test.describe('@regression Login with optional 2FA policy - no MFA challenge when user has no MFA configured', () => {
    if (allowedEnvironments.PRODUCTION === envConfig.NODE_ENV) {
      test.skip(true, 'This test is not ready for production environments');
    }

    const CONFIGURED_MERCHANT_ID =
      FIXED_MERCHANT_IDS[envConfig.NODE_ENV as allowedEnvironments] ??
      FIXED_MERCHANT_IDS[allowedEnvironments.STAGING];

    let merchantId: string;
    let merchantToken: string;
    let testUserId: string;

    test.beforeAll(async ({ merchantAuthService }) => {
      merchantToken = (await merchantAuthService.merchantLogin()).token;

      const userToken = (await merchantAuthService.merchantLogin(AUTH0_TEST_USER_CREDENTIALS))
        .token;
      const userProfile = await merchantAuthService.getCurrentUserProfile(userToken);
      testUserId = userProfile.id;
      merchantId = userProfile.merchants?.[0] ?? CONFIGURED_MERCHANT_ID;

      await AdminSecurityPolicyPage.resetUserMFAEnrollment(testUserId, merchantToken, merchantId);
      await merchantAuthService.updateMerchantMfaPolicy(merchantId, merchantToken, 'optional');
    });

    test(
      '@ADM-T802 Login with optional 2FA policy - no MFA challenge when user has no MFA configured',
      { tag: ['@admin', '@team_admin'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page, 'ES');
        const adminSecurityPolicyPage = new AdminSecurityPolicyPage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminAuth0Page = new AdminAuth0Page(page);

        await test.step('Login as test user and validate 2FA policy is OPTIONAL', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
          await page.context().clearCookies();

          const screenAfterLogin = await adminAuth0Page.loginAndHandleOrgPicker(
            AUTH_MODE.AUTH0,
            AUTH0_TEST_USER_CREDENTIALS
          );

          expect(
            screenAfterLogin,
            'User without MFA enrollment should be redirected without an MFA challenge'
          ).toBe(AUTH0_LOGIN_SCREEN.REDIRECTED);
          await adminAuth0Page.waitForOrdersPage();

          await page.goto(`${envConfig.ADMIN_URL}/commerce`);
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
          await page.reload();
          await adminSecurityPolicyPage.openCommerceSecurityTab();
          await adminSecurityPolicyPage.verifyMerchant2FAPolicyInCommerce('optional');
        });

        await test.step('Logout cleanly', async () => {
          await page.goto(`${envConfig.ADMIN_URL}/orders`);
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
          await page.context().clearCookies();
        });

        await test.step('Login again with Auth0', async () => {
          const screenAfterLogin = await adminAuth0Page.loginAndHandleOrgPicker(
            AUTH_MODE.AUTH0,
            AUTH0_TEST_USER_CREDENTIALS
          );

          expect(
            screenAfterLogin,
            'User without MFA enrollment should be redirected without an MFA challenge'
          ).toBe(AUTH0_LOGIN_SCREEN.REDIRECTED);
          await adminAuth0Page.waitForOrdersPage();
        });

        await test.step('Validate user is in Admin after second login', async () => {
          await adminHomePage.assertAdminHomePageAsCurrentPage();
        });
      }
    );

    test.afterAll(async () => {
      await AdminSecurityPolicyPage.resetUserMFAEnrollment(testUserId, merchantToken, merchantId);
    });
  });
}
