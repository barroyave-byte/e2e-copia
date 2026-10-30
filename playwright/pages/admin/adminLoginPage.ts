import { expect, Locator, Page } from '@playwright/test';
import envConfig from '@support/envConfig';
import { AUTH_MODE, LOGIN_SCREEN_DETECTION_TIMEOUT } from '@pages/admin/authentication/constants';
import { buildAdminLoginUrl } from '@pages/admin/authentication/utils/buildAdminLoginUrl';
import { detectAuth0Screen } from '@pages/admin/authentication/utils/detectAuth0Screen';
import { detectLegacyScreen } from '@pages/admin/authentication/utils/detectLegacyScreen';

const urlAdmin = envConfig.ADMIN_URL;

export class AdminLoginPage {
  readonly page: Page;
  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly buttonLogin: Locator;

  //Locators
  constructor(page: Page) {
    this.page = page;
    this.inputEmail = page.locator("input[name='email']");
    this.inputPassword = page.locator("input[name='password']");
    this.buttonLogin = page.locator("button[type='submit']");
  }

  //Actions
  async gotoAdmin() {
    console.log('Navigating to Admin ', urlAdmin);
    await this.page.goto(urlAdmin);
    await this.page.waitForURL(`${urlAdmin}/orders`);
  }

  async goToAdminLoginPage() {
    console.log('Navigating to Admin Login Page');
    await this.page.goto(urlAdmin);
    await this.page.waitForURL((url) => url.href.startsWith(urlAdmin));
  }

  /**
   * After a logout the admin sometimes sends the browser to the Auth0 universal login instead of
   * its own form (ADM-T557, run regression-stg-cca02f6a), where input[name='email'] never shows up.
   * This login only knows the legacy form, so it asks for it with login_mode=legacy, as
   * adminAuthenticate does.
   */
  private async ensureLegacyLoginScreen() {
    const screen = await Promise.race([
      detectAuth0Screen(this.page, LOGIN_SCREEN_DETECTION_TIMEOUT),
      detectLegacyScreen(this.page, LOGIN_SCREEN_DETECTION_TIMEOUT),
    ]);
    if (screen !== AUTH_MODE.LEGACY) {
      await this.page.goto(buildAdminLoginUrl(AUTH_MODE.LEGACY));
    }
  }

  async loginWithEmailAndPassword(username: string, password: string) {
    console.log('Loggin user in Admin with username and password');
    await this.ensureLegacyLoginScreen();
    await this.inputEmail.fill(username.toLocaleLowerCase());
    await this.inputPassword.fill(password);
    const loginResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/merchants/login') && response.request().method() === 'POST'
    );
    await this.buttonLogin.click();
    expect((await loginResponse).ok(), 'Admin login request failed').toBe(true);
  }

  async assertLoginPageAsCurrentPage() {
    const currentUrl = this.page.url();
    const url = new URL(currentUrl);
    expect(url.pathname).toBe('/');
    await this.inputEmail.waitFor({ state: 'visible' });
    expect(this.inputEmail).toBeVisible();
  }
}
