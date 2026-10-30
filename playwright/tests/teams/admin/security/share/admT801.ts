import { expect, test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminSecurityPolicyPage } from '@pages/admin/security/adminSecurityPolicyPage';
import { AdminAuth0Page } from '@pages/admin/authentication/adminAuth0Page';
import { AUTH0_LOGIN_SCREEN, AUTH_MODE } from '@pages/admin/authentication/constants';
import { adminReauthenticate } from '@pages/admin/authentication/adminReauthenticate';
import { AUTH0_SECURITY_AUTH_FILE } from '@support/constants/authFile';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { AdminMfaCredentials } from './adminMfaCredentials';

const FIXED_MERCHANT_IDS: Record<allowedEnvironments, string> = {
  [allowedEnvironments.DEVELOPMENT]: 'afe7ac5c-ae04-4197-b03b-1e8d5acfcc14',
  [allowedEnvironments.STAGING]: '56f8ecc1-2f94-4d24-91b6-c69ef69924f1',
  [allowedEnvironments.PRODUCTION]: '',
  [allowedEnvironments.PRE_PRODUCTION]: '',
};

const AUTH0_TEST_USER_CREDENTIALS = AdminMfaCredentials.ADM_T801;

export function registerADMT801(): void {
  test.describe('@regression Merchant with Required 2FA policy — user logs in and configures MFA', () => {
    if (allowedEnvironments.PRODUCTION === envConfig.NODE_ENV) {
      test.skip(true, 'This test is not ready for production environments');
    }

    // Use an isolated storageState so this suite's Auth0 session never overwrites
    // the shared baseline session read by other parallel tests.
    test.use({ storageState: AUTH0_SECURITY_AUTH_FILE });

    const FIXED_MERCHANT_ID =
      FIXED_MERCHANT_IDS[envConfig.NODE_ENV as allowedEnvironments] ??
      FIXED_MERCHANT_IDS[allowedEnvironments.STAGING];

    let merchantToken: string;
    let userToken: string;
    let otpSecret: string;
    let testUserId: string;

    test.beforeAll(async ({ browser, merchantAuthService }) => {
      merchantToken = (await merchantAuthService.merchantLogin()).token;

      userToken = (await merchantAuthService.merchantLogin(AUTH0_TEST_USER_CREDENTIALS)).token;
      testUserId = (await merchantAuthService.getCurrentUserProfile(userToken)).id;

      await AdminSecurityPolicyPage.resetUserMFAEnrollment(
        testUserId,
        merchantToken,
        FIXED_MERCHANT_ID
      );
      await AdminSecurityPolicyPage.disableMerchant2FAPolicy(FIXED_MERCHANT_ID, merchantToken);
      await adminReauthenticate(
        browser,
        AUTH_MODE.AUTH0,
        AUTH0_TEST_USER_CREDENTIALS,
        AUTH0_SECURITY_AUTH_FILE
      );
    });

    test(
      '@ADM-T801 User logs in to a merchant with Required 2FA and completes MFA enrollment',
      { tag: ['@admin', '@team_admin'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminSecurityPolicyPage = new AdminSecurityPolicyPage(page);
        const adminAuth0Page = new AdminAuth0Page(page);

        await test.step('The test user logs in to the admin panel', async () => {
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
            'User without MFA enrollment should be redirected before enabling required policy'
          ).toBe(AUTH0_LOGIN_SCREEN.REDIRECTED);
          await adminAuth0Page.waitForOrdersPage();

          await adminHomePage.setMerchantIdSessionStorage(FIXED_MERCHANT_ID);
          await page.reload();
        });

        await test.step('The user enables the required 2FA policy for the merchant', async () => {
          await adminHomePage.goToCommerce();
          await adminHomePage.navigateToSecuritySettings();
          await adminSecurityPolicyPage.enable2FAPolicyAsRequired();
        });

        await test.step('The user logs out from the admin panel', async () => {
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
        });

        await test.step('The user logs in and Auth0 forces 2FA enrollment (Required policy)', async () => {
          await adminAuth0Page.loginAndHandleOrgPicker(
            AUTH_MODE.AUTH0,
            AUTH0_TEST_USER_CREDENTIALS
          );

          // With Required 2FA and no prior enrollment, Auth0 redirects to the OTP enrollment page
          await adminAuth0Page.waitForEnrollmentPage();
          otpSecret = await adminAuth0Page.extractSecretAndCompleteEnrollment();
        });

        await test.step('Verify the user is successfully authenticated after MFA enrollment', async () => {
          await adminHomePage.assertAdminHomePageAsCurrentPage();
        });
      }
    );

    test.afterAll(async () => {
      await AdminSecurityPolicyPage.resetUserMFAEnrollment(
        testUserId,
        merchantToken,
        FIXED_MERCHANT_ID
      );
      await AdminSecurityPolicyPage.disableMerchant2FAPolicy(FIXED_MERCHANT_ID, merchantToken);
    });
  });
}
