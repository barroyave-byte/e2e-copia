import { test } from '@support/fixtures';
import { ForgotPasswordPage } from '@pages/auth/forgotPasswordPage';

test.describe('@regression feature to validate Forgot Password rendering without merchant ID', () => {
  test(
    '@ECOM-T580 Se renderiza página de forgot-password cuando no existe merchant id',
    { tag: ['@preprod', '@admin_ui', '@team_enterprise'] },
    async ({ page }) => {
      const forgotPasswordPage = new ForgotPasswordPage(page);

      await test.step('The user visits the forgot password page with a non-existent merchant ID', async () => {
        const merchantId = '9138a2a1-299a-495e-b980-f9c418977b17';
        const merchantCode = 'all';
        const redirectUrl = 'http://myredirectweb.com';

        await forgotPasswordPage.navigateToForgotPassword(merchantId, merchantCode, redirectUrl);
      });

      await test.step('The error message is displayed', async () => {
        await forgotPasswordPage.validateErrorMessageIsVisible();
      });
    }
  );
});
