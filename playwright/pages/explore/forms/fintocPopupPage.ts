import { expect, FrameLocator, Locator, Page } from '@playwright/test';

export class FintocPopupPage {
  readonly page: Page;

  private readonly mainInputs: Locator;
  private readonly mainAppAuth: Locator;
  private readonly pageContinueButton: Locator;

  // Fintoc wizard DOM — third-party iframe (wizard.fintoc.com), DEUNA has no control over
  // these selectors. data-testid cannot be requested; Fintoc's own data-test attributes are used.
  private readonly bankButton: Locator;
  private readonly rutInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginSubmitButton: Locator;
  private readonly accountSelectionTitle: Locator;
  private readonly accountInfoBalance: Locator;
  private readonly accountContinueButton: Locator;
  private readonly iframeInputs: Locator;
  private readonly iframeAppAuth: Locator;
  private readonly wizardContinueButton: Locator;

  constructor(page: Page, wizardFrame?: FrameLocator) {
    this.page = page;

    this.mainInputs = page.locator('[data-test="input"]');
    this.mainAppAuth = page.getByText('Autoriza en tu app', { exact: false });
    this.pageContinueButton = page.locator('[data-test="continue-button"]');

    const frame = wizardFrame ?? page.frameLocator('iframe');
    this.bankButton = frame.locator('[data-test="bank-button"]').first();
    this.rutInput = frame.locator('#username input');
    this.passwordInput = frame.locator('#password input');
    this.loginSubmitButton = frame.locator('[data-test="submit-button-wrapper"]');
    this.accountSelectionTitle = frame.getByText('Elige una cuenta para pagar');
    this.accountInfoBalance = frame.locator('[data-test="account-info-number-balance"]').first();
    this.accountContinueButton = frame.locator('[data-test="submit-button"]');
    this.iframeInputs = frame.locator('[data-test="input"]');
    this.iframeAppAuth = frame.getByText('Autoriza en tu app', { exact: false });
    this.wizardContinueButton = frame.locator('[data-test="continue-button"]');
  }

  async waitForBankList() {
    await expect(
      this.bankButton,
      'Fintoc bank selection screen did not appear in the embedded wizard'
    ).toBeVisible({ timeout: 60000 });
  }

  async selectBank(_bankName: string) {
    await this.bankButton.waitFor({ state: 'visible', timeout: 60000 });
    await this.bankButton.click();
  }

  async login(rut: string, password: string) {
    await this.rutInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.rutInput.fill(rut);
    await expect(this.passwordInput, 'Fintoc password input did not appear').toBeVisible({
      timeout: 15000,
    });
    await this.passwordInput.fill(password);
    await expect(this.loginSubmitButton, 'Fintoc login submit button did not appear').toBeVisible({
      timeout: 15000,
    });
    await this.loginSubmitButton.click();
  }

  async waitForAccountSelectionAndContinue() {
    await this.accountSelectionTitle.waitFor({ state: 'visible', timeout: 60000 });
    await this.accountInfoBalance.waitFor({ state: 'visible', timeout: 15000 });
    await this.accountContinueButton.scrollIntoViewIfNeeded();
    await expect(
      this.accountContinueButton,
      'Fintoc account continue button did not appear'
    ).toBeVisible({ timeout: 15000 });
    await this.accountContinueButton.click();
  }

  async completeSecondFactor() {
    // Second-factor screen has three possible variants:
    //   - Coordinates (3 inputs)      → fill "00" per box
    //   - SMS OTP (4 inputs)          → fill "0" per box
    //   - Mobile app auth (no inputs) → nothing to do; Fintoc confirms automatically
    // All variants may appear in the wizard iframe or in the popup's main frame.
    let useFrame = false;
    let isAppAuth = false;

    const neverReject = <T>(p: Promise<T>): Promise<T | never> =>
      p.catch(
        () =>
          new Promise(() => {
            /* stay pending */
          })
      );

    await Promise.race([
      neverReject(this.mainInputs.first().waitFor({ state: 'visible', timeout: 60000 })),
      neverReject(this.iframeInputs.first().waitFor({ state: 'visible', timeout: 60000 })).then(
        () => {
          useFrame = true;
        }
      ),
      neverReject(this.mainAppAuth.waitFor({ state: 'visible', timeout: 60000 })).then(() => {
        isAppAuth = true;
      }),
      neverReject(this.iframeAppAuth.waitFor({ state: 'visible', timeout: 60000 })).then(() => {
        isAppAuth = true;
      }),
    ]);

    if (isAppAuth) {
      return;
    }

    const inputs = useFrame ? this.iframeInputs : this.mainInputs;
    const count = await inputs.count();

    if (count >= 4) {
      for (let i = 0; i < count; i++) {
        await expect(inputs.nth(i), `Fintoc second-factor input ${i} did not appear`).toBeVisible({
          timeout: 15000,
        });
        await inputs.nth(i).fill('0');
      }
    } else {
      await inputs.nth(0).fill('00');
      await inputs.nth(1).fill('00');
      await inputs.nth(2).fill('00');
    }

    const btn = useFrame ? this.wizardContinueButton : this.pageContinueButton;
    await btn.scrollIntoViewIfNeeded();
    await expect(btn, 'Fintoc second-factor continue button did not appear').toBeVisible({
      timeout: 15000,
    });
    await btn.click();
  }

  async assertFintocUrl() {
    await this.page.waitForLoadState();
    const url = this.page.url();
    expect(url).toContain('fintoc');
  }
}
