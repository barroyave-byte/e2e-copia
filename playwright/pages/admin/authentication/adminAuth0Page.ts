import { expect, Locator, Page } from '@playwright/test';
import envConfig from '@support/envConfig';

import { AUTH0_LOGIN_SCREEN, AUTH0_LOCATORS } from './constants';
import { detectAuth0LoginScreen } from './utils/detectAuth0LoginScreen';
import { generateOTPCode } from './utils/generateOTPCode';
import { buildAdminLoginUrl } from './utils/buildAdminLoginUrl';
import type { AdminCredentials, Auth0LoginScreen, AuthMode } from './types';
import { AdminSecurityPolicyPage } from '../security/adminSecurityPolicyPage';

const TOTP_PERIOD_SECONDS = 30;
const TOTP_SAFE_WINDOW_SECONDS = 5;
const MFA_CHALLENGE_MAX_RETRIES = 2;
const MFA_CHALLENGE_ERROR_TIMEOUT_MS = 5_000;

function getTotpTimeRemaining(): number {
  return TOTP_PERIOD_SECONDS - (Math.floor(Date.now() / 1000) % TOTP_PERIOD_SECONDS);
}

export class AdminAuth0Page {
  // Login form locators
  readonly usernameInputLocator: Locator;
  readonly passwordInputLocator: Locator;
  readonly loginSubmitButtonLocator: Locator;

  // Org picker locators
  readonly orgPickerSubmitButtonLocator: Locator;

  // MFA challenge locators
  readonly otpInputLocator: Locator;
  readonly continueButtonLocator: Locator;
  readonly mfaErrorLocator: Locator;

  // OTP enrollment locators
  readonly troubleScanningButtonLocator: Locator;
  readonly copyCodeButtonLocator: Locator;
  readonly secretInputLocator: Locator;

  constructor(private readonly page: Page) {
    // Login form
    this.usernameInputLocator = page.locator(AUTH0_LOCATORS.LOGIN_FORM.USERNAME_INPUT);
    this.passwordInputLocator = page.locator(AUTH0_LOCATORS.LOGIN_FORM.PASSWORD_INPUT);
    this.loginSubmitButtonLocator = page.locator(AUTH0_LOCATORS.LOGIN_FORM.SUBMIT_BUTTON);

    // Org picker
    this.orgPickerSubmitButtonLocator = page
      .locator(AUTH0_LOCATORS.ORG_PICKER.SUBMIT_BUTTON)
      .first();

    // MFA challenge
    this.otpInputLocator = page.locator(AUTH0_LOCATORS.MFA_CHALLENGE.OTP_INPUT).first();
    this.continueButtonLocator = page.locator(AUTH0_LOCATORS.MFA_CHALLENGE.CONTINUE_BUTTON).first();
    this.mfaErrorLocator = page.locator(AUTH0_LOCATORS.MFA_CHALLENGE.ERROR_MESSAGE).first();

    // OTP enrollment
    this.troubleScanningButtonLocator = page.getByText(
      AUTH0_LOCATORS.OTP_ENROLLMENT.TROUBLE_SCANNING_TEXT
    );
    this.copyCodeButtonLocator = page.getByText(AUTH0_LOCATORS.OTP_ENROLLMENT.COPY_CODE_TEXT);
    this.secretInputLocator = page.locator(AUTH0_LOCATORS.OTP_ENROLLMENT.SECRET_INPUT).first();
  }

  // #region Navigation

  async navigateToLoginPage(authMode: AuthMode): Promise<void> {
    const loginUrl = buildAdminLoginUrl(authMode);
    await this.page.goto(loginUrl);
  }

  async waitForOrdersPage(timeout = 30_000): Promise<void> {
    await this.page.waitForURL(`${envConfig.ADMIN_URL}/orders`, { timeout });
  }

  async waitForEnrollmentPage(timeout = 30_000): Promise<void> {
    await this.page.waitForURL(AdminSecurityPolicyPage.AUTH0_ENROLLMENT_URL_PATTERN, { timeout });
  }

  // #endregion

  // #region Login form

  async waitForLoginForm(timeout = 15_000): Promise<void> {
    await this.page.waitForSelector(AUTH0_LOCATORS.LOGIN_FORM.USERNAME_INPUT, { timeout });
  }

  async fillCredentials(credentials: AdminCredentials): Promise<void> {
    await this.usernameInputLocator.fill(credentials.email);
    await this.passwordInputLocator.fill(credentials.password);
  }

  async submitLoginForm(): Promise<void> {
    await this.loginSubmitButtonLocator.click();
  }

  /**
   * Waits for the login form, fills credentials, and submits.
   */
  async fillAndSubmitCredentials(credentials: AdminCredentials): Promise<void> {
    await this.waitForLoginForm();
    await this.fillCredentials(credentials);
    await this.submitLoginForm();
  }

  // #endregion

  // #region Org picker

  async submitOrgPicker(): Promise<void> {
    await this.orgPickerSubmitButtonLocator.click();
  }

  /**
   * Detects the current Auth0 screen and, if it is the org picker, submits it.
   * Returns the screen detected after handling the org picker (or the original screen if
   * it wasn't the org picker).
   */
  async handleOrgPickerIfPresent(): Promise<Auth0LoginScreen> {
    const screen = await detectAuth0LoginScreen(this.page);
    if (screen === AUTH0_LOGIN_SCREEN.ORG_PICKER) {
      await this.submitOrgPicker();
      return detectAuth0LoginScreen(this.page);
    }
    return screen;
  }

  // #endregion

  // #region MFA challenge

  async fillOtpCode(otpCode: string): Promise<void> {
    await this.otpInputLocator.waitFor({ state: 'visible' });
    await this.otpInputLocator.pressSequentially(otpCode);
  }

  async clickContinue(): Promise<void> {
    await this.continueButtonLocator.waitFor({ state: 'visible' });
    await expect(this.continueButtonLocator).toBeEnabled();
    await this.continueButtonLocator.click();
  }

  /**
   * Waits until there are enough seconds left in the current TOTP window before generating
   * a code. This prevents submitting a code that expires before Auth0 validates it.
   */
  private async waitForSafeTotpWindow(): Promise<void> {
    const remaining = getTotpTimeRemaining();
    if (remaining < TOTP_SAFE_WINDOW_SECONDS) {
      console.log(
        `[TOTP] Only ${remaining}s left in window — waiting ${remaining + 1}s for next window`
      );
      await this.page.waitForTimeout((remaining + 1) * 1000);
    }
  }

  /**
   * Forces a wait until the next TOTP window begins. Used between retries to guarantee a
   * freshly-generated code rather than re-submitting the same one.
   */
  private async waitForNextTotpWindow(): Promise<void> {
    const remaining = getTotpTimeRemaining();
    console.log(`[TOTP] Waiting ${remaining + 1}s for next window before retry`);
    await this.page.waitForTimeout((remaining + 1) * 1000);
  }

  /**
   * Generates the current TOTP code from the given secret and submits the MFA challenge.
   * Retries up to {@link MFA_CHALLENGE_MAX_RETRIES} times if Auth0 rejects the code
   * (detected via the `#error-element-code` element), generating a fresh code from the
   * next TOTP window on each retry.
   */
  async completeMfaChallenge(otpSecret: string): Promise<void> {
    for (let attempt = 0; attempt <= MFA_CHALLENGE_MAX_RETRIES; attempt++) {
      if (attempt === 0) {
        await this.waitForSafeTotpWindow();
      } else {
        await this.waitForNextTotpWindow();
        await this.otpInputLocator.fill('');
      }

      const otpCode = generateOTPCode(otpSecret);
      await this.fillOtpCode(otpCode);
      await this.clickContinue();

      const rejected = await this.mfaErrorLocator
        .waitFor({ state: 'visible', timeout: MFA_CHALLENGE_ERROR_TIMEOUT_MS })
        .then(() => true)
        .catch(() => false);

      if (!rejected) return;

      console.warn(
        `[MFA] OTP rejected on attempt ${attempt + 1}/${MFA_CHALLENGE_MAX_RETRIES + 1}`
      );
    }

    throw new Error(
      `MFA challenge rejected after ${MFA_CHALLENGE_MAX_RETRIES + 1} attempts`
    );
  }

  /**
   * If the current screen is an MFA challenge, generates a TOTP code and completes it.
   * Does nothing if the current screen is not an MFA challenge.
   */
  async handleMfaChallengeIfPresent(otpSecret: string): Promise<void> {
    const screen = await detectAuth0LoginScreen(this.page);
    if (screen === AUTH0_LOGIN_SCREEN.MFA_CHALLENGE) {
      await this.completeMfaChallenge(otpSecret);
    }
  }

  // #endregion

  // #region OTP enrollment

  /**
   * Clicks "Trouble Scanning?" to reveal the manual secret, then reads and returns it.
   */
  async extractOtpSecret(): Promise<string> {
    await this.troubleScanningButtonLocator.click();
    await this.copyCodeButtonLocator.waitFor({ state: 'visible', timeout: 10_000 });

    const secret = (await this.secretInputLocator.textContent())?.trim();
    if (!secret) {
      throw new Error('OTP secret element found but text content is empty');
    }
    return secret;
  }

  /**
   * Generates a TOTP code from the given secret and fills + submits the enrollment form.
   */
  async completeOtpEnrollment(otpSecret: string): Promise<void> {
    await this.waitForSafeTotpWindow();
    const otpCode = generateOTPCode(otpSecret);
    await this.fillOtpCode(otpCode);
    await this.clickContinue();
  }

  /**
   * Full enrollment flow: extracts the OTP secret from the page, fills the OTP code, and
   * submits. Returns the extracted secret so the caller can reuse it later (e.g., for a
   * subsequent MFA challenge).
   */
  async extractSecretAndCompleteEnrollment(): Promise<string> {
    const otpSecret = await this.extractOtpSecret();
    await this.completeOtpEnrollment(otpSecret);
    return otpSecret;
  }

  // #endregion

  // #region Composed flows

  /**
   * Navigates to the Auth0 login page, fills credentials, submits, and handles the org
   * picker if it appears. Returns the screen detected after those steps.
   */
  async loginAndHandleOrgPicker(
    authMode: AuthMode,
    credentials: AdminCredentials
  ): Promise<Auth0LoginScreen> {
    await this.navigateToLoginPage(authMode);
    await this.fillAndSubmitCredentials(credentials);
    return this.handleOrgPickerIfPresent();
  }

  // #endregion
}
