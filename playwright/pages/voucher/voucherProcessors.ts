import { CommonsActions } from '@pages/commonActions';
import { BrowserContext, expect, FrameLocator, Locator, Page, Response } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { VoucherTranslations } from '@support/translations/selectors/voucher/voucherTranslations';

export enum VoucherProcessors {
  oxxoReference = 'oxxo_reference',
  bazReference = 'baz_reference',
  safetyPayExpress = 'safetypay_express',
  deunaWallet = 'deuna_wallet',
}

export class VoucherProcessorsPage extends CommonsActions {
  readonly voucherFrame: FrameLocator;
  readonly selectors: VoucherTranslations;

  readonly buttonCancel: Locator;

  readonly sectionVoucherHeader: Locator;
  readonly sectionVoucherBody: Locator;
  readonly sectionVoucherDueDate: Locator;
  readonly sectionVoucherFooter: Locator;

  readonly alertSuccessNotification: Locator;
  readonly labelAlertSuccessNotification: Locator;

  safetyPayIframe: FrameLocator;
  sandboxDemoBankPage: Page;
  bankLoginPopup: Page;
  iconShieldLock: Locator;
  private _bankPopupPromise: Promise<Page>;

  readonly sectionVoucherHeaderTitle: Locator;
  readonly sectionVoucherHeaderSubtitle: Locator;
  readonly sectionVoucherWaitingForConfirmation: Locator;
  readonly sectionVoucherDescription: Locator;
  readonly sectionVoucherReferenceTitle: Locator;
  readonly sectionVoucherInstructionsTitle: Locator;
  readonly sectionVoucherInstructionsFirst: Locator;
  readonly sectionVoucherInstructionsDisclaimer: Locator;
  readonly sectionVoucherHeaderPrice: Locator;
  readonly sectionVoucherCode: Locator;
  readonly sectionVoucherCopyCode: Locator;
  readonly sectionVoucherQrImage: Locator;
  readonly sectionVoucherCountdown: Locator;
  readonly linkQrCode: Locator;
  readonly declarativeApmQrImage: Locator;
  readonly animationPulsingDots: Locator;

  transactionCode?: string;
  totalAmount?: string;
  purchaseResponse: Promise<Response>;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.selectors = getTranslations('voucher', languageCode);

    this.voucherFrame = page.frameLocator('iframe.zoid-visible');
    this.iconShieldLock = page.locator('svg.lucide-shield-check');

    this.buttonCancel = this.voucherFrame.getByTestId('cancel-button');

    this.sectionVoucherHeader = this.voucherFrame
      .getByTestId('voucher-header')
      .or(this.voucherFrame.getByTestId('declarative-apm-post-purchase-header'));

    this.sectionVoucherHeaderTitle = this.voucherFrame
      .getByTestId('voucher-header-title')
      .or(this.voucherFrame.getByTestId('declarative-apm-header-title'));

    this.sectionVoucherHeaderSubtitle = this.voucherFrame.getByTestId('voucher-header-subtitle');
    this.sectionVoucherWaitingForConfirmation = this.voucherFrame.getByTestId(
      'waiting_for_confirmation'
    );
    this.sectionVoucherDescription = this.voucherFrame.getByTestId('voucher-description');
    this.sectionVoucherReferenceTitle = this.voucherFrame.getByTestId('voucher-reference-title');

    this.sectionVoucherInstructionsTitle = this.voucherFrame
      .getByTestId('instructions-title')
      .or(this.voucherFrame.getByTestId('declarative-apm-instructions-title'));

    this.sectionVoucherInstructionsFirst = this.voucherFrame
      .getByTestId('instruction-0')
      .or(this.voucherFrame.getByTestId('declarative-apm-instruction-0'));

    this.sectionVoucherInstructionsDisclaimer = this.voucherFrame
      .getByTestId('instructions-disclaimer')
      .or(this.voucherFrame.getByTestId('declarative-apm-instructions-disclaimer'));

    this.sectionVoucherBody = this.voucherFrame
      .getByTestId('voucher-body')
      .or(this.voucherFrame.getByTestId('declarative-apm-card-content'));

    this.sectionVoucherDueDate = this.voucherFrame
      .getByTestId('voucher-due-date')
      .or(this.voucherFrame.getByTestId('declarative-apm-expiration'));
    this.sectionVoucherFooter = this.voucherFrame
      .getByTestId('voucher-footer')
      .or(this.voucherFrame.getByTestId('declarative-apm-cta-buttons'));

    this.sectionVoucherCode = this.voucherFrame
      .getByTestId('reference_code')
      .or(this.voucherFrame.getByTestId('declarative-apm-reference-code'));

    this.sectionVoucherCopyCode = this.voucherFrame
      .getByTestId('copy_reference')
      .or(this.voucherFrame.getByTestId('declarative-apm-copy-reference'));

    this.alertSuccessNotification = this.voucherFrame.locator(
      '#voucher-alert-notification-positive'
    );
    this.labelAlertSuccessNotification = this.alertSuccessNotification.locator('h2').nth(1);

    this.sectionVoucherHeaderPrice = this.voucherFrame
      .getByTestId('voucher-header-price')
      .or(this.voucherFrame.getByTestId('declarative-apm-header-amount-value'));

    this.linkQrCode = this.voucherFrame
      .getByTestId('qr-code-link')
      .or(this.voucherFrame.getByTestId('declarative-apm-qr-image-link'));

    this.declarativeApmQrImage = this.voucherFrame.getByTestId('declarative-apm-qr-image');

    this.sectionVoucherQrImage = this.voucherFrame
      .getByTestId('qr-code')
      .or(this.voucherFrame.getByTestId('declarative-apm-qr-image'));

    this.sectionVoucherCountdown = this.voucherFrame
      .getByTestId('voucher-due-date')
      .or(this.voucherFrame.getByTestId('declarative-apm-expiration'));

    this.animationPulsingDots = this.voucherFrame.getByTestId('declarative-apm-pulsing-dots');
  }

  private getProcessorTitleLocator(processorId: string) {
    return this.voucherFrame.locator(`#processor_title_${processorId}`);
  }

  private getProcessorAccordionInput(processorId: string) {
    return this.voucherFrame.locator(`input[name="${processorId}"]`);
  }

  private getProcessorAccordionInputByTitle(processorId: string) {
    return this.voucherFrame.locator(`h3:has(#processor_title_${processorId}) input[type="radio"]`);
  }

  private getProcessorContentAccordion(processorId: string) {
    return this.voucherFrame.locator(`#voucher_processor_${processorId}`);
  }

  waitingPurchaseResponse(urlPattern = '**/transactions/purchase') {
    this.purchaseResponse = this.page.waitForResponse(urlPattern, { timeout: 60_000 });
  }

  async openProcessorAccordion(processorId: string) {
    const processor = this.getProcessorTitleLocator(processorId);
    await this.ensureVisibleToClick(processor);
  }

  async waitForSafetyPayIframe() {
    const iframeSelector = 'iframe[src*="sandbox-gateway.safetypay.com"]';

    await expect(this.voucherFrame.locator(iframeSelector)).toBeVisible({ timeout: 15_000 });
    this.safetyPayIframe = this.voucherFrame.frameLocator(iframeSelector);
  }

  async extractDataToCompleteTransaction() {
    this.transactionCode = await this.getDisplayedTransactionCode();
    this.totalAmount = await this.getDisplayedTotalAmount();
  }

  private async getDisplayedTransactionCode(): Promise<string> {
    const codeContainer = this.safetyPayIframe.locator('.TransactionCodes__content');
    await codeContainer.waitFor({ state: 'visible', timeout: 30_000 });

    const codeElement = codeContainer.locator('.text--business-code');
    const codeText = await codeElement.textContent({ timeout: 10_000 });

    return codeText?.trim() || '';
  }

  private async getDisplayedTotalAmount(): Promise<string> {
    const summaryContainer = this.safetyPayIframe.locator('.PaymentSummary');
    await summaryContainer.waitFor({ state: 'visible', timeout: 10_000 });

    const amountElement = summaryContainer.locator('[data-bind="text:TotalToPay.Value.Text"]');
    const amountText = await amountElement.textContent({ timeout: 10_000 });

    return (amountText || '').replace(/[^\d.]/g, '');
  }

  private async isTermsConditionsVisible() {
    return await this.safetyPayIframe
      .getByRole('button', { name: 'Cerrar esta nota informativa' })
      .isVisible({ timeout: 8_000 });
  }

  private async acceptTermsConditions() {
    await this.safetyPayIframe.locator('button.iubenda-cs-accept-btn').click();
  }

  getSafetyButtonPay() {
    return this.safetyPayIframe.locator(
      '.MainContent__getInformation .Button.boton_azul .Button__text',
      { hasText: 'Ir a Pagar' }
    );
  }

  async assertRedirectingAfterPaymentConfirmation() {
    const message = this.safetyPayIframe.locator('div.messages', {
      hasText:
        'Su pago fue confirmado, está siendo redirigido al comercio para completar su orden...',
    });

    await expect(message).toBeVisible({ timeout: 60_000 });
  }

  async assertRedirectToCommerceView() {
    const description = this.safetyPayIframe.locator('h1', {
      hasText: 'Procesando tu solicitud',
    });
    await expect(description).toBeVisible({ timeout: 60_000 });
  }

  async assertShieldLockIsVisible() {
    // The lucide shield-check icon lives inside an iframe on the Explorer thank-you page.
    // Exact nesting depth is unknown, so we search all frames that Playwright
    // has loaded rather than hard-coding the frame selector chain.
    await expect(async () => {
      const visible = await Promise.all(
        this.page.frames().map((frame) =>
          frame
            .locator('svg.lucide-shield-check')
            .isVisible({ timeout: 500 })
            .catch(() => false)
        )
      ).then((results) => results.some(Boolean));
      expect(visible, 'shield-check icon not visible in any frame').toBe(true);
    }).toPass({ timeout: 180_000, intervals: [2_000] });
  }

  async clickOnPayInSafetyPay() {
    // Register popup listener BEFORE the click so the event is never missed.
    this._bankPopupPromise = this.page.waitForEvent('popup', { timeout: 30_000 });

    if (await this.isTermsConditionsVisible()) {
      await this.acceptTermsConditions();
    }

    const buttonPay = this.getSafetyButtonPay();
    await this.ensureVisibleToClick(buttonPay.first());
  }

  async waitForExternalSafetyPayBankView() {
    this.bankLoginPopup = await this._bankPopupPromise;
    await expect(this.bankLoginPopup).toHaveTitle('Log in - Online Bank');
  }

  async openSandboxDemoBankSafetyPayPage(_context: BrowserContext) {
    // The popup already has the login page loaded with the correct TokenID session.
    // Opening a second page to the same URL reuses a single-use token and gets a
    // different response, so we operate on the existing popup directly.
    this.sandboxDemoBankPage = this.bankLoginPopup;
  }

  async loginSandboxDemoBankCredentials() {
    const inputUsername = this.sandboxDemoBankPage.locator('input#UserName');
    const passwordInput = this.sandboxDemoBankPage.locator('input#Password');
    const buttonLogin = this.sandboxDemoBankPage.locator('input[type="submit"][value="Log In"]');

    await this.fillAndVerifyValue(inputUsername, 'akalgi@deuna.com');
    await this.fillAndVerifyValue(passwordInput, '1234');
    await this.ensureVisibleToClick(buttonLogin);
  }

  async confirmTransaction() {
    const confirmButton = this.sandboxDemoBankPage.getByRole('button', { name: 'Confirm' });
    await this.ensureVisibleToClick(confirmButton);

    const messageSuccessfully = this.sandboxDemoBankPage.getByText('The operation was successful.');
    await expect(messageSuccessfully).toBeVisible({ timeout: 10_000 });
  }

  async closeSandboxDemoBankPage() {
    await this.sandboxDemoBankPage.close();
  }

  async closeBankLoginPopup() {
    if (!this.bankLoginPopup.isClosed()) {
      await this.bankLoginPopup.close();
    }
  }

  async clickOnCancelButton() {
    await this.ensureVisibleToClick(this.buttonCancel);
  }

  async assertTitleProcessors(processorIds: string[] = []) {
    for (const processorId of processorIds) {
      const processor = this.getProcessorTitleLocator(processorId);
      await this.ensureVisible(processor, { timeout: 25_000 });
    }
  }

  async assertProcessorAccordionOpen(processorId: string) {
    const input = this.getProcessorAccordionInputByTitle(processorId);
    await expect(input).toBeChecked({ timeout: 15_000 });
  }

  async assertProcessorContentVisible(processorId: VoucherProcessors) {
    const content = this.getProcessorContentAccordion(processorId);
    const translationKey = this.getTranslationKeyForProcessor(processorId);
    const processorScreen = this.selectors[translationKey];

    if (!processorScreen) {
      throw new Error(`No translations found for processor: ${processorId}`);
    }

    if (!('title' in processorScreen)) {
      throw new Error(`Invalid processor screen type for: ${processorId}`);
    }

    const { title, description, referenceTitle } = processorScreen;

    for (const text of [title, description, referenceTitle]) {
      if (text) {
        await this.ensureVisible(content.getByText(text, { exact: true }), { timeout: 15_000 });
      }
    }
  }

  async assertProcessorTitleIsHidden(processorId: string) {
    const processor = this.getProcessorTitleLocator(processorId);
    await expect(processor).not.toBeVisible({ timeout: 5000 });
  }

  async assertVoucherIsHidden() {
    await expect(this.sectionVoucherHeader).not.toBeVisible();
    await expect(this.sectionVoucherBody).not.toBeVisible();
    await expect(this.sectionVoucherDueDate).not.toBeVisible();
    await expect(this.sectionVoucherFooter).not.toBeVisible();
  }

  private getTranslationKeyForProcessor(processorId: VoucherProcessors): keyof VoucherTranslations {
    switch (processorId) {
      case VoucherProcessors.oxxoReference:
        return 'screenOxxoReferenceProcessor';
      case VoucherProcessors.bazReference:
        return 'screenBazReferenceProcessor';
      case VoucherProcessors.safetyPayExpress:
        return 'screenSafetyPayProcessor';
      default:
        throw new Error(`Unsupported processor translation for: ${processorId}`);
    }
  }

  async assertDeunaWalletHeaderPrice(price: string) {
    await expect(this.sectionVoucherHeaderPrice).toHaveText(price);
  }

  async assertDeunaWalletHeadings() {
    await expect(this.sectionVoucherHeader).toBeVisible();
    await expect(this.sectionVoucherBody).toBeVisible();
    await expect(this.sectionVoucherDueDate).toBeVisible();
    await expect(this.sectionVoucherFooter).toBeVisible();
  }

  async assertQrCodeIsVisible() {
    const qrImage = this.sectionVoucherQrImage;

    await expect(qrImage).toBeVisible({ timeout: 25_000 });

    const src = await qrImage.getAttribute('src');
    expect(src).toMatch(/^data:image\/(png|jpg|jpeg);base64,/);

    const isLoaded = await qrImage.evaluate((img) => {
      const image = img as HTMLImageElement;
      return image.complete && image.naturalWidth > 0;
    });
    expect(isLoaded).toBeTruthy();
  }

  async assertQrCodeBehaviourIsExpected() {
    await this.assertQrCodeIsVisible();

    await this.ensureVisibleToClick(this.linkQrCode);

    const href = await this.linkQrCode.getAttribute('href');

    expect(href).toBeTruthy();
    expect(href).toMatch(/^https:\/\/pagar\.deuna\.app\/[A-Za-z0-9]+\/merchant\?id=[A-Za-z0-9]+$/);
  }

  async assertPaymentCodeIsVisible(code?: string) {
    await expect(this.sectionVoucherCode).toBeVisible({ timeout: 25_000 });

    const codeText = await this.sectionVoucherCode.textContent();
    expect(codeText).toBeTruthy();
    const trimmedCode = codeText.split(' ').join('');
    if (code !== undefined) {
      expect(trimmedCode).toBe(code);
    }
  }

  async assertPaymentCodeBehaviourIsExpected(expectedCode?: string) {
    await expect(this.sectionVoucherCopyCode).toBeVisible();
    await this.sectionVoucherCopyCode.click();

    const clipboardValue = await this.page.evaluate(async () => navigator.clipboard.readText());

    if (expectedCode !== undefined) {
      expect(clipboardValue.trim()).toBe(expectedCode.trim());
    } else {
      expect(clipboardValue.trim()).toBeTruthy();
    }
  }

  async assertVoucherInstructionsBehaviourIsExpected() {
    await this.ensureVisibleToClick(this.sectionVoucherInstructionsTitle);
    await expect(this.sectionVoucherInstructionsFirst).toBeVisible();

    await this.ensureVisibleToClick(this.sectionVoucherInstructionsTitle);
    await expect(this.sectionVoucherInstructionsDisclaimer).toBeHidden();
  }

  async assertSuccessAlertNotification(text: string) {
    await expect(this.labelAlertSuccessNotification).toHaveText(text);
  }

  async assertDeclarativeApmQrImageIsVisible(timeout = 20_000) {
    await expect(this.declarativeApmQrImage).toBeVisible({ timeout });
  }

  getVisualMaskLocators(format: 'qr' | 'code'): Locator[] {
    if (format === 'qr') {
      return [this.sectionVoucherQrImage, this.sectionVoucherCountdown, this.animationPulsingDots];
    }
    return [this.sectionVoucherCode, this.sectionVoucherCountdown, this.animationPulsingDots];
  }
}
