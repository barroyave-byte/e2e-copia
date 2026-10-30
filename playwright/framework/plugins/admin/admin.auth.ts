import { Context, FrameworkPlugin } from '../interface';
import { resolveMerchantId } from '../../resolve';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';

export class PluginAdminAuth extends FrameworkPlugin {
  pluginBaseName = 'admin.auth';

  loginPage!: AdminLoginPage;
  homePage!: AdminHomePage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.loginPage = new AdminLoginPage(context.page);
    this.homePage = new AdminHomePage(context.page);
  }

  /** @description Navigates to the admin login page and logs in with the provided credentials, or falls back to default ADMIN_CREDENTIALS. */
  async $tf_login({ username, password }: { username?: string; password?: string } = {}) {
    await this.loginPage.goToAdminLoginPage();
    await this.loginPage.loginWithEmailAndPassword(
      username ?? ADMIN_CREDENTIALS.email,
      password ?? ADMIN_CREDENTIALS.password
    );
  }

  /** @description Opens the settings menu and clicks the logout button to end the admin session. */
  async $tf_logout() {
    await this.homePage.clickToMenuSettings();
    await this.homePage.logout();
  }

  /** @description Sets the selected merchant ID in session storage and reloads the page. merchantId defaults to the merchant from a previous setup.merchant action. */
  async $tf_setMerchantSession({ merchantId }: { merchantId?: string } = {}) {
    await this.homePage.setMerchantIdSessionStorage(
      resolveMerchantId(this.context, 'admin.auth.setMerchantSession', merchantId)
    );
  }
}
