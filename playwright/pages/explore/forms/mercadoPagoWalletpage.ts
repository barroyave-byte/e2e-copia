import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from './formHelpers';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { MercadoPagoWalletTranslations } from '@support/translations/selectors/explore/mercadopago_wallet/mercadoPagoWallet';
import { MercadoPagoWalletCardDetails } from '@support/interfaces/credit_cards';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';

type PaymentResult = 'SUCCESS' | 'CAPTCHA_TRIGGERED' | 'MP_INTERNAL_ERROR';

export class CaptchaBlockedError extends Error {
  constructor(public readonly screenshot: Buffer) {
    super('CAPTCHA detected during Mercado Pago login — test cannot proceed');
    this.name = 'CaptchaBlockedError';
  }
}

export class MercadoPagoWalletPage extends FormHelpers {
  readonly page: Page;
  readonly checkoutSelectors: CheckoutTranslations;
  readonly selectors: MercadoPagoWalletTranslations;
  private popupClosedAfterPay = false;

  readonly labelRedirectingToSite: Locator;
  readonly labelProcessingPayment: Locator;
  readonly alertNotification: Locator;
  readonly alertNotificationText: Locator;
  readonly labelWithMercadoPagoAccountButton: Locator;
  readonly labelWithoutMercadoPagoAccountButton: Locator;
  readonly labelLoginWithAccountButton: Locator;
  readonly labelCreditCard: Locator;
  readonly labelDebitCard: Locator;
  readonly labelAccountBalance: Locator;
  readonly labelBankTransfer: Locator;
  readonly labelBNPL: Locator;
  readonly labelEfecty: Locator;
  readonly labelBBVA: Locator;
  readonly titleHowToPay: Locator;

  readonly inputCardNumber: Locator;
  readonly inputCardHolder: Locator;
  readonly inputExpirationDate: Locator;
  readonly inputCVV: Locator;
  readonly buttonContinue: Locator;

  readonly labelCheckYourPayment: Locator;
  readonly labelPaymentReview: Locator;
  readonly buttonGenerateCode: Locator;
  readonly labelPaymentMethod: Locator;
  readonly labelPaymentSuccessful: Locator;
  readonly labelPaymentProcessing: Locator;
  readonly labelPaymentFailed: Locator;
  readonly labelPaymentRejection: Locator;
  readonly labelFinalizePayment: Locator;
  readonly labelBBVAInstruction: Locator;
  readonly buttonAcknowledge: Locator;
  readonly buttonChangePaymentMethod: Locator;
  readonly buttonChooseAnotherPaymentMethod: Locator;
  readonly iconRejected: Locator;

  readonly inputEmail: Locator;
  readonly buttonPasswordOption: Locator;
  readonly inputPassword: Locator;
  readonly buttonLogin: Locator;
  readonly labelCompleteThisField: Locator;
  readonly oneInstallmentOption: Locator;
  readonly buttonBackToSite: Locator;
  readonly buttonInstallments: Locator;
  readonly option3Installments: Locator;
  readonly divContainerEnterCode: Locator;
  readonly buttonSubmit: Locator;

  readonly divLoginWithAccount: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.checkoutSelectors = getTranslations('checkout', languageCode);
    this.selectors = getTranslations('explore/mercadopago_wallet', languageCode);

    this.labelRedirectingToSite = page.getByText(
      this.selectors.screenMercadoPagoWalletProcessor.labelRedirectingToSite
    );
    this.labelProcessingPayment = page.getByText(
      this.checkoutSelectors.apmRedirectView.labelProcessingPayment
    );
    this.alertNotification = this.iframeLocator(
      page.locator('#alert-container-notification-warning')
    );
    this.alertNotificationText = this.alertNotification.locator('h2').nth(1);

    this.labelWithMercadoPagoAccountButton = this._createProcessorLocator(
      'labelWithMercadoPagoAccount'
    );
    this.labelWithoutMercadoPagoAccountButton = this._createProcessorLocator(
      'labelWithoutMercadoPagoAccount'
    );
    this.labelLoginWithAccountButton = this._createProcessorLocator('labelLoginWithAccount');
    this.labelCreditCard = this._createPaymentMethodLocator('labelCreditCard');
    this.labelDebitCard = this._createPaymentMethodLocator('labelDebitCard');
    this.labelAccountBalance = this._createPaymentMethodLocator('labelAccountBalance');
    this.labelBankTransfer = this._createPaymentMethodLocator('labelBankTransfer');
    this.labelBNPL = this._createPaymentMethodLocator('labelBNPL');
    this.labelEfecty = this._createPaymentMethodLocator('labelEfecty');
    this.labelBBVA = this._createPaymentMethodLocator('labelBBVA');

    this.titleHowToPay = this._createPaymentMethodLocator('titleHowToPay');
    this.inputCardNumber = this._getIframeInputLocator('cardNumber');
    this.inputCardHolder = this.page.getByTestId('cardholder-name--field');
    this.inputExpirationDate = this._getIframeInputLocator('expirationDate');
    this.inputCVV = this._getIframeInputLocator('securityCode');
    this.buttonContinue = this.page.getByRole('button', { name: 'Continuar' });

    this.labelCheckYourPayment = this._createPaymentReviewLocator('labelCheckYourPayment');
    this.labelPaymentMethod = this._createPaymentReviewLocator('labelPaymentMethod');
    // MP is rolling out a redesigned review ("Revisa los datos antes de pagar" / "... de generar
    // el código de pago" + "Generar código") alongside the classic "Revisa tu pago" + "Continuar".
    const redesignedReview = this._getScreenMercadoPagoPaymentReview().labelRedesignedReview;
    this.labelPaymentReview = redesignedReview
      ? this.labelCheckYourPayment.or(this.page.getByText(redesignedReview))
      : this.labelCheckYourPayment;
    this.buttonGenerateCode = this.page.getByRole('button', { name: 'Generar código' });
    this.buttonPay = this.page.getByRole('button', { name: 'Pagar' });

    this.labelPaymentSuccessful = this._createThankYouPageLocator('labelPaymentSuccessful');
    this.labelPaymentProcessing = this._createThankYouPageLocator('labelPaymentProcessing');
    this.labelPaymentFailed = this._createThankYouPageLocator('labelPaymentFailed');
    this.labelPaymentRejection = this._createThankYouPageLocator('labelPaymentRejection');
    this.labelFinalizePayment = this._createThankYouPageLocator('labelFinalizePayment');
    this.labelBBVAInstruction = this._createThankYouPageLocator('labelBBVAInstruction');
    this.buttonAcknowledge = this._createThankYouPageLocator('buttonAcknowledge');
    this.buttonChangePaymentMethod = this._createPaymentMethodLocator('buttonChangePaymentMethod');
    this.buttonChooseAnotherPaymentMethod = this._createPaymentMethodLocator(
      'buttonChooseAnotherPaymentMethod'
    );

    this.inputEmail = this.page.locator('input[name="identifier"]');
    this.buttonPasswordOption = this.page.locator('#password_validation');
    this.inputPassword = this.page.locator('#password');
    this.buttonLogin = this.page.locator('button[value="complete"]');
    this.labelCompleteThisField = this._createLoginLocator('labelCompleteThisField');

    this.oneInstallmentOption = this.page.locator("//li[@id='1x-row']");
    this.buttonBackToSite = this.page.locator('a.cow-button-back-to-site');
    this.buttonInstallments = this.page.locator('#installments-Mensualidades-trigger');
    this.option3Installments = this.page.locator('#installments-Mensualidades-menu-list-option-3');
    this.iconRejected = this.page.locator('.icon-rejected');
    this.divContainerEnterCode = this.page.locator('#enter-code');
    this.buttonSubmit = this.page.getByTestId('submit_button');

    this.divLoginWithAccount = this.page.locator('#mp_login_row');
  }

  private _getIframeInputLocator(frameName: string, inputSelector: string = frameName): Locator {
    // The selector is adjusted to search for the iframe by its 'name' attribute.
    return this.page.frameLocator(`[name="${frameName}"]`).locator(`#${inputSelector}`);
  }

  private _createProcessorLocator(
    key: keyof ReturnType<typeof this._getScreenMercadoPagoWalletProcessor>
  ): Locator {
    const text = this._getScreenMercadoPagoWalletProcessor()[key];
    return this.page.getByText(text);
  }

  private _createPaymentReviewLocator(
    key: keyof ReturnType<typeof this._getScreenMercadoPagoPaymentReview>
  ): Locator {
    const text = this._getScreenMercadoPagoPaymentReview()[key];
    return this.page.getByText(text);
  }

  private _createPaymentMethodLocator(
    key: keyof ReturnType<typeof this._getScreenMercadoPagoWalletPaymentMethod>
  ): Locator {
    const text = this._getScreenMercadoPagoWalletPaymentMethod()[key];
    return this.page.getByText(text);
  }

  private _createThankYouPageLocator(
    key: keyof ReturnType<typeof this._getScreenMercadoPagoThankYouPage>
  ): Locator {
    const text = this._getScreenMercadoPagoThankYouPage()[key];
    return this.page.getByText(text);
  }

  private _createLoginLocator(key: keyof ReturnType<typeof this._getScreenLogin>): Locator {
    const text = this._getScreenLogin()[key];
    return this.page.getByText(text);
  }

  _getScreenLogin() {
    return this.selectors.screenLogin;
  }

  _getScreenMercadoPagoThankYouPage() {
    return this.selectors.screenMercadoPagoThankYouPage;
  }

  _getScreenMercadoPagoPaymentReview() {
    return this.selectors.screenMercadoPagoPaymentReview;
  }

  _getScreenMercadoPagoWalletPaymentMethod() {
    return this.selectors.screenMercadoPagoWalletPaymentMethod;
  }
  _getScreenMercadoPagoWalletProcessor() {
    return this.selectors.screenMercadoPagoWalletProcessor;
  }

  async clickOnOption3Installments() {
    await this.ensureVisibleToClick(this.option3Installments);
  }

  async clickOnInstallments() {
    await this.ensureVisibleToClick(this.buttonInstallments);
  }

  async clickOnBankTransfer() {
    await this._selectPaymentMethod(this.labelBankTransfer, this.labelPaymentReview);
  }

  /**
   * MP serves two variants of the payment method picker. In one, picking an option navigates
   * right away (PUT /checkout/v1/payment/api/flow); in the other ("Elige cómo pagar") it only
   * checks the radio and waits for "Continuar". Clicking the option and moving on assumed the
   * first variant, so the test waited for a screen that never came.
   */
  private async _selectPaymentMethod(option: Locator, nextScreen: Locator) {
    await this.ensureVisibleToClick(option);
    const advanced = await nextScreen
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!advanced) {
      await this.ensureVisibleToClick(this.buttonContinue);
    }
  }

  async clickOnBNPL() {
    const buttonChooseAnotherPaymentMethod = this.page.getByRole('button', {
      name: 'Elegir otro medio de pago',
    });
    if (await buttonChooseAnotherPaymentMethod.isVisible()) {
      await buttonChooseAnotherPaymentMethod.click();
    }
    await this.ensureVisibleToClick(this.labelBNPL);
  }

  async clickOnEfecty() {
    await this.ensureVisibleToClick(this.labelEfecty);
  }

  async clickOnBBVA() {
    await this.ensureVisibleToClick(this.labelBBVA);
  }

  async clickOnBackToSite() {
    await this.ensureVisibleToClick(this.buttonBackToSite);
  }

  async clickOnOneInstallmentOption() {
    await this.ensureVisibleToClick(this.oneInstallmentOption);
  }

  async clickOnLoginWithAccount() {
    await this.ensureVisibleToClick(this.divLoginWithAccount);
  }

  async enterEmail(email: string) {
    await this.inputEmail.clear();
    await this._fillInput(this.inputEmail, email);
  }

  async enterPassword(password: string) {
    await this.ensureVisibleToClick(this.buttonPasswordOption);
    await this._fillInput(this.inputPassword, password);
  }

  private async _submitEmailWithRetry(email: string) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!(await this.hasCaptcha(2_000))) {
        await this.enterEmail(email);
        await this.clickOnContinueButton();

        if (!(await this.hasCaptcha(5_000))) break;
      }

      if (attempt === 1) {
        throw new CaptchaBlockedError(await this.page.screenshot({ fullPage: true }));
      }

      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.ensureVisible(this.inputEmail, { timeout: 10_000 });
    }

    // Si aparece el mensaje de validación, lo intenta una vez más.
    if (await this.labelCompleteThisField.isVisible({ timeout: 2_000 })) {
      await this.enterEmail(email);
      await this.clickOnContinueButton();
    }
  }

  async login(credentials: { email: string; password: string }) {
    await this._submitEmailWithRetry(credentials.email);

    await this.enterPassword(credentials.password);
    await this.clickOnLoginButton();
  }

  /**
   * Logs in, failing the test when Mercado Pago answers with a CAPTCHA.
   *
   * This used to call `test.skip()`, which took the test out of the run: it
   * published as Not Executed in Zephyr, never reached the retry rounds and
   * never reached the ai-heal CSV. A provider block is a real reason for the
   * test not to have proven anything, so it fails and stays visible. The
   * screenshot is attached first so the failure carries the evidence.
   */
  async loginOrFailOnCaptcha(credentials: { email: string; password: string }, testInfo: any) {
    try {
      await this.login(credentials);
    } catch (error) {
      if (error instanceof CaptchaBlockedError) {
        await testInfo.attach('captcha-blocked-login', {
          body: error.screenshot,
          contentType: 'image/png',
        });
      }
      throw error;
    }
  }

  async clickOnLoginButton() {
    await this.ensureVisibleToClick(this.buttonLogin);
  }

  async clickOnAccountBalance() {
    await this.ensureVisibleToClick(this.labelAccountBalance);
  }

  async clickOnCreditCard() {
    await this._selectPaymentMethod(this.labelCreditCard, this.inputCardNumber);
  }

  async clickOnDebitCard() {
    await this._selectPaymentMethod(this.labelDebitCard, this.inputCardNumber);
  }

  async clickOnChangePaymentMethod() {
    await this.ensureVisibleToClick(this.buttonChangePaymentMethod);
  }

  async clickOnChooseAnotherPaymentMethod() {
    await this.ensureVisibleToClick(this.buttonChooseAnotherPaymentMethod);
  }

  private async _fillInput(locator: Locator, value: string) {
    await this.ensureVisible(locator, { timeout: 10_000 });
    await this.pressTextOnInput(locator, value, { delayPress: 200 });
  }

  async fillCard(cardDetails: MercadoPagoWalletCardDetails) {
    await this._fillInput(this.inputCardNumber, cardDetails.number);
    await this._fillInput(this.inputCardHolder, cardDetails.holder);
    await this._fillInput(this.inputExpirationDate, cardDetails.expiration);
    await this._fillInput(this.inputCVV, cardDetails.cvv);
  }

  async clickOnContinueButton() {
    await this.page.waitForTimeout(1_000);
    await this.ensureVisibleToClick(this.buttonContinue.or(this.buttonGenerateCode));
  }

  /**
   * Clicks "Continuar" on the card form until MP shows the review screen. Only clicks again
   * while the form's "Continuar" is still there: MP can take over a second to paint the review
   * after its PUT /payment/api/flow returns, and a blind re-click then waited for a button the
   * review screen does not have.
   */
  async clickOnContinueUntilPaymentReview(maxRetries: number = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await this.clickOnContinueButton();
      const onReview = await this.labelPaymentReview
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (onReview || !(await this.buttonContinue.isVisible())) break;
    }
    await this.ensureVisible(this.labelPaymentReview, { timeout: 20_000 });
  }

  async clickOnPay() {
    await this.ensureVisibleToClick(this.buttonPay);
  }

  /** Clicks Pay, failing the test when a CAPTCHA shows up. See loginOrFailOnCaptcha. */
  async clickOnPayOrFailOnCaptcha(testInfo: any) {
    await this.ensureVisibleToClick(this.buttonPay);

    if (this.page.isClosed()) {
      this.popupClosedAfterPay = true;
      return;
    }

    const result = await Promise.race<'captcha' | 'closed' | 'none'>([
      this.hasCaptcha(2_000).then((found) => (found ? 'captcha' : 'none')),
      this.page.waitForEvent('close').then(() => 'closed' as const),
    ]);

    if (result === 'closed') {
      this.popupClosedAfterPay = true;
      return;
    }

    if (result === 'captcha') {
      const screenshot = await this.page.screenshot({ fullPage: true });
      await testInfo.attach('captcha-blocked-after-pay', {
        body: screenshot,
        contentType: 'image/png',
      });
      throw new CaptchaBlockedError(screenshot);
    }
  }

  async isContainerEnterCodeVisible(timeout: number = 10_000) {
    try {
      await expect(this.divContainerEnterCode).toBeVisible({ timeout });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getEnterCodeInput(index: number) {
    return this.page.locator(`[id*="-digit-${index}"]`);
  }

  async enterCode(code: string) {
    const codeArray = code.split('');

    for (let index = 0; index < codeArray.length; index++) {
      const char = codeArray[index];
      const inputLocator = await this.getEnterCodeInput(index);
      await this._fillInput(inputLocator, char);
    }
  }

  getVerificationCodeFromEmail(email: string) {
    const match = email.match(/(\d{6})(?=@)/);
    return match ? match[1] : '';
  }

  async clickOnSubmitButton() {
    await this.ensureVisibleToClick(this.buttonSubmit);
  }

  async clickOnButtonAcknowledge() {
    await this.ensureVisibleToClick(this.buttonAcknowledge);
  }

  async assertHowToPayViewVisible() {
    await this.ensureVisible(this.titleHowToPay, { timeout: 20_000 });
  }

  async assertPaymentMethodViewVisible() {
    await this.ensureVisible(this.labelPaymentReview, { timeout: 20_000 });
    await this.ensureVisible(this.labelPaymentMethod, { timeout: 20_000 });
  }

  async assertLabelCardFormVisible() {
    // Instead of waiting for the "Crédito" label (which MP inconsistently shows),
    // verify the card form itself is visible by checking the card number input.
    // The form inputs are always present even when the label text is missing.
    await this.ensureVisible(this.inputCardNumber, { timeout: 10_000 });
  }

  async assertLabelRedirectingToSiteVisible() {
    await this.ensureVisible(this.iframeLocator(this.labelRedirectingToSite), { timeout: 20_000 });
  }

  async assertLabelProcessingPaymentVisible() {
    await this.ensureVisible(this.iframeLocator(this.labelProcessingPayment), { timeout: 20_000 });
  }

  async waitForProcessingToComplete(timeout: number = 30_000) {
    // Wait for the "Procesando pago..." screen to disappear
    // This is critical for Mercado Pago popup as it shows this intermediate screen
    // before displaying payment methods (Crédito, Débito, etc.)
    await expect(this.iframeLocator(this.labelProcessingPayment)).toBeHidden({ timeout });
  }

  async assertAlertNotification(text: string) {
    await expect(this.alertNotificationText).toHaveText(text);
  }

  async assertMercadoPagoWalletIsVisible() {
    await this.ensureVisible(this.labelWithMercadoPagoAccountButton, {
      timeout: 20_000,
    });
    await this.ensureVisible(this.labelWithoutMercadoPagoAccountButton, {
      timeout: 20_000,
    });
  }

  async assertPaymentSuccessful() {
    if (this.page.isClosed() || this.popupClosedAfterPay) return;
    await this.ensureVisible(this.labelPaymentSuccessful, { timeout: 10_000 });
  }

  async assertPaymentProcessing() {
    await this.ensureVisible(this.labelPaymentProcessing, { timeout: 10_000 });
  }

  async assertPaymentFailed(testInfo?: any) {
    await this.assertPaymentFailedOrMPError(120_000, testInfo);
  }

  async assertPaymentFailedOrMPError(timeout: number = 120_000, testInfo?: any) {
    const mpErrorTexts = [
      'Oh, no. algo anduvo mal',
      'algo anduvo mal',
      'Parece que esta página no existe',
      'página no existe',
      'Error',
      'Oops',
      'no pudimos procesar',
    ];

    const errorRegex = new RegExp(mpErrorTexts.join('|'), 'i');

    try {
      await Promise.race([
        this.ensureVisible(this.iconRejected, { timeout }),
        this.page
          .getByText(errorRegex)
          .waitFor({ state: 'visible', timeout })
          .then(async () => {
            const detectedText = await this.page.getByText(errorRegex).first().innerText();
            throw new Error(`MP_ERROR: ${detectedText}`);
          }),
      ]);

      console.log('✓ Payment rejected successfully (iconRejected found)');
    } catch (error: any) {
      const isMPError = error.message?.includes('MP_ERROR:');
      const evidenceName = isMPError ? 'mp-internal-error' : 'mp-timeout';

      const screenshotResult = await this.captureEvidence(evidenceName, testInfo);

      if (isMPError) {
        throw new Error(
          `Mercado Pago internal error detected: "${error.message}". ` +
            `Known MP bug. Screenshot: ${screenshotResult}`
        );
      }

      console.warn(`⚠️ Timeout/Error tras ${timeout}ms. URL: ${this.page.url()}`);
      throw new Error(
        `Timeout waiting for payment result (${timeout / 1000}s). ` +
          `Current URL: ${this.page.url()}. Screenshot: ${screenshotResult}`
      );
    }
  }

  private async captureEvidence(name: string, testInfo?: any): Promise<string> {
    if (!testInfo) {
      console.warn('⚠️ testInfo no provisto - saltando screenshot');
      return 'N/A';
    }

    try {
      const screenshot = await this.page.screenshot({ fullPage: true });
      await testInfo.attach(name, {
        body: screenshot,
        contentType: 'image/png',
      });
      return `[Attached: ${name}]`;
    } catch (e: any) {
      return e.message?.includes('closed') ? 'N/A (popup closed)' : 'Error capturing';
    }
  }

  async assertPaymentFinalize() {
    await this.ensureVisible(this.labelFinalizePayment, { timeout: 60_000 });
  }

  async assertBBVAInstructionVisible() {
    await this.ensureVisible(this.labelBBVAInstruction, { timeout: 50_000 });
  }

  /**
   * Detects if Mercado Pago shows a CAPTCHA challenge.
   * Returns true if any CAPTCHA-related element is visible.
   *
   * Common CAPTCHA scenarios:
   * - reCAPTCHA iframe (Google)
   * - Mercado Pago's own security challenge
   * - Anti-bot verification screens
   *
   * @param timeout - Max time to wait for CAPTCHA detection (default: 3000ms)
   * @returns Promise<boolean> - true if CAPTCHA detected, false otherwise
   */
  async hasCaptcha(timeout: number = 1_000): Promise<boolean> {
    const captchaSelectors = [
      // Google reCAPTCHA
      this.page.locator('iframe[src*="recaptcha"]'),
      this.page.locator('iframe[title*="reCAPTCHA"]'),
      this.page.locator('.g-recaptcha'),

      // Generic CAPTCHA patterns
      this.page.locator('[id*="captcha"]'),
      this.page.locator('[class*="captcha"]'),
      this.page.locator('[data-testid*="captcha"]'),

      // Mercado Pago specific security challenges
      this.page.locator('[id*="challenge"]'),
      this.page.locator('[class*="security-check"]'),
      this.page.locator('text=/verify you.*not.*robot/i'),
      this.page.locator('text=/verificar.*no.*robot/i'),
    ];

    for (const selector of captchaSelectors) {
      if (this.page.isClosed()) return false;

      try {
        // First check if element exists (fast)
        const count = await selector.count();
        if (count === 0) continue;

        // Use .first() to avoid strict mode violations when multiple captcha nodes exist
        const target = selector.first();
        await expect(target).toBeVisible({ timeout });
        console.warn(
          '🤖 CAPTCHA detected by selector:',
          await target.evaluate((el) => el.outerHTML.substring(0, 100))
        );
        return true;
      } catch {
        // Selector not found or page closed, continue checking
        continue;
      }
    }

    return false;
  }

  async handlePostPaymentFlow(): Promise<PaymentResult> {
    // 1. Check CAPTCHA
    // CAPTCHA Detection: Mercado Pago sometimes shows anti-bot challenges
    // This is non-deterministic and blocks test execution
    if (await this.hasCaptcha(10_000)) return 'CAPTCHA_TRIGGERED';

    try {
      // Intentar detectar si el pago falló o si hay errores de MP
      await this.assertPaymentFailed();
      return 'SUCCESS';
    } catch (error: any) {
      if (error.message?.includes('Mercado Pago internal error')) return 'MP_INTERNAL_ERROR';
      // Si es un error desconocido, lanzamos para que el test falle de verdad
      throw error;
    }
  }
}
