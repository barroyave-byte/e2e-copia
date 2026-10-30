import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { FormHelpers, InterceptorRequest } from './formHelpers';
import { getTranslations } from '@translations/getTranslations';
import { BaseUserData } from '@support/interfaces/user_data';
import { PayUPseTranslations } from '@support/translations/selectors/explore/payupse/payupseTranslations';

interface BaseformData extends BaseUserData {
  bankName?: string;
}

export class PayuPseFormPage extends FormHelpers {
  readonly page: Page;
  readonly selectors: PayUPseTranslations;
  readonly inputPhoneNumber: Locator;
  readonly labelPhoneVerification: Locator;
  readonly buttonGoToSiteButton: Locator;
  readonly labelNaturalPersonOption: Locator;
  readonly dropdownFinancialInstitutions: Locator;
  readonly inputUserDocument: Locator;
  readonly inputHolderName: Locator;
  readonly inputPhoneNum: Locator;
  readonly dropdownPersonType: Locator;
  readonly inputPhoneCountryCodeBySelect: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectors = getTranslations('explore/payupse', languageCode);
    this.buttonGoToSiteButton = page.getByTestId('go_to_site-button');
    this.labelNaturalPersonOption = this.page.locator(
      `text="${this.selectors.screenPseFormPage.labelNaturalPersonOption}"`
    );
    this.inputPhoneNumber = page.locator('input[id="pse-phone-value-input"]');
    this.dropdownFinancialInstitutions = page.locator(
      'div[data-testid="dropdown-input-financialInstitution"]'
    );
    this.dropdownPersonType = page.locator('div[data-testid="dropdown-input-personType"]');
    this.inputUserDocument = page
      .locator('input[id="userDocumentId-input"]')
      .or(page.locator('[data-testid="userDocumentId-value-input"]')); // migration-or
    this.inputHolderName = page.locator('input[id="holderName"]');
    this.inputPhoneNum = page
      .locator('input[id="pse-phone-value-input"]')
      .or(page.locator('[data-testid="pse-phone-value-input"]')); // migration-or
    this.inputPhoneCountryCodeBySelect = page
      .locator('[data-baseweb="phone-input"] [data-baseweb="select"]')
      .or(page.locator('[data-testid="dropdown-input-pse-phone"]'));
  }

  async selectFinancialInstitution(bankName) {
    await this.iframeLocator(this.dropdownFinancialInstitutions).click();
    await this.iframeLocator(this.page.locator(`text="${bankName}"`)).click();
  }

  async interceptPollingResponse(interceptorRequest: InterceptorRequest, orderToken: string) {
    await this.page.route(`**/orders/${orderToken}`, async (route) => {
      await route.fulfill({
        status: interceptorRequest.status,
        contentType: 'application/json',
        body: JSON.stringify(interceptorRequest.body),
      });
    });
  }

  async selectPersonType() {
    await this.iframeLocator(this.dropdownPersonType).click();
    await this.iframeLocator(this.labelNaturalPersonOption).click();
  }

  async fillUserDocument(document) {
    await this.iframeLocator(this.inputUserDocument).fill(document);
  }

  async fillHolderName(holderName) {
    await this.iframeLocator(this.inputHolderName).fill(holderName);
  }

  async fillPhoneNumber(phone) {
    await this.iframeLocator(this.inputPhoneNum).fill(phone);
  }

  async fillPsePayuForm(formData: BaseformData) {
    await this.selectFinancialInstitution(formData.bankName);
    await this.fillUserDocument(formData.dni);
    await this.selectPersonType();
    await this.fillHolderName(formData.name);
    if (formData.country) {
      // This is necessary because of how the component library we use works; a fix will be implemented in the future.
      await this.iframeLocator(this.inputPhoneCountryCodeBySelect).click({ timeout: 15000 });
      // V2 renders the compound label "Mexico (México)"; V3 renders only the
      // native name "México" (Intl.DisplayNames, resolved against the
      // checkout's own locale now that PhoneInput.tsx forwards `lang` from
      // useLocalize() as the `locale` prop — modular-checkout fix). Match
      // on the native name (inside parens, if present) so the same test
      // data works on both.
      const nativeNameMatch = formData.country.match(/\(([^)]+)\)/);
      const countryOptionText = nativeNameMatch ? nativeNameMatch[1] : formData.country;
      const optionElement = this.iframeLocator(
        this.page.getByRole('option').filter({ hasText: countryOptionText })
      );
      const isVisible = await optionElement.isVisible().catch(() => false);
      if (!isVisible) {
        await this.inputPhoneCountryCodeBySelect.click({ timeout: 15000 });
      }
      await optionElement.click({ timeout: 5000 });
    }
    await this.fillPhoneNumber(formData.phone);
  }

  async assertPhoneNumberToBeVisible() {
    await expect(this.iframeLocator(this.inputPhoneNumber)).toBeVisible();
  }

  async clickGoToSiteButton() {
    await this.ensureVisibleToClick(
      this.iframeLocator(this.buttonGoToSiteButton),
      undefined,
      undefined,
      { timeout: 40000 }
    );
  }

  async waitForGoToSiteButtonToBeVisible() {
    await this.iframePaymentWidget.locator(this.buttonGoToSiteButton).waitFor({ state: 'visible' });
  }

  async restoreWindowOpen() {
    // Restore window.open in ALL frames (main page + iframes)
    const frames = this.page.frames();

    for (const frame of frames) {
      try {
        await frame.evaluate(() => {
          if ((window as any).__originalOpen) {
            window.open = (window as any).__originalOpen;
            delete (window as any).__originalOpen;
          }
        });
      } catch (e) {
        // Some frames might be cross-origin or not accessible, ignore
      }
    }
  }
}
