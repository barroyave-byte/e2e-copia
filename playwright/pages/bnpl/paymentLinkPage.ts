import { expect, Locator, Page, FrameLocator } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { PaymentLinkTranslations } from '@support/translations/selectors/payment_link/paymentLinkTranslations';

interface BillingData {
  firstName?: string;
  lastName?: string;
  identityDocument?: string;
  address1?: string;
  address2?: string;
  additionalDescription?: string;
  zipCode?: string;
  state?: string;
  city?: string;
}

export class PaymentLinkRedirectPage extends CommonsActions {
  readonly page: Page;

  readonly billingCheckbox: Locator;
  readonly billingTitle: Locator;
  readonly mainViewBillingTitle: Locator;
  readonly billingAddButtonData: Locator;
  readonly buttonAddBillingData: Locator;
  readonly mainViewCardTitle: Locator;
  readonly mainViewOrderDetailsTitle: Locator;
  readonly billingFormPhoneInput: Locator;
  readonly inputBillingFormName: Locator;
  readonly inputBillingFormLastName: Locator;
  readonly inputBillingFormIdentityDocument: Locator;
  readonly inputBillingFormAddress1: Locator;
  readonly inputBillingFormAddress2: Locator;
  readonly inputBillingFormAdditionalDescription: Locator;
  readonly inputBillingFormZipCodet: Locator;
  readonly inputBillingFormStateName: Locator;
  readonly optionBillingFormStateName: Locator;
  readonly billingFormSaveButton: Locator;
  readonly billingCardRFCLabel: Locator;
  readonly selectorsPaymenlink: PaymentLinkTranslations;
  readonly iframeZoidVisible: FrameLocator;
  readonly showBillingBtn: Locator;
  readonly buttonShowUpdateBillingData: Locator;
  readonly billingFormStateCity: Locator;
  readonly optionBillingFormCity: Locator;
  readonly dropdownCountry: Locator;
  readonly optionCountry: Locator;

  // Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectorsPaymenlink = getTranslations('payment_link', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.billingCheckbox = page.getByText(this.selectorsPaymenlink.screenBillingData.checkboxLabel);
    this.billingTitle = page.getByText(this.selectorsPaymenlink.screenBillingData.formTitle);
    this.mainViewBillingTitle = page.getByText(
      this.selectorsPaymenlink.screenMainView.billingFormTitle
    );
    this.mainViewCardTitle = page.getByText(this.selectorsPaymenlink.screenMainView.cardFormTitle);
    this.inputBillingFormName = page.locator('#input-billing-first-name');
    this.inputBillingFormLastName = page.locator('#input-billing-last-name');
    this.inputBillingFormIdentityDocument = page.locator('#input-billing-identity-dni');
    this.inputBillingFormAddress1 = page.locator('#input-billing-address1');
    this.inputBillingFormAddress2 = page.locator('#input-billing-address2');
    this.inputBillingFormAdditionalDescription = page.locator('#additional_description');
    this.inputBillingFormZipCodet = page.locator('#input-billing-zipcode');
    this.billingFormPhoneInput = page
      .getByRole('textbox', {
        name: this.selectorsPaymenlink.screenBillingData.phoneInputAriaLabel,
      })
      .or(page.locator('[data-testid="input-billing-phone-value-input"]'));
    this.billingFormSaveButton = page.getByText(
      this.selectorsPaymenlink.screenBillingData.formSaveButton
    );
    this.billingAddButtonData = page.locator('#btn-add-billing-data');
    this.buttonAddBillingData = page.getByText(
      this.selectorsPaymenlink.screenBillingData.addBillingData
    );

    this.billingFormStateCity = page.locator('#city');
    this.optionBillingFormCity = this.billingFormStateCity
      .locator('text=Aguascalientes')
      .or(page.locator('#dropdown-content-city').locator('text=Aguascalientes'));

    this.inputBillingFormStateName = page.locator('#dropdown-billing-state');
    this.optionBillingFormStateName = this.inputBillingFormStateName
      .locator('text=Aguascalientes')
      .or(page.locator('#dropdown-content-dropdown-billing-state').locator('text=Aguascalientes'));

    this.dropdownCountry = page.locator('#custom-select-dropdown');
    this.optionCountry = this.dropdownCountry
      .getByTestId('dropdown-item-MX')
      .or(page.locator('#dropdown-content-custom-select-dropdown').getByTestId('dropdown-item-MX'));

    this.mainViewOrderDetailsTitle = page.getByText(
      this.selectorsPaymenlink.screenMainView.orderDetailsTitle
    );
    this.billingCardRFCLabel = page.locator(
      '#payment-methods-identity-number, #input-billing-identity-dni, [data-testid="card_holder_dni-value-input"]'
    ); // migration-or
    this.showBillingBtn = page.locator('#btn-add-billing-data');
    this.buttonShowUpdateBillingData = page.locator('[data-testid="btn-update-billing-data"]');
  }

  async waitUntilLoaded() {
    await this.mainViewCardTitle.waitFor({ state: 'visible' });
  }

  async assertBillingFormIsVisibleInMainView() {
    await expect(this.billingCheckbox).toBeHidden();
    await expect(this.mainViewBillingTitle).toBeVisible();
  }

  async assertOrderDetailsIsHidden() {
    await expect(this.mainViewOrderDetailsTitle).toBeHidden();
  }

  async assertBillingFormIsHidden() {
    await expect(this.showBillingBtn).toBeVisible();
    await expect(this.billingTitle).toBeHidden();
  }

  async assertBillingCardIsVisible() {
    await expect(this.billingAddButtonData).toBeVisible();
    await this.billingCheckbox.click();
  }

  async assertAddBillingDataButtonIsVisible() {
    await expect(this.iframeZoidVisible.locator(this.buttonAddBillingData)).toBeVisible({
      timeout: 15000,
    });
  }
  async showBillingForm() {
    await this.showBillingBtn.click();
  }

  async showBillingFormIFrame() {
    await this.ensureVisibleToClick(this.showBillingBtn, this.iframeZoidVisible);
  }

  async assertBillingCheckboxIsVisible() {
    await expect(this.iframeZoidVisible.locator(this.billingCheckbox)).toBeVisible();
  }

  async assertPaymentStatusOnPage(status: string) {
    await expect(this.page.getByText(status)).toBeVisible({ timeout: 40000 });
  }

  async selectCountry() {
    await this.ensureVisibleToClick(this.dropdownCountry);
    await this.ensureVisibleToClick(this.optionCountry);
  }

  async fillBillingForm() {
    await this.inputBillingFormStateName.click();
    await this.optionBillingFormStateName.click();

    await this.billingFormStateCity.click();
    await this.optionBillingFormCity.first().click();

    await this.billingFormPhoneInput.fill('5512345678');
    await this.billingFormSaveButton.scrollIntoViewIfNeeded();
    await this.billingFormSaveButton.click();

    await expect(this.billingCardRFCLabel).toBeVisible();
  }

  async fillCompleteForm(billingData: BillingData) {
    const fieldMappings = {
      firstName: this.inputBillingFormName,
      lastName: this.inputBillingFormLastName,
      identityDocument: this.inputBillingFormIdentityDocument,
      address1: this.inputBillingFormAddress1,
      address2: this.inputBillingFormAddress2,
      additionalDescription: this.inputBillingFormAdditionalDescription,
      zipCode: this.inputBillingFormZipCodet,
      phone: this.billingFormPhoneInput,
    };

    for (const [key, field] of Object.entries(fieldMappings)) {
      if (billingData[key]) {
        await field.fill(billingData[key]);
      }
    }

    if (billingData.state) {
      await this.inputBillingFormStateName.click();
      await this.optionBillingFormStateName.click();
    }
    if (billingData.city) {
      await this.billingFormStateCity.click();
      await this.optionBillingFormCity.first().click();
    }

    await this.billingFormSaveButton.click();
  }

  async openBillingFormFlexible() {
    const isVisible = await this.isVisibleWithTimeout(this.buttonShowUpdateBillingData);

    if (isVisible) {
      await this.ensureVisibleToClick(this.buttonShowUpdateBillingData);
      return;
    }

    await this.ensureVisibleToClick(this.showBillingBtn);
  }
}
