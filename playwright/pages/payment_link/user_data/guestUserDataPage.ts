import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import * as userData from '@support/interfaces/user_data';
import { getTranslations } from '@translations/getTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { CommonsActions } from '@pages/commonActions';

export class GuestUserDataPage extends CommonsActions {
  readonly page: Page;
  readonly inputEmail: Locator;
  readonly inputName: Locator;
  readonly inputLastName: Locator;
  readonly inputPhone: Locator;
  readonly inputPhoneCountryCode: Locator;
  readonly inputPhoneCountryCodeBySelect: Locator;
  readonly inputDocumentIdentity: Locator;
  readonly buttonContinue: Locator;
  readonly labelTitleScreenUserData: Locator;
  readonly labelDivErrorInput: Locator;
  responsePromiseRegister: any;
  readonly labelEnterEmailToBeginProcess: Locator;
  readonly labelGenericErrorMessage: Locator;
  readonly nameAbsenceErrorText: Locator;
  readonly lastNameAbsenceErrorText: Locator;
  readonly phoneAbsenceErrorText: Locator;
  readonly idDocumentAbsenceErrorText: Locator;
  readonly nameAbsenceErrorTextBr: Locator;
  readonly lastNameAbsenceErrorTextBr: Locator;
  readonly phoneAbsenceErrorTextBr: Locator;
  readonly idDocumentAbsenceErrorTextBr: Locator;
  readonly selectors: CheckoutTranslations;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('checkout', languageCode);
    this.inputEmail = page.locator("input[id='user-email']");
    this.inputName = page.locator("input[id='userinfo-first-name']");
    this.inputLastName = page.locator("input[id='userinfo-last-name']");
    this.inputPhone = page.locator("input[inputmode='tel']");
    this.inputPhoneCountryCode = page.getByText('US');
    this.inputPhoneCountryCodeBySelect = page
      .locator('[data-baseweb="phone-input"] [data-baseweb="select"]')
      .or(page.locator('[data-testid="dropdown-input-userinfo-phone"]'));
    this.inputDocumentIdentity = page.locator("input[id='userinfo-identity-document']");
    this.buttonContinue = page.locator('button:has-text("Continuar")');
    this.labelTitleScreenUserData = page.getByText('¿Quién solicita la orden?');
    this.labelDivErrorInput = page.locator('[data-baseweb="form-control-caption"]');
    //error messages
    this.labelGenericErrorMessage = page.getByText(
      this.selectors.userFormSelectors.genericErrorText
    );
    this.nameAbsenceErrorText = page.getByText(
      this.selectors.userFormSelectors.nameAbsenceErrorText
    );
    this.lastNameAbsenceErrorText = page.getByText(
      this.selectors.userFormSelectors.lastNameAbsenceErrorText
    );
    this.phoneAbsenceErrorText = page.getByText(
      this.selectors.userFormSelectors.phoneAbsenceErrorText
    );
    this.idDocumentAbsenceErrorText = page.getByText(
      this.selectors.userFormSelectors.idDocumentAbsenceErrorText
    );
  }

  async enterGuestUserData(userData: userData.BaseUserData) {
    await this.inputName.fill(userData.name, { timeout: 15000 });
    await this.inputLastName.fill(userData.last_name, { timeout: 15000 });
    await this.inputPhone.clear();
    await this.inputPhone.fill(userData.phone, { timeout: 15000 });
    await this.inputPhone.click({ timeout: 15000 });

    if (userData.country) {
      // This is necessary because of how the component library we use works; a fix will be implemented in the future.
      await this.inputPhoneCountryCodeBySelect.click({ timeout: 15000 });
      // V2 renders the compound label "Mexico (México)"; V3 renders only the
      // native name "México" (Intl.DisplayNames, resolved against the
      // checkout's own locale now that PhoneInput.tsx forwards `lang` from
      // useLocalize() as the `locale` prop — modular-checkout fix). Match
      // on the native name (inside parens, if present) so the same test
      // data works on both.
      const nativeNameMatch = userData.country.match(/\(([^)]+)\)/);
      const countryOptionText = nativeNameMatch ? nativeNameMatch[1] : userData.country;
      const optionElement = this.page.getByRole('option').filter({ hasText: countryOptionText });
      const isVisible = await optionElement.isVisible().catch(() => false);
      if (!isVisible) {
        await this.inputPhoneCountryCodeBySelect.click({ timeout: 15000 });
      }
      await optionElement.click({ timeout: 5000 });
    }
    await this.page.keyboard.press('Tab');
  }

  async enterGuestUserDataWithDelay(userData: userData.BaseUserData) {
    await this.pressTextOnInput(this.inputName, userData.name, { delayPress: 100 });
    await this.pressTextOnInput(this.inputLastName, userData.last_name, { delayPress: 100 });
    await this.pressTextOnInput(this.inputPhone, userData.phone, { delayPress: 100 });
  }

  async enterGuestUserDataAndContinue(userData: userData.BaseUserData) {
    await this.enterGuestUserData(userData);
  }

  async enterDocumentId(userData: userData.BaseUserData) {
    await this.inputDocumentIdentity.fill(userData.dni);
    await this.page.keyboard.press('Tab');
  }

  async assertErrorMessagesText() {
    await expect(this.nameAbsenceErrorText).toBeVisible();
    await expect(this.lastNameAbsenceErrorText).toBeVisible();
    await expect(this.phoneAbsenceErrorText).toBeVisible();
    await expect(this.idDocumentAbsenceErrorText).toBeVisible();
  }

  async assertGenericErrorMessage() {
    await expect(this.labelGenericErrorMessage).toBeVisible();
  }
  //Assertions

  async assertGuestUserScreenIsVisible() {
    expect(this.labelTitleScreenUserData.isVisible());
    expect(this.inputName.isVisible());
    expect(this.inputLastName.isVisible());
    expect(this.inputPhone.isVisible());
    expect(this.inputDocumentIdentity.isVisible());
  }

  async assertErrorMessagesAnsVisibleInInputs() {
    await expect(this.labelDivErrorInput).toHaveCount(4);
    await this.assertErrorMessagesText();
  }

  async assertUserIsReallyRegistered() {
    const response = await this.responsePromiseRegister;
    const responseJson = await response.json();
    expect(responseJson.user_id).toHaveValue;
  }

  async assertEssentialUserInfo(email: string, firstName: string, lastName: string, phone: string) {
    await expect(this.inputEmail).toHaveValue(email);
    await expect(this.inputName).toHaveValue(firstName);
    await expect(this.inputLastName).toHaveValue(lastName);

    // Some locales render the phone with formatting chars (e.g. BR: "(19)99754-7531"),
    // so compare digits only rather than the raw formatted value.
    const phoneNumber = (await this.inputPhone.inputValue()).replace(/\D/g, '');
    const expectedPhone = phone.replace(/\D/g, '');
    expect(phoneNumber).toContain(expectedPhone);
  }
}
