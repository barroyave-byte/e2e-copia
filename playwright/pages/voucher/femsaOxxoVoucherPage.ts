import { FrameLocator, Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { getTranslations } from '@support/translations/getTranslations';
import { VoucherTranslations } from '@support/translations/selectors/voucher/voucherTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';

const voucherTranslations: VoucherTranslations = getTranslations('voucher', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

export class FemsaOxxoCashVoucherPage extends CommonsActions {
  readonly page: Page;

  readonly iframeZoidVisible: FrameLocator;

  readonly labelFemsaOxxoCashVoucherTitle: Locator;
  readonly labelFemsaOxxoCashVoucherDescription: Locator;
  readonly labelFemsaOxxoCashVoucherReferenceTitle: Locator;
  readonly containerFemsaOxxoCashVoucherDueDate: Locator;
  readonly containerFemsaOxxoCashVoucherAdditionalInfo: Locator;
  readonly labelFemsaOxxoCashVoucherAdditionalInfoDisclaimer: Locator;
  readonly buttonOrderSummary: Locator;

  readonly containerOrderSummaryTitle: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    this.labelFemsaOxxoCashVoucherTitle =
      this.iframeZoidVisible.getByText(voucherTranslations.screenFemsaOxxoCash.title);
    this.labelFemsaOxxoCashVoucherDescription =
      this.iframeZoidVisible.getByText(voucherTranslations.screenFemsaOxxoCash.description);
    this.labelFemsaOxxoCashVoucherReferenceTitle =
      this.iframeZoidVisible.getByText(voucherTranslations.screenFemsaOxxoCash.referenceTitle);
    this.containerFemsaOxxoCashVoucherDueDate =
      this.iframeZoidVisible.getByTestId('voucher-due-date');
    this.containerFemsaOxxoCashVoucherAdditionalInfo =
      this.iframeZoidVisible.getByTestId('voucher-additional-information');
    this.labelFemsaOxxoCashVoucherAdditionalInfoDisclaimer =
      this.iframeZoidVisible.getByText(voucherTranslations.screenFemsaOxxoCash.additionalInfoDisclaimer);
    this.buttonOrderSummary = this.iframeZoidVisible.getByTestId('see_order_summary-button');

    this.containerOrderSummaryTitle = this.page.locator('#successful_order_text');
  }

  // Assertions
  async assertFemsaOxxoCashVoucher() {
    await this.ensureVisible(this.labelFemsaOxxoCashVoucherTitle, {});
    await this.ensureVisible(this.labelFemsaOxxoCashVoucherDescription, {});
    await this.ensureVisible(this.labelFemsaOxxoCashVoucherReferenceTitle, {});
  }

  async assertFemsaOxxoCashVoucherDueDate() {
    await this.ensureVisible(this.containerFemsaOxxoCashVoucherDueDate, {});
  }

  async assertFemsaOxxoCashVoucherAdditionalInfo() {
    await this.ensureVisibleToClick(this.containerFemsaOxxoCashVoucherAdditionalInfo);
    await this.ensureVisible(this.labelFemsaOxxoCashVoucherAdditionalInfoDisclaimer, {});
  }

  async assertFemsaOxxoCashVoucherOrderSummary() {
    await this.ensureVisibleToClick(this.buttonOrderSummary);
    const pendingSummaryText = this.containerOrderSummaryTitle.getByText(
      deunanowTranslations.screenOrderSummaryDeunaNow.labelPendingPayment
    );
    await this.ensureVisible(pendingSummaryText, {});
  }
}
