import { expect, FrameLocator, Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';

export class BizumPushVoucherPage extends CommonsActions {
  readonly page: Page;

  readonly iframeZoidVisible: FrameLocator;

  readonly containerBizumVoucherQrCode: Locator;
  readonly containerBizumVoucherCountdown: Locator;

  readonly labelBizumVoucherTitle: Locator;
  readonly labelBizumVoucherDescription: Locator;
  readonly labelBizumWaitingConfirmationTitle: Locator;
  readonly labelBizumVoucherReferenceTitle: Locator;
  readonly labelBizumVoucherCountdown: Locator;
  readonly labelBizumVoucherCancelConfirmationTitle: Locator;
  readonly labelBizumVoucherCancelConfirmationDescription: Locator;
  readonly labelBizumVoucherExpirationText: Locator;

  readonly labelBizumVoucherAmount: Locator;
  readonly animationPulsingDots: Locator;

  readonly buttonCopyReference: Locator;
  readonly buttonDownloadReference: Locator;
  readonly buttonCancel: Locator;
  readonly buttonCancelConfirmation: Locator;

  private readonly containerPostPurchaseCard: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    this.containerPostPurchaseCard = this.iframeZoidVisible
      .getByTestId('declarative-apm-card-content')
      .or(this.iframeZoidVisible.getByTestId('voucher-body'));

    this.containerBizumVoucherQrCode = this.iframeZoidVisible
      .getByTestId('declarative-apm-qr-image')
      .or(this.iframeZoidVisible.getByTestId('voucher-qr-code-section'));

    this.containerBizumVoucherCountdown = this.iframeZoidVisible
      .getByTestId('declarative-apm-expiration')
      .or(this.iframeZoidVisible.getByTestId('voucher-countdown'));

    this.labelBizumVoucherTitle = this.iframeZoidVisible
      .getByTestId('declarative-apm-header-title')
      .or(this.iframeZoidVisible.getByText(/esperando confirmación|waiting confirmation/i));

    this.labelBizumVoucherDescription = this.iframeZoidVisible
      .getByTestId('declarative-apm-post-purchase-header')
      .or(this.iframeZoidVisible.getByText(/confirma el pago|confirm payment/i));

    this.labelBizumWaitingConfirmationTitle = this.iframeZoidVisible
      .getByTestId('declarative-apm-header-title')
      .or(this.iframeZoidVisible.getByText(/esperando confirmación|waiting confirmation/i));

    this.labelBizumVoucherReferenceTitle = this.iframeZoidVisible
      .getByTestId('declarative-apm-reference-code')
      .or(this.iframeZoidVisible.getByText(/referencia|reference/i));

    this.labelBizumVoucherCountdown = this.iframeZoidVisible
      .getByTestId('declarative-apm-expiration')
      .or(this.iframeZoidVisible.getByTestId('voucher-countdown-active-text'));

    this.labelBizumVoucherAmount = this.iframeZoidVisible.getByTestId(
      'declarative-apm-header-amount-value'
    );

    this.animationPulsingDots = this.iframeZoidVisible.getByTestId('declarative-apm-pulsing-dots');

    this.labelBizumVoucherCancelConfirmationTitle = this.iframeZoidVisible.getByText(
      /cancelar pago|cancel payment/i
    );
    this.labelBizumVoucherCancelConfirmationDescription = this.iframeZoidVisible.getByText(
      /¿estás seguro|are you sure/i
    );
    this.labelBizumVoucherExpirationText = this.iframeZoidVisible.getByText(/expirado|expired/i);

    this.buttonCopyReference = this.iframeZoidVisible
      .getByTestId('declarative-apm-copy-reference')
      .or(this.iframeZoidVisible.getByTestId('content_copy'));
    this.buttonDownloadReference = this.iframeZoidVisible.getByTestId('download_reference-button');
    this.buttonCancel = this.iframeZoidVisible
      .getByTestId('cancel-button')
      .or(this.iframeZoidVisible.getByTestId('declarative-apm-cta-buttons'));
    this.buttonCancelConfirmation = this.iframeZoidVisible.getByRole('button', {
      name: /confirmar|confirm/i,
    });
  }

  // Actions
  async clickOnCopyReference() {
    await this.ensureVisibleToClick(this.buttonCopyReference);
  }

  async clickOnCancel() {
    await this.ensureVisibleToClick(this.buttonCancel);
    await this.ensureVisible(this.labelBizumVoucherCancelConfirmationTitle, {});
    await this.ensureVisible(this.labelBizumVoucherCancelConfirmationDescription, {});
    await this.ensureVisibleToClick(this.buttonCancelConfirmation);
  }

  // Assertions
  async assertBizumVoucher() {
    await this.containerPostPurchaseCard.waitFor({ state: 'visible', timeout: 30000 });
    await this.ensureVisible(this.labelBizumVoucherTitle, {});
    await this.ensureVisible(this.containerBizumVoucherCountdown, {});
  }

  async assertBizumVoucherCountdown() {
    await this.ensureVisible(this.labelBizumVoucherCountdown, {});
  }

  async assertDownloadReferenceButton() {
    await this.ensureVisibleToClick(this.buttonDownloadReference);
    expect(this.buttonDownloadReference).toBeHidden();
  }

  async assertBizumVoucherExpirationText() {
    await this.ensureVisible(this.labelBizumVoucherExpirationText, { timeout: 120000 });
  }

  getVisualMaskLocators(): Locator[] {
    return [
      this.containerBizumVoucherCountdown,
      this.containerBizumVoucherQrCode,
      this.labelBizumVoucherReferenceTitle,
      this.animationPulsingDots,
    ];
  }
}
