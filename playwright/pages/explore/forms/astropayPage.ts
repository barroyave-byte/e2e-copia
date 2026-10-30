import { CommonsActions } from '@pages/commonActions';
import { Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { AstropayTranslations } from '@support/translations/selectors/explore/astropay/astropayTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { FormHelpers } from './formHelpers';

export class AstropayPage extends FormHelpers {
  page: Page;
  readonly checkoutSelectors: CheckoutTranslations;
  readonly selectors: AstropayTranslations;

  readonly labelProcessingPayment: Locator;
  readonly buttonBack: Locator;
  readonly labelSummary: Locator;
  readonly labelSummarySubtitle: Locator;
  readonly buttonAstropay: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.checkoutSelectors = getTranslations('checkout', languageCode);
    this.selectors = getTranslations('explore/astropay', languageCode);

    this.labelProcessingPayment = page.getByText(
      this.checkoutSelectors.apmRedirectView.labelProcessingPayment
    );

    const s = this.selectors.screenAstropayCheckout;

    this.buttonBack = page.getByText(s.buttonBack);
    this.labelSummary = page.getByText(s.labelSummary, { exact: true });
    this.labelSummarySubtitle = page.getByText(s.labelSummarySubtitle);
    this.buttonAstropay = page.getByRole('button').filter({ hasText: s.buttonAstropay });
  }

  async assertLabelProcessingPaymentVisible() {
    await this.ensureVisible(this.iframeLocator(this.labelProcessingPayment), { timeout: 40_000 });
  }

  async clickOnAstropay() {
    await this.ensureVisibleToClick(this.buttonAstropay);
  }

  async assertCheckoutVisible() {
    await this.ensureVisible(this.labelSummary, { timeout: 20_000 });
    await this.ensureVisible(this.buttonAstropay, { timeout: 20_000 });
  }
}
