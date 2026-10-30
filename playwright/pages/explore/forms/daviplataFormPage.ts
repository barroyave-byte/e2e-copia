import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { FormHelpers } from './formHelpers';
import { DaviplataTranslations } from '@support/translations/selectors/explore/daviplata/daviplataTranslations';

export class DaviplataFormPage extends FormHelpers {
  page: Page;
  selectors: DaviplataTranslations;
  inputDocumentNumber: Locator;
  identityDropdown: Locator;
  identityInput: Locator;
  labelOtpCodeSent: Locator;
  inputOtpCode: Locator;
  buttonResendOtpCode: Locator;
  inputPhoneNumber: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.selectors = getTranslations('explore/daviplata', languageCode);

    this.inputDocumentNumber = page
      .locator('input[id="userDocumentId-input"]')
      .or(page.locator('[data-testid="userDocumentId-value-input"]')); // migration-or
    this.identityDropdown = page
      .getByTestId('userDocumentId-dropdown-button')
      .or(page.getByTestId('dropdown-input-userDocumentId')); // migration-or
    this.identityInput = page
      .getByTestId('userDocumentId-input')
      .or(page.getByTestId('userDocumentId-value-input')); // migration-or
    this.labelOtpCodeSent = page.locator(
      `text="${this.getDaviplataProcessorSelector('labelOtpCodeSent')}"`
    );
    this.inputOtpCode = page.locator("input[id='otp-input-0']");
    this.buttonResendOtpCode = page.locator('text="Reenviar código"');
  }

  private getDaviplataProcessorSelector(property: string) {
    return this.selectors.screenDaviplataProcessor[property];
  }

  fillDocumentNumber = async (number: string = '11111111') => {
    await this.fillAndVerifyValue(this.iframeLocator(this.inputDocumentNumber), number);
  };

  async resendOtpCode() {
    this.waitingPurchaseResponse();
    await this.ensureVisibleToClick(this.iframeLocator(this.buttonResendOtpCode));
  }

  async enterOtpCode(codeOTP: string = '010101') {
    await this.iframeLocator(this.inputOtpCode).fill(codeOTP);
  }

  assertDocumentNumberToBeVisible = () => {
    expect(this.iframeLocator(this.inputDocumentNumber)).toBeVisible();
  };

  assertDocumentNumbertoBeHidden = () => {
    expect(this.iframeLocator(this.inputDocumentNumber)).toBeHidden();
  };

  assertOtpCodeSentToBeVisible() {
    expect(this.iframeLocator(this.labelOtpCodeSent)).toBeVisible();
  }
}
