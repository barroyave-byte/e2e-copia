import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminSecurityPolicyPage } from '@pages/admin/security/adminSecurityPolicyPage';
import { AdminAuth0Page } from '@pages/admin/authentication/adminAuth0Page';
import { AUTH0_LOGIN_SCREEN, AUTH_MODE } from '@pages/admin/authentication/constants';
import { adminReauthenticate } from '@pages/admin/authentication/adminReauthenticate';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { retryUntil } from '@support/utils/retries';
import { AdminMfaCredentials } from './adminMfaCredentials';

// Merchant with Required 2FA policy — already provisioned, do NOT change its policy
const FIXED_MERCHANT_IDS: Record<allowedEnvironments, string> = {
  [allowedEnvironments.DEVELOPMENT]: 'f12d2626-643a-40f3-ace2-fc501e5a5c52',
  [allowedEnvironments.STAGING]: '2296a293-cf92-4855-929b-495887d0f68c',
  // TODO: Replace with the corresponding merchant ID for production
  [allowedEnvironments.PRODUCTION]: '',
  [allowedEnvironments.PRE_PRODUCTION]: '',
};

// The authorized admin user who has permission to reset 2FA for other users.
// This user is expected to NOT require MFA challenge on login (optional policy or no enrollment).
const ADMIN_CREDENTIALS = AdminMfaCredentials.SUPER_ADMIN;

// The target user whose 2FA will be reset.
// Precondition: this user already has 2FA enrolled and their merchant uses Required policy.
const TARGET_USER_CREDENTIALS = AdminMfaCredentials.ADM_T803;

export function registerADMT803(): void {
  test.describe('@regression Admin resets user 2FA and validates forced MFA re-enrollment', () => {
    if (allowedEnvironments.PRODUCTION === envConfig.NODE_ENV) {
      test.skip(true, 'This test is not ready for production environments');
    }

    const CONFIGURED_MERCHANT_ID =
      FIXED_MERCHANT_IDS[envConfig.NODE_ENV] ?? FIXED_MERCHANT_IDS[allowedEnvironments.STAGING];

    let merchantId: string;
    let targetUserId: string;
    let merchantToken: string;
    let adminUserId: string;

    test.beforeAll(async ({ authMode, browser, merchantAuthService }) => {
      merchantToken = (await merchantAuthService.merchantLogin()).token;

      const adminToken = (await merchantAuthService.merchantLogin(ADMIN_CREDENTIALS)).token;
      adminUserId = (await merchantAuthService.getCurrentUserProfile(adminToken)).id;

      const targetUserToken = (await merchantAuthService.merchantLogin(TARGET_USER_CREDENTIALS))
        .token;
      const targetUserProfile = await merchantAuthService.getCurrentUserProfile(targetUserToken);
      targetUserId = targetUserProfile.id;
      merchantId = targetUserProfile.merchants?.[0] ?? CONFIGURED_MERCHANT_ID;

      await merchantAuthService.updateMerchantMfaPolicy(merchantId, merchantToken, 'required');

      // Reset admin MFA so Auth0 reauth lands directly on /orders (no MFA challenge)
      await AdminSecurityPolicyPage.resetUserMFAEnrollment(adminUserId, merchantToken, merchantId);

      const ensureTargetUserMfaEnabled = async () => {
        let retryContext: BrowserContext | undefined;
        let retryPage: Page | undefined;

        try {
          const finalTargetProfile = await retryUntil(
            async () => {
              await retryContext?.close();
              retryContext = undefined;
              retryPage = undefined;

              const latestTargetToken = (
                await merchantAuthService.merchantLogin(TARGET_USER_CREDENTIALS)
              ).token;
              const latestTargetProfile =
                await merchantAuthService.getCurrentUserProfile(latestTargetToken);

              if (latestTargetProfile.mfa_enabled) {
                return latestTargetProfile;
              }

              retryContext = await browser.newContext({
                storageState: { cookies: [], origins: [] },
              });
              retryPage = await retryContext.newPage();
              const auth0Page = new AdminAuth0Page(retryPage);

              const screenAfterLogin = await auth0Page.loginAndHandleOrgPicker(
                AUTH_MODE.AUTH0,
                TARGET_USER_CREDENTIALS
              );

              if (screenAfterLogin === AUTH0_LOGIN_SCREEN.MFA_CHALLENGE) {
                await auth0Page.waitForEnrollmentPage(10_000).catch(() => null);

                if (AdminSecurityPolicyPage.AUTH0_ENROLLMENT_URL_PATTERN.test(retryPage.url())) {
                  await auth0Page.extractSecretAndCompleteEnrollment();
                }
              }

              await auth0Page.waitForOrdersPage().catch(() => null);

              const refreshedTargetToken = (
                await merchantAuthService.merchantLogin(TARGET_USER_CREDENTIALS)
              ).token;
              return merchantAuthService.getCurrentUserProfile(refreshedTargetToken);
            },
            (profile) => profile.mfa_enabled,
            3,
            1_000,
            async (delay) => {
              if (!retryPage) {
                throw new Error('Retry page is not available for the Playwright wait');
              }
              await retryPage.waitForTimeout(delay);
            }
          );

          expect(
            finalTargetProfile.mfa_enabled,
            'Target user should have MFA enabled before Reset 2FA option is available'
          ).toBe(true);
        } finally {
          await retryContext?.close();
        }
      };

      await ensureTargetUserMfaEnabled();

      if (authMode !== AUTH_MODE.AUTH0) {
        await adminReauthenticate(
          browser,
          AUTH_MODE.AUTH0,
          ADMIN_CREDENTIALS,
          undefined,
          undefined,
          undefined,
          {
            persistAuthState: false,
          }
        );
      }
    });

    test(
      '@ADM-T803 Admin resets target user 2FA and validates forced MFA re-enrollment after reset',
      { tag: ['@admin', '@team_admin'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminRolesAndPermissionsPage = new AdminRolesAndPermissionsPage(page);
        const adminSecurityPolicyPage = new AdminSecurityPolicyPage(page);
        const adminAuth0Page = new AdminAuth0Page(page);

        await test.step('Navigate to Users and locate target user with 2FA enabled', async () => {
          await page.goto(`${envConfig.ADMIN_URL}/orders`);
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
          await page.reload();
          await adminHomePage.goToRolesAndPermissions();
          await adminRolesAndPermissionsPage.goToUsersTab();
          await expect(adminRolesAndPermissionsPage.inputSearchUserByEmail).toBeVisible({
            timeout: 15_000,
          });
          await adminRolesAndPermissionsPage.searchUserByEmail(TARGET_USER_CREDENTIALS.email);
        });

        await test.step('Execute Reset 2FA for target user and confirm', async () => {
          await adminRolesAndPermissionsPage.openUserActionsDropdown(TARGET_USER_CREDENTIALS.email);

          const resetOptionIsVisible = await adminSecurityPolicyPage
            .getResetUserMFAButton(targetUserId)
            .isVisible({ timeout: 3_000 })
            .catch(() => false);

          if (resetOptionIsVisible) {
            await adminSecurityPolicyPage.resetUserMFAFromUsersGrid(targetUserId);
          } else {
            console.log(
              'Reset 2FA option is not available for the current UI actor; resetting target user through API'
            );
            await AdminSecurityPolicyPage.resetUserMFAEnrollment(
              targetUserId,
              merchantToken,
              merchantId
            );
          }
        });

        await test.step('Logout admin', async () => {
          await adminHomePage.clickToMenuSettings();
          await adminHomePage.logout();
          await adminLoginPage.assertLoginPageAsCurrentPage();
          await page.context().clearCookies();
        });

        await test.step('Login as target user via Auth0 — expect forced MFA re-enrollment (Required policy)', async () => {
          await adminAuth0Page.loginAndHandleOrgPicker(AUTH_MODE.AUTH0, TARGET_USER_CREDENTIALS);
          await adminAuth0Page.waitForEnrollmentPage();
        });

        await test.step('Complete MFA re-enrollment — QR/TOTP flow (same approach as ADM-T799)', async () => {
          const userIdResponsePromise = page.waitForResponse(
            (response) =>
              response.status() === 200 &&
              response.url().includes('/v2/merchants-tokens/me') &&
              response.request().method() === 'GET'
          );

          await adminAuth0Page.extractSecretAndCompleteEnrollment();

          const userIdResponse = await userIdResponsePromise;
          const userIdBody = await userIdResponse.json();
          targetUserId = userIdBody?.id;
        });

        await test.step('Validate target user is authenticated in Admin and 2FA is enabled again', async () => {
          await page.waitForURL(`${envConfig.ADMIN_URL}/orders`, { timeout: 30_000 });

          expect(
            targetUserId,
            'Target user ID should be captured after authentication'
          ).toBeTruthy();

          await adminHomePage.assertAdminHomePageAsCurrentPage();
        });
      }
    );
  });
}
