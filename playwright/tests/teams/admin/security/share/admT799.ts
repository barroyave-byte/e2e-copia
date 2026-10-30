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

// Fixed merchant for this test — do NOT create a new one
const FIXED_MERCHANT_IDS: Record<allowedEnvironments, string> = {
  [allowedEnvironments.DEVELOPMENT]: '255bb118-237f-4ffd-9b3a-478907f31535',
  [allowedEnvironments.STAGING]: '1cada0a7-48a0-4a9e-9aba-dcd21d27f508',
  [allowedEnvironments.PRODUCTION]: '',
  [allowedEnvironments.PRE_PRODUCTION]: '',
};

const AUTH0_TEST_USER_CREDENTIALS = AdminMfaCredentials.ADM_T799;

export function registerADMT799(): void {
  test.describe('@regression Enable optional 2FA policy and validate login with TOTP code', () => {
    if (allowedEnvironments.PRODUCTION === envConfig.NODE_ENV) {
      test.skip(true, 'This test is not ready for production environments');
    }

    // Use an isolated storageState so this suite's Auth0 session never overwrites
    // the shared baseline session read by other parallel tests.
    test.use({ storageState: AUTH0_SECURITY_AUTH_FILE });

    const FIXED_MERCHANT_ID =
      FIXED_MERCHANT_IDS[envConfig.NODE_ENV] ?? FIXED_MERCHANT_IDS[allowedEnvironments.STAGING];

    let merchantToken: string;
    let otpSecret: string;
    let testUserId: string;

    test.beforeAll(async ({ browser, merchantAuthService }) => {
      merchantToken = (await merchantAuthService.merchantLogin()).token;

      const userToken = (await merchantAuthService.merchantLogin(AUTH0_TEST_USER_CREDENTIALS))
        .token;
      testUserId = (await merchantAuthService.getCurrentUserProfile(userToken)).id;

      await AdminSecurityPolicyPage.resetUserMFAEnrollment(
        testUserId,
        merchantToken,
        FIXED_MERCHANT_ID
      );
      await adminReauthenticate(
        browser,
        AUTH_MODE.AUTH0,
        AUTH0_TEST_USER_CREDENTIALS,
        AUTH0_SECURITY_AUTH_FILE
      );
    });

    test(
      '@ADM-T799 Usuario habilita política Opcional 2FA en comercio y se autentica con código TOTP',
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
            'User without MFA enrollment should be redirected before self-enrolling'
          ).toBe(AUTH0_LOGIN_SCREEN.REDIRECTED);
          await adminAuth0Page.waitForOrdersPage();

          await adminHomePage.setMerchantIdSessionStorage(FIXED_MERCHANT_ID);
          await page.reload();
        });

        await test.step('The user enables the optional 2FA policy for the merchant', async () => {
          await adminHomePage.goToCommerce();
          await adminHomePage.navigateToSecuritySettings();
          await adminSecurityPolicyPage.enable2FAPolicyAsOptional();
        });

        await test.step('The test user enables their own 2FA using the QR enrollment flow', async () => {
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.clickToMenuMyData();
          await adminSecurityPolicyPage.initiateUserSelfEnrollment2FA();
        });

        await test.step('Await for Auth0 screen to load and extract OTP secret for test user', async () => {
          await adminAuth0Page.waitForEnrollmentPage();
          otpSecret = await adminAuth0Page.extractSecretAndCompleteEnrollment();
        });

        await test.step('The user logs out from the admin panel', async () => {
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
        });

        await test.step('The user logs in again and provides the 2FA TOTP code', async () => {
          const screenAfterOrg = await adminAuth0Page.loginAndHandleOrgPicker(
            AUTH_MODE.AUTH0,
            AUTH0_TEST_USER_CREDENTIALS
          );

          // If the policy is optional and the user already enrolled, Auth0 should ask for the code.
          if (screenAfterOrg === AUTH0_LOGIN_SCREEN.MFA_CHALLENGE) {
            await adminAuth0Page.completeMfaChallenge(otpSecret);
          }
        });

        await test.step('Verify the user is successfully authenticated after entering the TOTP code', async () => {
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
    });
  });
}
