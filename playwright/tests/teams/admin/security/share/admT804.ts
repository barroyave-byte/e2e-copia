import { expect, test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminSecurityPolicyPage } from '@pages/admin/security/adminSecurityPolicyPage';
import { AdminAuth0Page } from '@pages/admin/authentication/adminAuth0Page';
import { AUTH0_LOGIN_SCREEN, AUTH_MODE } from '@pages/admin/authentication/constants';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { generateOTPCode } from '@pages/admin/authentication/utils/generateOTPCode';
import { AdminMfaCredentials } from './adminMfaCredentials';

// Merchant with Optional 2FA policy — already provisioned
const FIXED_MERCHANT_IDS: Record<allowedEnvironments, string> = {
  [allowedEnvironments.DEVELOPMENT]: 'b0cca58f-a815-40d0-9793-f1375ac2e5a2',
  [allowedEnvironments.STAGING]: '183e61ed-7232-4fab-97ec-92c703881975',
  [allowedEnvironments.PRODUCTION]: '',
  [allowedEnvironments.PRE_PRODUCTION]: '',
};

// Test user
const AUTH0_TEST_USER_CREDENTIALS = AdminMfaCredentials.ADM_T804;

// Helper: Wait for TOTP code to roll over to next 30-second window
async function waitForOtpCodeRollover(secret: string): Promise<void> {
  const firstCode = generateOTPCode(secret);
  let currentCode = firstCode;

  // Wait until code changes (next 30-second window)
  while (currentCode === firstCode) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    currentCode = generateOTPCode(secret);
  }

  console.log(`OTP code rolled over: ${firstCode} → ${currentCode}`);
}

export function registerADMT804(): void {
  test.describe('@regression User disables own 2FA and validates login without MFA challenge', () => {
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
      '@ADM-T804 User disables own 2FA from Profile / Security and validates login without MFA challenge',
      { tag: ['@admin', '@team_admin'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminSecurityPolicyPage = new AdminSecurityPolicyPage(page);
        const adminAuth0Page = new AdminAuth0Page(page);

        let capturedOtpSecret: string;

        await test.step('Logout fixture auth to start fresh', async () => {
          // Fixture provides authenticated page — logout first
          await adminLoginPage.gotoAdmin();
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
          await page.context().clearCookies();
        });

        await test.step('1. Login as test user via Auth0 (precondition: user has no prior 2FA)', async () => {
          const screenAfterOrg = await adminAuth0Page.loginAndHandleOrgPicker(
            AUTH_MODE.AUTH0,
            AUTH0_TEST_USER_CREDENTIALS
          );

          expect(
            screenAfterOrg,
            'User should be redirected directly (no MFA required) — precondition: user has no prior 2FA'
          ).toBe(AUTH0_LOGIN_SCREEN.REDIRECTED);

          await adminAuth0Page.waitForOrdersPage();
          await adminHomePage.assertAdminHomePageAsCurrentPage();
        });

        await test.step('2. Navigate to Profile / Security and enroll 2FA via QR', async () => {
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.clickToMenuMyData();
          await adminSecurityPolicyPage.initiateUserSelfEnrollment2FA();

          await page.waitForURL(AdminSecurityPolicyPage.AUTH0_ENROLLMENT_URL_PATTERN, {
            timeout: 30_000,
          });

          capturedOtpSecret = await adminAuth0Page.extractSecretAndCompleteEnrollment();

          await adminAuth0Page.waitForOrdersPage();
        });

        await test.step('3. Verify enrollment was successful', async () => {
          await adminHomePage.assertAdminHomePageAsCurrentPage();
        });

        await test.step('4. Logout and wait for TOTP rollover', async () => {
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
          await page.context().clearCookies();
          await waitForOtpCodeRollover(capturedOtpSecret);
        });

        await test.step('5. Login again via Auth0 — verify MFA challenge appears', async () => {
          const screenAfterOrg = await adminAuth0Page.loginAndHandleOrgPicker(
            AUTH_MODE.AUTH0,
            AUTH0_TEST_USER_CREDENTIALS
          );
          expect(screenAfterOrg, 'MFA challenge should appear — user now has 2FA enrolled').toBe(
            AUTH0_LOGIN_SCREEN.MFA_CHALLENGE
          );

          await adminAuth0Page.completeMfaChallenge(capturedOtpSecret);

          await adminAuth0Page.waitForOrdersPage();
        });

        await test.step('6. Verify merchant 2FA policy in Commerce section', async () => {
          await page.goto(`${envConfig.ADMIN_URL}/commerce`);
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
          await page.reload();
          await adminSecurityPolicyPage.openCommerceSecurityTab();
          await adminSecurityPolicyPage.verifyMerchant2FAPolicyInCommerce('optional');
        });

        await test.step('7. Navigate to Profile / Security and disable 2FA', async () => {
          await page.goto(`${envConfig.ADMIN_URL}/orders`);
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.clickToMenuMyData();
          await adminSecurityPolicyPage.openMyDataSecurityTab();
          await adminSecurityPolicyPage.disable2FAFromUserProfile();
        });

        await test.step('8. Logout', async () => {
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
          await page.context().clearCookies();
        });

        await test.step('9. Login again via Auth0 — verify NO MFA challenge', async () => {
          const screenAfterOrg = await adminAuth0Page.loginAndHandleOrgPicker(
            AUTH_MODE.AUTH0,
            AUTH0_TEST_USER_CREDENTIALS
          );
          expect(
            screenAfterOrg,
            'No MFA challenge expected — user has no 2FA and policy is Optional'
          ).toBe(AUTH0_LOGIN_SCREEN.REDIRECTED);

          await adminAuth0Page.waitForOrdersPage();
        });

        await test.step('10. Verify user is authenticated in Admin', async () => {
          await adminHomePage.assertAdminHomePageAsCurrentPage();
        });
      }
    );

    test.afterAll(async () => {
      await AdminSecurityPolicyPage.resetUserMFAEnrollment(testUserId, merchantToken, merchantId);
    });
  });
}
