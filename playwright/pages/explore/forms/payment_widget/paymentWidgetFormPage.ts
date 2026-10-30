import { expect, FrameLocator, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { BaseCreditCard } from '@support/interfaces/credit_cards';

export class PaymentWidgetFormPage extends FormHelpers {
  readonly page: Page;
  readonly selectPaymentWidgetMethod: Locator;
  readonly sectionPaymentWidgetContainer: Locator;
  readonly iframeZoidVisible: FrameLocator;
  readonly buttonContinueAsGuest: Locator;

  readonly inputCreditCardNumber: Locator;
  readonly inputExpirationDate: Locator;
  readonly inputCvv: Locator;
  readonly inputHolderName: Locator;
  readonly inputDocumentNumber: Locator;

  readonly buttonPay: Locator;
  readonly buttonAddBillingData: Locator;

  readonly inputBillingDescription: Locator;

  readonly selectBillingState: Locator;
  readonly optionBillingState: Locator;
  readonly selectCity: Locator;
  readonly optionCity: Locator;
  readonly buttonSaveBillingForm: Locator;

  readonly selectors: DeunanowTranslations;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectors = getTranslations('deunanow', languageCode);
    this.selectPaymentWidgetMethod = page.locator('#payment_method_payment_widget');
    this.sectionPaymentWidgetContainer = page.locator('#payment-widget-embed');
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.buttonContinueAsGuest = page.locator('[data-testid="continue-as-guest-button"]');
    this.buttonPay = page.locator('#payment-button');
    this.buttonAddBillingData = page.locator('#btn-add-billing-data');
    this.inputBillingDescription = page.locator('#additional_description');
    this.selectBillingState = page.locator('#dropdown-billing-state');
    this.optionBillingState = page
      .locator('#dropdown-billing-state >> text=Bogotá D.C.')
      .or(page.locator('#dropdown-content-dropdown-billing-state >> text=Bogotá D.C.'));
    this.selectCity = page.locator('#city');
    this.optionCity = page
      .locator('#city >> text=Bogotá D.C.')
      .or(page.locator('#dropdown-content-city >> text=Bogotá D.C.'));
    this.buttonSaveBillingForm = page.getByText(this.selectors.screenBillingData.buttonFormSave);
    this.inputCreditCardNumber = page.locator('[data-baseweb="payment-card-input"] > input');
    this.inputExpirationDate = page.locator('[id="payment-methods-expiration-date-input"]');
    this.inputDocumentNumber = page
      .locator('[id="payment-methods-identity-number"]')
      .or(page.locator('[data-testid="card_holder_dni-value-input"]')); // migration-or
    this.inputHolderName = page.locator('[id="payment-methods-card-holder"]');
    this.inputCvv = page.locator('[id="payment-methods-cvv-input"]');
  }

  private getZoidLocator(locator: Locator): Locator {
    return this.iframeZoidVisible.locator(locator);
  }

  //Actions
  async selectPaymentWidgetForm() {
    await expect(this.selectPaymentWidgetMethod).toBeVisible();
    await this.selectPaymentWidgetMethod.scrollIntoViewIfNeeded();
    await this.selectPaymentWidgetMethod.click();
  }

  /**
   * @returns The height of the payment widget container.
   */
  async getPaymentWidgetContainerHeight(): Promise<number> {
    return this.getElementHeight(this.sectionPaymentWidgetContainer);
  }

  /**
   * Asserts that the payment widget container is visible and has a height greater than 100.
   */
  async assertPaymentWidgetContainerIsVisible() {
    await expect(this.sectionPaymentWidgetContainer).toBeVisible();
    const containerHeight = await this.getPaymentWidgetContainerHeight();
    await expect(containerHeight).toBeGreaterThan(100);
    this.containerHeight = containerHeight;
  }

  /**
   * Asserts that the OTP page is loaded by checking that the container height is different from the initial height.
   */
  async assertOtpPageIsLoadedAndContainerIsResized() {
    await expect(this.getZoidLocator(this.buttonContinueAsGuest)).toBeVisible();
    await this.assertContainerResized(
      this.sectionPaymentWidgetContainer,
      'payment widget container'
    );
  }

  /**
   * Asserts that the payment widget container is resized after the payment form is loaded.
   */
  async assertPaymentWidgetContainerIsResizedAfterPaymentFormIsLoaded() {
    await this.getZoidLocator(this.buttonContinueAsGuest).click();
    await expect(this.getZoidLocator(this.buttonPay)).toBeVisible();
    await this.assertContainerResized(
      this.sectionPaymentWidgetContainer,
      'payment widget container'
    );
  }

  /**
   * Asserts that the billing form is shown and the container is resized.
   */
  async assertContainerIsResizedWhenBillingFormIsShown() {
    await this.getZoidLocator(this.buttonAddBillingData).click();
    await expect(this.getZoidLocator(this.buttonPay)).toBeHidden();
    await this.assertContainerResized(
      this.sectionPaymentWidgetContainer,
      'payment widget container'
    );
  }

  /**
   * Fills the billing form with the provided data.
   */
  async fillBillingForm() {
    await this.pressTextOnInput(this.inputBillingDescription, 'Santa catalina', {
      iframe: this.iframeZoidVisible,
    });

    await this.ensureVisibleToClick(this.selectBillingState, this.iframeZoidVisible);
    await this.ensureVisibleToClick(this.optionBillingState, this.iframeZoidVisible);

    await this.ensureVisibleToClick(this.selectCity, this.iframeZoidVisible);
    await this.ensureVisibleToClick(this.optionCity, this.iframeZoidVisible);
  }

  /**
   * Asserts that the container is resized when the billing form is saved and closed.
   * Payment form must be visible.
   */
  async assertContainerIsResizedWhenBillingFormIsSaved() {
    await this.ensureVisibleToClick(this.buttonSaveBillingForm, this.iframeZoidVisible);
    await expect(this.getZoidLocator(this.buttonPay)).toBeVisible();
    await this.assertContainerResized(
      this.sectionPaymentWidgetContainer,
      'payment widget container'
    );
  }

  /**
   * Asserts that the container is resized when the pay button is clicked and polling is shown, the container height must not be resized.
   */
  async assertClickOnPayButtonPollingIsShownAndContainerIsNotResized() {
    await this.ensureVisibleToClick(this.buttonPay, this.iframeZoidVisible);
    const containerHeight = await this.getPaymentWidgetContainerHeight();
    await expect(containerHeight).toBe(this.containerHeight);
  }

  async assertClickOnContinueAsGuestIsShown() {
    await this.ensureVisibleToClick(this.buttonContinueAsGuest, this.iframeZoidVisible, undefined, {
      timeout: 20000,
    });
  }

  async fillCreditCardData(creditCardData: BaseCreditCard) {
    await this.fillInputCreditCardNumber(creditCardData.number);
    await this.fillInputExpirationDate(creditCardData.expiration_date);
    await this.fillInputCvv(creditCardData.cvv_code);
    await this.fillInputHolderName(creditCardData.cardholder_name);
    await this.fillInputDocumentNumber(creditCardData.document_number);
  }

  async fillInputHolderName(holderName: string) {
    await this.pressTextOnInput(this.inputHolderName, holderName, {
      iframe: this.iframeZoidVisible,
    });
  }

  async fillInputCreditCardNumber(creditCardNumber: string) {
    await this.pressTextOnInput(this.inputCreditCardNumber, creditCardNumber, {
      iframe: this.iframeZoidVisible,
    });
  }

  async fillInputExpirationDate(expirationDate: string) {
    await this.pressTextOnInput(this.inputExpirationDate, expirationDate, {
      iframe: this.iframeZoidVisible,
    });
  }

  async fillInputCvv(cvv: string) {
    await this.pressTextOnInput(this.inputCvv, cvv, {
      iframe: this.iframeZoidVisible,
    });
  }

  async fillInputDocumentNumber(documentNumber: string) {
    await this.pressTextOnInput(this.inputDocumentNumber, documentNumber, {
      iframe: this.iframeZoidVisible,
      delayPress: 100,
    });
  }
}
