import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import * as userData from '@support/interfaces/user_data';
import { getTranslations } from '@translations/getTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';

export class GuestUserDataPage {
  readonly page: Page;
  readonly iframeZoidVisible: FrameLocator;
  readonly inputName: Locator;
  readonly inputAddress: Locator;
  readonly inputLastName: Locator;
  readonly inputPhone: Locator;
  readonly inputDocumentIdentity: Locator;
  readonly buttonContinue: Locator;
  readonly buttonEdit: Locator;
  readonly buttonSave: Locator;
  readonly labelTitleScreenUserData: Locator;
  readonly labelDivErrorInput: Locator;
  responsePromiseRegister: any;
  readonly labelEnterEmailToBeginProcess: Locator;
  readonly labelGenericErrorMessage: Locator;
  readonly nameAbsenceErrorText: Locator;
  readonly lastNameAbsenceErrorText: Locator;
  readonly phoneAbsenceErrorText: Locator;
  readonly idDocumentAbsenceErrorText: Locator;
  readonly selectors: CheckoutTranslations;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('checkout', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    // Localizadores asociados al iframe
    this.inputName = this.iframeZoidVisible.locator("input[id='userinfo-first-name']");
    this.inputLastName = this.iframeZoidVisible.locator("input[id='userinfo-last-name']");
    this.inputPhone = this.iframeZoidVisible.locator("input[inputmode='tel']");
    this.inputDocumentIdentity = this.iframeZoidVisible.locator(
      "input[id='userinfo-identity-document']"
    );

    //TODO: find a better way to locate this element by adding a data-testid
    this.inputAddress = this.iframeZoidVisible.locator(
      "input[placeholder='Ej: Colima 145, Cuauhtémoc']"
    );
    this.buttonContinue = this.iframeZoidVisible.locator('button:has-text("Continuar")');
    this.buttonEdit = this.iframeZoidVisible.locator('button:has-text("Cambiar")');
    this.buttonSave = this.iframeZoidVisible.locator('button:has-text("Guardar")');
    this.labelTitleScreenUserData = this.iframeZoidVisible.getByText('¿Quién solicita la orden?');
    this.labelDivErrorInput = this.iframeZoidVisible.locator(
      '[data-baseweb="form-control-caption"]'
    );

    // Mensajes de error asociados al iframe
    this.labelGenericErrorMessage = this.iframeZoidVisible.getByText(
      this.selectors.userFormSelectors.genericErrorText
    );
    this.nameAbsenceErrorText = this.iframeZoidVisible.getByText(
      this.selectors.userFormSelectors.nameAbsenceErrorText
    );
    this.lastNameAbsenceErrorText = this.iframeZoidVisible.getByText(
      this.selectors.userFormSelectors.lastNameAbsenceErrorText
    );
    this.phoneAbsenceErrorText = this.iframeZoidVisible.getByText(
      this.selectors.userFormSelectors.phoneAbsenceErrorText
    );
    this.idDocumentAbsenceErrorText = this.iframeZoidVisible.getByText(
      this.selectors.userFormSelectors.idDocumentAbsenceErrorText
    );
  }

  // Métodos refactorizados
  async enterGuestUserData(userData: userData.BaseUserData) {
    await this.inputName.fill(userData.name);
    await this.inputLastName.fill(userData.last_name);
    await this.inputPhone.fill(userData.phone);
    await this.inputPhone.click();
    await this.page.keyboard.press('Tab');
    await this.inputDocumentIdentity.fill(userData.dni);
    await this.page.keyboard.press('Tab');
  }

  async enterIdentityDocument(document: string) {
    await this.inputDocumentIdentity.press('Control+A');
    await this.inputDocumentIdentity.press('Backspace');
    await this.inputDocumentIdentity.fill(document);
  }

  async clickOnContinue() {
    this.responsePromiseRegister = this.page.waitForResponse('**/register', { timeout: 50000 });
    await this.buttonContinue.click();
    await this.responsePromiseRegister;
  }

  async clickOnContinueInIncompleteDataPage() {
    await this.buttonContinue.click();
  }

  async enterGuestUserDataAndContinue(userData: userData.BaseUserData) {
    await this.enterGuestUserData(userData);
    await this.clickOnContinue();
  }

  async clickOnEdit() {
    await this.assertButtonEditIsVisible();
    await this.buttonEdit.click();
  }

  async clickOnSave() {
    await this.assertButtonSaveIsVisible();
    await this.buttonSave.click();
  }

  async editPhoneGuestUserDataAndSave() {
    await this.inputPhone.fill('5512545679');
    await this.inputPhone.click();
    await this.clickOnSave();
  }

  async enterDocumentId(userData: userData.BaseUserData) {
    await expect(this.inputPhone)
      .toBeVisible()
      .then(() => this.inputPhone.fill(userData.phone));
    await this.inputPhone.click();
    await this.page.keyboard.press('Tab');
    await this.inputDocumentIdentity.fill(userData.dni);
    await this.page.keyboard.press('Tab');
  }

  async assertErrorMessagesText() {
    await expect(this.nameAbsenceErrorText).toBeVisible();
    await expect(this.lastNameAbsenceErrorText).toBeVisible();
    await expect(this.phoneAbsenceErrorText).toBeVisible();
    await expect(this.idDocumentAbsenceErrorText).toBeVisible();
  }

  async assertGuestUserScreenIsVisible() {
    await expect(this.labelTitleScreenUserData).toBeVisible();
    await expect(this.inputName).toBeVisible();
    await expect(this.inputLastName).toBeVisible();
    await expect(this.inputPhone).toBeVisible();
    await expect(this.inputDocumentIdentity).toBeVisible();
  }

  async assertErrorMessagesAnsVisibleInInputs() {
    await expect(this.labelDivErrorInput).toHaveCount(4);
    await this.assertErrorMessagesText();
  }

  async assertGenericErrorMessage() {
    await expect(this.labelGenericErrorMessage).toBeVisible();
  }

  async assertUserIsReallyRegistered() {
    const response = await this.responsePromiseRegister;
    const responseJson = await response.json();
    expect(responseJson.user_id).toBeDefined();
  }

  async assertButtonContinueIsVisible() {
    await expect(this.buttonContinue).toBeVisible();
  }

  async assertButtonSaveIsVisible() {
    await expect(this.buttonSave).toBeVisible();
  }

  async assertButtonEditIsVisible() {
    await expect(this.buttonEdit).toBeVisible();
  }

  async assertAddressInputIsVisible() {
    await expect(this.inputAddress).toBeVisible();
  }
}
