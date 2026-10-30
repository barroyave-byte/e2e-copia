import { CommonsActions } from '@pages/commonActions';
import { expect, Locator, Page } from '@playwright/test';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';

export class AdminSecurityPolicyPage extends CommonsActions {
  static readonly AUTH0_ENROLLMENT_URL_PATTERN =
    /https:\/\/login-admin\.(dev\.|stg\.)?deuna\.com\/u\/mfa-otp-enrollment/;

  readonly page: Page;

  readonly switch2FAMode: Locator;
  readonly buttonSavePolicy: Locator;
  readonly radioButton2FAOptional: Locator;
  readonly radioButton2FARequired: Locator;
  readonly buttonEnable2FA: Locator;
  readonly buttonMyDataSecurityTab: Locator;
  readonly commerceSecurityTab: Locator;
  readonly buttonConfirmDisable2FA: Locator;
  readonly buttonConfirmReset2FA: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.switch2FAMode = page.getByTestId('commerce-security-toggle-mfa');
    this.buttonMyDataSecurityTab = page.getByTestId('user-profile-filter-tab-security');
    this.radioButton2FAOptional = page.getByTestId('commerce-security-radio-mfa-optional');
    this.radioButton2FARequired = page.getByTestId('commerce-security-radio-mfa-required');
    this.buttonSavePolicy = page.getByTestId('commerce-security-button-save');
    this.buttonEnable2FA = page.getByTestId('user-profile-security-action');
    this.commerceSecurityTab = page.getByTestId('commerce-filter-tab-security');
    this.buttonConfirmDisable2FA = page.getByRole('button', { name: /confirmar/i });
    this.buttonConfirmReset2FA = page
      .getByRole('button', { name: 'Confirmar reseteo' })
      .or(page.getByRole('button', { name: 'Confirm reset' }));
  }

  async enable2FAPolicyAsOptional() {
    await this.enable2FAPolicy(this.radioButton2FAOptional);
  }

  async enable2FAPolicyAsRequired() {
    await this.enable2FAPolicy(this.radioButton2FARequired);
  }

  private async enable2FAPolicy(radioButton: Locator) {
    await this.assertIsVisible(this.switch2FAMode);
    await this.assertIsVisible(radioButton);

    if (!(await this.switch2FAMode.isChecked())) {
      await this.switch2FAMode.click();
      expect(this.switch2FAMode).toBeChecked();
    }

    // The MFA-mode radio is a Radix RadioGroupItem (button[role="radio"] with
    // aria-checked/data-state) — no nested <input type="radio">. isChecked()/
    // toBeChecked() support aria-checked natively, so no extra atom is needed
    // (confirmed live, ADM-T799/ADM-T802).
    if (!(await radioButton.isChecked())) {
      await radioButton.click();
      await expect(radioButton, 'The MFA-mode radio did not get checked').toBeChecked({
        timeout: 10_000,
      });
      await this.buttonSavePolicy.click();
      await this.assertButtonIsDisabled(this.buttonSavePolicy);
    }
  }

  async initiateUserSelfEnrollment2FA() {
    await this.openMyDataSecurityTab();
    await expect(this.buttonEnable2FA).toBeVisible();
    await this.click(this.buttonEnable2FA);
  }

  async openMyDataSecurityTab() {
    await this.assertIsVisible(this.buttonMyDataSecurityTab);
    await this.click(this.buttonMyDataSecurityTab);
  }

  static async resetUserMFAEnrollment(
    userId: string,
    merchantToken: string,
    merchantId: string
  ): Promise<void> {
    const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
    await merchantAuthService.resetUserMfa(userId, merchantToken, merchantId);
    console.log(`[afterAll] MFA reset successfully for user ${userId}`);
  }

  static async disableMerchant2FAPolicy(merchantId: string, merchantToken: string): Promise<void> {
    const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
    await merchantAuthService.updateMerchantMfaPolicy(merchantId, merchantToken, 'disabled');
    console.log(`[afterAll] 2FA policy disabled for merchant ${merchantId}`);
  }

  async verifyMerchant2FAPolicyInCommerce(expectedPolicy: 'optional' | 'required') {
    const radioButton =
      expectedPolicy === 'optional' ? this.radioButton2FAOptional : this.radioButton2FARequired;
    await expect(radioButton, `The "${expectedPolicy}" MFA-mode radio is not checked`).toBeChecked({
      timeout: 10_000,
    });
  }

  async openCommerceSecurityTab() {
    await this.commerceSecurityTab.click();
  }

  getResetUserMFAButton(userId: string) {
    return this.page.getByTestId(`roles-and-permissions-users-table-row-${userId}-action-resetMfa`);
  }

  async disable2FAFromUserProfile() {
    // Click the enable/disable button (same testid for both states)
    await expect(this.buttonEnable2FA).toBeVisible({ timeout: 10_000 });
    await this.buttonEnable2FA.click();

    await expect(this.buttonConfirmDisable2FA).toBeVisible({ timeout: 5_000 });
    await this.buttonConfirmDisable2FA.click();
    await expect(this.buttonConfirmDisable2FA).not.toBeVisible({ timeout: 5_000 });
  }

  async resetUserMFAFromUsersGrid(userId: string) {
    const buttonReset2FA = this.getResetUserMFAButton(userId);

    await expect(buttonReset2FA).toBeVisible({ timeout: 5_000 });
    await buttonReset2FA.click();

    await expect(this.buttonConfirmReset2FA).toBeVisible({ timeout: 5_000 });
    await this.buttonConfirmReset2FA.click();
    await expect(this.buttonConfirmReset2FA).not.toBeVisible({ timeout: 5_000 });
  }
}
