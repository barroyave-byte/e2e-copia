import { FrameLocator, Locator, Page, Response, expect } from '@playwright/test';
import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { CommonsActions } from '@pages/commonActions';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { ClickToPayTranslations } from '@support/translations/selectors/explore/click_to_pay/clickToPayTranlations';

export class ClickToPayPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: ClickToPayTranslations;
  readonly iframeElements: FrameLocator;
  readonly inputCardNumber: Locator;
  readonly inputExpDate: Locator;
  readonly inputCVV: Locator;
  readonly inputCardHolder: Locator;
  readonly openInstallmentsDropdown: Locator;
  readonly alertsModal: Locator;
  readonly privacyPolicyLink: Locator;
  inputCreditCardNumber: Locator;
  inputExpiryDate: Locator;
  inputCvv: Locator;
  inputHolderName: Locator;
  continueButton: Locator;

  responsePurchaseV2: any;
  requestPurchaseV2: any;
  responseCards: any;
  responseCardsFirst: any;
  responseInstallments: any;
  responseAllCards: any;
  mcUserInfoIframe: FrameLocator;
  mcUserInfoContinueBtn: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore/click_to_pay', languageCode);

    this.iframeElements = page.frameLocator("xpath=//iframe[contains(@src, 'click_to_pay')]");

    this.inputCreditCardNumber = page.locator('[data-baseweb="payment-card-input"] > input');
    this.inputExpiryDate = page.locator('[id="payment-methods-expiration-date-input"]');
    this.inputCvv = page.locator('[id="payment-methods-cvv-input"]');
    this.inputHolderName = page.locator('[id="payment-methods-card-holder"]');
    this.continueButton = page.locator(
      `button:has-text("${this.selectors.screenStartClickToPay.continueLabel}")`
    );
    this.mcUserInfoIframe = this.iframeElements.frameLocator('#paymentWindow');
    this.mcUserInfoContinueBtn = this.mcUserInfoIframe.locator('button:has-text("Continuar")');
  }

  async fillInputCreditCardNumber(creditCardNumber: string) {
    await this.pressTextOnInput(this.inputCreditCardNumber, creditCardNumber, {
      iframe: this.iframeElements,
    });
  }

  async fillInputExpirationDate(expirationDate: string) {
    await this.iframeElements.locator(this.inputExpiryDate).fill(expirationDate);
  }

  async fillInputCvv(cvv: string) {
    await this.pressTextOnInput(this.inputCvv, cvv, {
      iframe: this.iframeElements,
    });
  }

  async fillInputCardHolder(cardHolder: string) {
    await this.pressTextOnInput(this.inputHolderName, cardHolder, {
      iframe: this.iframeElements,
      delayPress: 100,
    });
  }

  async clearInputCardHolder() {
    const input = this.iframeElements.locator(this.inputHolderName);
    await input.clear();
  }

  async fillCardInfo(creditCardInfo: BaseCreditCard) {
    await this.fillInputCreditCardNumber(creditCardInfo.number);
    await this.fillInputExpirationDate(creditCardInfo.expiration_date);
    await this.fillInputCvv(creditCardInfo.cvv_code);
    await this.fillInputCardHolder(creditCardInfo.cardholder_name);
  }

  async fillMastercardUserInfo() {
    await this.mcUserInfoIframe
      .locator('input#phoneNumber')
      .fill(`32${Math.floor(10000000 + Math.random() * 90000000)}`);
  }

  async saveMastercardUserInfo() {
    await this.mcUserInfoContinueBtn.click();
  }

  async waitResponseFromSaveCard() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/cards') &&
        response.url().includes('deuna.io') &&
        response.request().method() === 'POST'
    );
  }

  async assertCreateCardPayload(response: Response) {
    const requestPayload = response.request().postDataJSON();

    expect(requestPayload.card_cvv).toBeTruthy();
    expect(requestPayload.credential_source).toBe('click_to_pay');
    expect(requestPayload.credential_source_config).toBeTruthy();
    expect(requestPayload.credential_source_config.type).toBe('click_to_pay');
    expect(requestPayload.credential_source_config.system).toBe('mastercard_ucs');
    expect(requestPayload.credential_source_config.values).toBeTruthy();
    expect(requestPayload.credential_source_config.values.src_cx_flow_id).toBeTruthy();
    expect(requestPayload.credential_source_config.values.merchant_transaction_id).toBeTruthy();
    expect(requestPayload.credential_source_config.values.system).toBe('SRC');
    expect(requestPayload.credential_source_config.values.is_cvv_requested).toBe('true');
    expect(requestPayload.credential_source_config.values.dpa).toBeTruthy();
    expect(requestPayload.credential_source_config.values.correlationId).toBeTruthy();
  }

  async assertCreateCardResponse(response: Response) {
    expect(response.status()).toBe(201);
    const responseJson = await response.json();

    expect(responseJson.data.id).toBeTruthy();
    expect(responseJson.data.user_id).toBeTruthy();
    expect(responseJson.data.card_holder).toBeTruthy();
    expect(responseJson.data.company).toBeTruthy();
    expect(responseJson.data.last_four).toBeTruthy();
    expect(responseJson.data.first_six).toBeTruthy();
    expect(responseJson.data.expiration_date).toBeTruthy();
    expect(responseJson.data.is_valid).toBe(false);
    expect(responseJson.data.is_expired).toBe(false);
    expect(responseJson.data.verified_at).toBeTruthy();
    expect(responseJson.data.last_used).toBeTruthy();
    // expect(responseJson.data.bank_name).toBeTruthy();
    expect(responseJson.data.country_iso).toBeTruthy();
    expect(responseJson.data.card_type).toBeTruthy();
    expect(responseJson.data.source).toBeTruthy();
  }

  async clickOnContinue() {
    await this.iframeElements.locator(this.continueButton).click();
  }

  async assertCardHolderError() {
    const locator = this.iframeElements
      .getByRole('alert')
      .filter({ hasText: this.selectors.errorMessagesCardForm.cardHolder });

    await expect(locator.first()).toBeVisible();
  }

  async assertCardFormErrorMessages() {
    // cardNumber error isn't migrated to role="alert" yet; it still renders as plain text.
    // TODO: Add role="alert" in the UI and migrate this selector
    const cardNumberLocator = this.iframeElements.getByText(
      this.selectors.errorMessagesCardForm.cardNumber
    );
    await expect(cardNumberLocator.first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ '${this.selectors.errorMessagesCardForm.cardNumber}' is visible.`);

    const alertMessages = [
      this.selectors.errorMessagesCardForm.expirationDate,
      this.selectors.errorMessagesCardForm.securityCode,
      this.selectors.errorMessagesCardForm.cardHolder,
    ];

    for (const message of alertMessages) {
      const locator = this.iframeElements.getByRole('alert').filter({ hasText: message });

      await expect(locator.first()).toBeVisible({ timeout: 5000 });

      console.log(`✅ '${message}' is visible.`);
    }

    console.log('✅ All error messages are displayed.');
  }
}
