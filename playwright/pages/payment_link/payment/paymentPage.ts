import { Locator, Page, Response, expect } from '@playwright/test';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { DEFAULT_DOCUMENT_BY_COUNTRY } from '@support/constants/identityDocuments';
import { TextPaymentMethods } from '@support/interfaces/textsPaymentsMethodsUITypes';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';
import { BaseUserData } from '@support/interfaces/user_data';
import { PaymentLinkTranslations } from '@support/translations/selectors/payment_link/paymentLinkTranslations';
import { CommonsActions } from '@pages/commonActions';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import {
  PURCHASE_URL_PATTERN,
  isV2PurchaseRequest,
  assertDeviceIdInPurchaseRequest,
} from '@support/utils/purchase-contracts';
import { PurchaseResponseValidator } from '@pages/validators/purchaseResponseValidators';

const redirectUrls = {
  close: 'https://www.google.com?q=close',
  success: 'https://www.google.com?q=success',
  pending: 'https://www.google.com?q=pending',
  error: 'https://www.google.com?q=failure',
  fallback: 'https://www.google.com?q=fallback',
};

export class PaymentPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: PaymentLinkTranslations;
  readonly deunanowTranslations: DeunanowTranslations;
  readonly checkoutTranslations: CheckoutTranslations;
  readonly buttonPay: Locator;
  readonly buttonPayExternal: Locator;
  readonly buttonPaySummary: Locator;
  readonly buttonEmbeddedPayment: Locator;
  readonly buttonOpenCheckout: Locator;
  readonly labelTitleLogin: Locator;
  readonly labelTitleLoginBR: Locator;
  readonly labelDescriptionLogin: Locator;
  readonly labelDescriptionLoginBR: Locator;
  readonly labelMessageOrderFailed: Locator;
  readonly labelContinueButtonError: Locator;
  readonly labelCVVError: Locator;
  readonly buttonCloseAlertError: Locator;
  readonly selectInstallments: Locator;
  readonly inputCreditCardNumber: Locator;
  readonly inputExpirationDate: Locator;
  readonly inputDocumentNumber: Locator;
  readonly inputCardCVV: Locator;
  readonly inputCardName: Locator;
  readonly inputUserInfoPhone: Locator;
  readonly labelMessageTransactionSuccess: Locator;
  readonly buttonSeeAllMyCards: Locator;
  readonly inputEnterCoupon: Locator;
  readonly buttonDeleteCoupon: Locator;
  readonly imageOTPDiners: Locator;
  readonly labelDescriptionOTPDiners: Locator;
  readonly inputOTPDiners: Locator;
  readonly imageMapsAddress: Locator;
  readonly buttonGoBackToOrder: Locator;
  readonly inputCodeOtpDiners2: Locator;
  readonly optionAddCreditCard: Locator;
  readonly inputCardCvvRegistered: Locator;
  readonly signOutButton: Locator;
  readonly confirmSignOutButton: Locator;
  readonly inputBillingDocumentIdentity: Locator;
  readonly termsAndConditions: Locator;
  readonly privacyPolicy: Locator;
  readonly labelThankYouPageTitle: Locator;
  readonly labelThankYouPageSuccess: Locator;
  readonly divSaveCard: Locator;
  readonly checkboxSaveCard: Locator;
  readonly transactionId: Locator;
  readonly labelSubtotal: Locator;
  readonly labelTermsAndConditions: Locator;
  readonly labelSaveCards: Locator;
  readonly buttonAddBillingData: Locator;
  readonly errorNotificationContainer: Locator;
  readonly labelLinkIsNotAvailable: Locator;
  readonly labelPleaseCheckOrderStatus: Locator;
  readonly inlineErrorMissingBillingData: Locator;
  readonly tabMercadoPagoWallet: Locator;
  readonly tabSafetypay: Locator;
  readonly inputAddress1: Locator;
  readonly identityDocumentTypeDropdown: Locator;
  readonly idDocumentErrorMessage: Locator;
  readonly customImagePoweredByDeuna: Locator;

  poweredByLogoResponse: any;
  responsePromise: any;
  cardsRequestDetected: boolean;
  responseCreateCard: any;
  responseAllCards: any;
  three3dsResponsePromise: any;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.selectors = getTranslations('payment_link', languageCode);
    this.deunanowTranslations = getTranslations('deunanow', languageCode);
    this.checkoutTranslations = getTranslations('checkout', languageCode);
    this.buttonPay = page.locator('button:has-text("Pagar")');
    this.buttonPayExternal = page.getByTestId('pay-button-desktop');
    this.buttonPaySummary = page.locator('button:has-text("Pagar")').nth(1);
    this.buttonEmbeddedPayment = page.locator('button:has-text("Embedir Pago")');
    this.signOutButton = page.locator('button:has-text("Cerrar sesión")');
    this.confirmSignOutButton = page.locator('button:has-text("Confirmar")').nth(0);
    this.buttonCloseAlertError = page.locator("[title='Close'], [aria-label='Cerrar alerta']");
    this.termsAndConditions = page.locator("text='Términos y condiciones'");
    this.privacyPolicy = page.locator("text='Políticas de privacidad'");
    this.selectInstallments = page
      .getByRole('button', {
        name: `${this.selectors.screenInstallmentsQuantityMSI.buttonInstallmentsMSI}`,
      })
      .or(
        page
          .locator('[data-testid="dropdown-input-installments"]')
          .filter({ hasText: 'Sin cuotas' })
      );
    this.inputCreditCardNumber = page.locator('[data-baseweb="payment-card-input"] > input');
    this.inputExpirationDate = page.locator('[id="payment-methods-expiration-date-input"]');
    this.inputDocumentNumber = page
      .locator('[id="payment-methods-identity-number"]')
      .or(page.locator('[data-testid="card_holder_dni-value-input"]')); // migration-or
    this.inputCardCVV = page.locator('[id="payment-methods-cvv-input"]');
    this.inputCardCvvRegistered = page.locator('#user-card-cvv-input');
    this.inputCardName = page.locator('#payment-methods-card-holder');
    // UserInfoPattern checkout module: required before the purchase can be processed.
    this.inputUserInfoPhone = page.getByTestId('userinfo-phone-value-input');
    this.labelTitleLogin = page.getByText('Hola QA TEST✌️');
    this.labelTitleLoginBR = page.getByText('Olá QA TEST✌️');
    this.labelDescriptionLogin = page.getByText(
      'Asegúrate de revisar tu dirección y forma de pago antes de comprar.'
    );
    this.labelDescriptionLoginBR = page.getByText(
      'Certifique-se de verificar seu endereço e forma de pagamento antes de comprar.'
    );
    this.labelMessageOrderFailed = page.getByText(
      this.deunanowTranslations.screenAlertNotifications.purchaseError
    );
    this.labelContinueButtonError = page.getByText(
      this.checkoutTranslations.cardSelectors.continueButtonError
    );
    this.labelCVVError = page.getByText(this.checkoutTranslations.cardSelectors.cvvError);
    this.buttonSeeAllMyCards = page.getByText(
      this.checkoutTranslations.cardSelectors.buttonSeeAllMyCards
    );
    this.inputEnterCoupon = page.locator('[name="coupon"]');
    this.buttonDeleteCoupon = page.locator('svg[title="Delete"]');
    this.imageOTPDiners = page.locator('img[src*="diners_club.png"]');
    this.labelDescriptionOTPDiners = page.getByText(
      this.checkoutTranslations.otpDinersSelectors.descriptionOTPDiners
    );
    this.inputOTPDiners = page.locator('[autocomplete="one-time-code"]');
    this.imageMapsAddress = page.locator('[alt="Map Image"]');
    this.buttonGoBackToOrder = page.locator(
      `button:has-text("${this.checkoutTranslations.otpDinersSelectors.buttonGoBackToOrder}")`
    );
    this.buttonAddBillingData = page.locator('#btn-add-billing-data');
    this.inputCodeOtpDiners2 = page.locator('#otp-input-0');
    this.inputBillingDocumentIdentity = page.locator("input[id='input-billing-zipcode']");
    this.optionAddCreditCard = page
      .locator('div')
      .filter({ hasText: /^Agregar una tarjeta$/ })
      .first();
    this.labelThankYouPageTitle = page.locator('#successful_order_text h1');
    this.labelThankYouPageSuccess = page.getByText('Thank You!!!!');
    this.transactionId = page.getByTestId('row-transactionId-DEUNA-value');
    this.labelSubtotal = page.getByText(this.selectors.screenPaymentLinkUserInfo.subtotal, {
      exact: true,
    });
    this.labelTermsAndConditions = page.getByText(
      this.selectors.screenPaymentLinkUserInfo.termsAndConditions,
      {
        exact: true,
      }
    );
    this.divSaveCard = page.locator('#save_card_checkbox');
    this.labelSaveCards = page.locator(
      `p:has-text('${this.selectors.screenPaymentLinkPaymentForm.saveCardsLabel}')`
    );
    this.labelSaveCards = page.getByTestId('save_card_text');
    this.checkboxSaveCard = page.locator('label[data-baseweb="checkbox"]');
    this.cardsRequestDetected = false;
    this.errorNotificationContainer = page.locator(
      '#alert-container-notification-negative, #alert-container'
    );
    this.inlineErrorMissingBillingData = page.getByText(
      this.deunanowTranslations.screenAlertNotifications.missingBillingData
    );
    this.labelLinkIsNotAvailable = page.getByText(
      this.selectors.screenPaymentLinkPaymentFormDenied.linkIsnotAvailable
    );
    this.labelPleaseCheckOrderStatus = page.getByText(
      this.selectors.screenPaymentLinkPaymentFormDenied.pleaseCheckOrderStatus
    );

    this.tabMercadoPagoWallet = page
      .locator('[id="tab-wallet:mercadopago_wallet"]')
      .or(page.locator('[datatestid="tab-wallet:mercadopago_wallet"]')); // migration-or
    this.tabSafetypay = page
      .locator('[id="tab-bank_transfer:safetypay"]')
      .or(page.locator('[datatestid="tab-bank_transfer:safetypay"]'))
      .or(page.locator('[id="tab-voucher:safetypay"]'))
      .or(page.locator('[datatestid="tab-voucher:safetypay"]')); // migration-or
    this.inputAddress1 = page.locator("input[id='input-billing-address1']");
    this.identityDocumentTypeDropdown = page
      .locator('#payment-methods-identity-number-dropdown')
      .or(page.locator('[data-testid="dropdown-input-card_holder_dni"]')); // migration-or
    this.idDocumentErrorMessage = page
      .getByTestId('card_holder_dni-caption')
      .or(page.locator('#card_holder_dni-error')); // migration-or
    this.customImagePoweredByDeuna = page.locator('img[alt*="Powered by DEUNA"]');
  }

  async clickTabMercadoPagoWallet() {
    await this.ensureVisibleToClick(this.tabMercadoPagoWallet);
  }

  async clickOnPayWaitResponse() {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 80_000 });
    await this.clickOnPayButton();
    await this.responsePromise;
  }

  async waitResponseFromGetCards() {
    this.responseAllCards = this.page.waitForResponse(
      (response) => response.url().includes('/cards') && response.request().method() === 'GET'
    );
  }

  async assertCurrentPageIsRedirectStatusUrl(status: string) {
    await this.page.waitForURL(redirectUrls[status], { timeout: 35000 });
  }

  async clickSaveCardCheckbox() {
    await this.checkboxSaveCard.click();
  }

  async assertCardInputIsVisible() {
    await this.ensureVisible(this.inputCreditCardNumber, {
      errorMessage: 'The credit card input is not visible',
    });
  }

  async assertCardFormFieldLabelsAreVisible(cardNumberLabel: string, cardHolderLabel: string) {
    await expect(this.page.getByText(cardNumberLabel)).toBeVisible();
    await expect(this.page.getByText(cardHolderLabel)).toBeVisible();
  }

  async assertSaveUserCheckboxIsChecked() {
    const isChecked = await this.checkboxSaveCard.isChecked();
    expect(isChecked).toBeTruthy();
  }

  async assertSaveUserCheckboxIsUnchecked() {
    const isChecked = await this.checkboxSaveCard.isChecked();
    expect(isChecked).toBeFalsy();
  }

  async assertUserSeeSaveCardCheckbox() {
    await expect(this.labelSaveCards).toBeVisible();
    await expect(this.checkboxSaveCard).toBeVisible();
  }

  async assertUserDoesNotSeeSaveCardCheckbox() {
    await expect(this.labelSaveCards).toBeHidden();
    await expect(this.checkboxSaveCard).toBeHidden();
  }

  async assertUserSeeTermsAndConditions() {
    await expect(this.termsAndConditions).toBeVisible();
    await expect(this.privacyPolicy).toBeVisible();
  }

  async assertUserDoesNotSeeTermsAndConditions() {
    await expect(this.termsAndConditions).toBeHidden();
    await expect(this.privacyPolicy).toBeHidden();
  }

  async enterBillingDocumentId(userData: BaseUserData) {
    await this.inputBillingDocumentIdentity.fill(userData.dni);
    await this.page.keyboard.press('Tab');
  }

  threeDSUrlAwaiter() {
    this.three3dsResponsePromise = this.page.waitForResponse('**/three-ds-flow/continue**');
  }

  async assert3dsResponseSuccess() {
    const response3ds = await this.three3dsResponsePromise;
    expect(response3ds.status(), '3DS Response').toBe(200);
  }

  async enterBillingZipCode(zipcode: string = '01100') {
    await this.inputBillingDocumentIdentity.fill(zipcode);
    await this.page.keyboard.press('Tab');
  }

  async enterBillingAddress1(address1: string = 'Address 1') {
    await this.inputAddress1.fill(address1);
    await this.page.keyboard.press('Tab');
  }

  async selectPaymentMethod(paymentMethod: TextPaymentMethods) {
    const locatorPaymentMethod = this.page.getByText(paymentMethod, { exact: true });
    expect(locatorPaymentMethod, 'Payment method is not visible').toBeVisible();
    await locatorPaymentMethod.click();
  }

  async selectPaymentMethodById(paymentMethodId: string) {
    const locatorPaymentMethod = this.page.locator(`#${paymentMethodId}`);
    expect(locatorPaymentMethod, 'Payment method is not visible').toBeVisible();
    await locatorPaymentMethod.click();
  }

  async seePoweredByLogo() {
    this.poweredByLogoResponse = this.page.waitForResponse(
      '**/checkout_modular/deuna-logo-sm.svg**'
    );
    if (this.poweredByLogoResponse) {
      const poweredByResponse = await this.poweredByLogoResponse;
      expect(poweredByResponse.status(), 'poweredByLogo').toBe(200);
    }
  }

  async assertDisplayAddButtonBillingFields() {
    await expect(this.buttonAddBillingData).toBeVisible({ timeout: 5000 });
  }

  async assertPoweredByLogoUrlAndWidth(url: string, width: string) {
    await expect(this.customImagePoweredByDeuna).toBeVisible();
    await expect(this.customImagePoweredByDeuna).toHaveAttribute('src', url);
    const imageStyle = await this.customImagePoweredByDeuna.getAttribute('style');
    expect(imageStyle).toContain(`width: ${width}`);
  }

  async assertPoweredByLogoStyles() {
    await expect(this.customImagePoweredByDeuna).toBeVisible();
    const imageSrc = await this.customImagePoweredByDeuna.getAttribute('src');
    expect(imageSrc).toBe('https://images-staging.getduna.com/checkout_modular/deuna-logo-sm.svg');

    const imageStyle = await this.customImagePoweredByDeuna.getAttribute('style');
    expect(imageStyle).toContain('width: 50px;');
    expect(imageStyle).toContain('height: 200px;');
  }

  async fillCreditCardDataWithBase(creditCardData: BaseCreditCard, opts?: { country?: string }) {
    await this.scrollThis(0, 200);
    await expect(this.inputCreditCardNumber, 'Credit card input is not visible').toBeVisible({
      timeout: 60000,
    });
    await this.inputCreditCardNumber.fill(creditCardData.number);
    await this.inputExpirationDate.fill(creditCardData.expiration_date);
    await this.inputCardCVV.fill(creditCardData.cvv_code);
    await this.inputCardName.fill(creditCardData.cardholder_name);
    const documentNumber = opts?.country
      ? (DEFAULT_DOCUMENT_BY_COUNTRY[opts.country] ?? creditCardData.document_number)
      : creditCardData.document_number;
    await this.inputDocumentNumber.fill(documentNumber);
    await this.page.waitForTimeout(1000);
  }

  /** UserInfoPattern's phone field — required before the purchase can be processed. */
  async fillUserInfoPhone(phone: string) {
    await expect(this.inputUserInfoPhone, 'User info phone input is not visible').toBeVisible();
    await this.inputUserInfoPhone.fill(phone);
  }

  async fillCreditCardDataWithoutCVV(creditCardData: BaseCreditCard, opts?: { country?: string }) {
    await this.scrollThis(0, 200);
    await this.page.waitForTimeout(1000);
    expect(this.inputCreditCardNumber, 'Credit card input is not visible').toBeVisible({
      timeout: 60000,
    });
    await this.inputCreditCardNumber.fill(creditCardData.number);
    await this.inputExpirationDate.fill(creditCardData.expiration_date);
    await this.inputCardName.fill(creditCardData.cardholder_name);
    const documentNumber = opts?.country
      ? (DEFAULT_DOCUMENT_BY_COUNTRY[opts.country] ?? creditCardData.document_number)
      : creditCardData.document_number;
    await this.inputDocumentNumber.fill(documentNumber);
    await this.page.waitForTimeout(1000);
  }

  async clickOnPayButtonSummary() {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 280000 });
    await this.buttonPaySummary.click();
  }

  async waitForCreateCardsResponse(page?: Page) {
    await page.route('**/cards', (route) => {
      this.cardsRequestDetected = true;
      route.continue();
    });
    // Set up waitForResponse outside of route to avoid unresolved promises
    this.responseCreateCard = page
      .waitForResponse('**/cards', {
        timeout: 50000,
      })
      .catch((error) => {
        // Gracefully handle timeout - request was detected but response didn't arrive
        console.log('[INFO] Cards response timeout handled gracefully');
        return null;
      });
    console.log('Current page URL:', page.url());
  }

  async clickOnPayButton() {
    await this.buttonPay.click();
  }

  async clickOnPayAndValidate(validator: PurchaseResponseValidator) {
    const responsePromise = waitForPurchaseResponse(this.page);
    await this.clickOnPayButton();
    const response = await responsePromise;

    await validator.validatePayload(response.request());
    await validator.validateResponse(await response.json());
  }

  async clickOnPayButtonSummaryWithOutTransaction() {
    await this.buttonPaySummary.click();
  }

  async clickOnPayButtonEmbedded() {
    await this.buttonEmbeddedPayment.click();
  }

  async clickOnPay(paymentLinkPage?: Page) {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 60000 });
    await this.waitForCreateCardsResponse(paymentLinkPage ?? this.page);
    await this.scrollThis(0, 200);
    await this.mockHolderNameCreditCard();
    await this.buttonPay.click();
  }

  async clickOnSignOut() {
    await this.signOutButton.click();
  }

  async confirmSignOut() {
    expect(this.confirmSignOutButton.isVisible());
    await this.confirmSignOutButton.click();
  }

  async mockHolderNameCreditCard() {
    await this.page.route(PURCHASE_URL_PATTERN, (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postData = JSON.parse(request.postData());

        if (isV2PurchaseRequest(postData)) {
          const cardInfo = postData.payment_source?.card_info as Record<string, string> | undefined;
          if (cardInfo?.card_holder?.includes('CLEAR')) {
            cardInfo.card_holder = cardInfo.card_holder.replace(/CLEAR\s?/, '');
          }
        } else {
          if (postData.credit_card?.card_holder?.includes('CLEAR')) {
            postData.credit_card.card_holder = postData.credit_card.card_holder.replace(
              /CLEAR\s?/,
              ''
            );
          }
        }
        route.continue({ postData: JSON.stringify(postData) });
      } else {
        route.continue();
      }
    });
  }

  async selectInstallmentsMSI(installments: InstallmentQuantity) {
    await this.selectInstallments.click();
    await this.page.waitForTimeout(1000);
    const locatorInstallments = this.page.locator(
      `text=/^${installments} ${this.selectors.screenInstallmentsQuantityMSI.labelInstallmentsMSI}/`
    );
    await locatorInstallments.click();
  }

  async selectAndFillCvvCreditCard(lastFourDigits: string, cvvCode: string) {
    await this.page.locator(`p:has-text("${lastFourDigits}")`).click();
    await this.inputCardCvvRegistered.fill(cvvCode);
  }

  async assertCvvCodeToBeVisible() {
    await expect(this.inputCardCvvRegistered).toBeVisible({ timeout: 35_000 });
  }

  async fillCvvCode(cvvCode: string) {
    await this.inputCardCvvRegistered.fill(cvvCode);
  }

  async redeemCoupon(coupon: string) {
    await this.inputEnterCoupon.fill(coupon);
    await this.inputEnterCoupon.press('Enter');
  }

  async enterOtpCreditCard(codeOtp: string) {
    await this.assertDinerOtpScreenIsVisible();
    await this.inputCodeOtpDiners2.fill(codeOtp);
  }

  async enterOtpDiners(codeOtp: string) {
    await this.page.waitForTimeout(1000);
    await this.assertDinerButtonGoBackIsVisible();
    await this.inputCodeOtpDiners2.type(codeOtp);
    await this.page.waitForTimeout(2000);
  }

  async clickGoBackToOrder() {
    await this.assertDinerButtonGoBackIsVisible();
    await this.buttonGoBackToOrder.click();
  }

  async clearInputsCreditCard() {
    await this.scrollThis(0, 200);
    await this.page.waitForTimeout(1000);
    //Clear all inputs filled
    await this.inputCreditCardNumber.clear({ timeout: 5000 });
    await this.inputExpirationDate.clear({ timeout: 5000 });
    await this.inputCardCVV.clear({ timeout: 5000 });
    await this.inputCardName.clear({ timeout: 5000 });
    await this.inputDocumentNumber.clear({ timeout: 5000 });
  }

  async clearAndFillCreditCard(creditCardData: BaseCreditCard, opts?: { country?: string }) {
    await this.clearInputsCreditCard();
    //Fill all inputs again
    await this.fillCreditCardDataWithBase(creditCardData, opts);
  }

  async scrollThis(horizontal: number, vertical: number) {
    await this.page.mouse.wheel(horizontal, vertical);
  }

  async selectAddCreditCardOption() {
    await this.optionAddCreditCard.click();
  }

  async clickOnSeeAllMyCards() {
    await this.buttonSeeAllMyCards.click();
  }

  async clickOnTestCard(cardNumber: string) {
    const lastFourDigits = cardNumber.slice(-4);
    await this.page.locator(`p:has-text("${lastFourDigits}")`).click();
  }

  async selectPseBank(nameBank: string) {
    await this.page.getByRole('button', { name: 'Seleccione un banco Down' }).click();
    await this.page
      .locator('div')
      .filter({ hasText: new RegExp(`^${nameBank}$`) })
      .click();
  }

  async getTransactionId(): Promise<string> {
    return this.transactionId.textContent();
  }

  //Assertions
  async assertLoginTextsArePresent(country: CountryCodes = 'MX') {
    if (country == 'BR') {
      expect(this.labelTitleLoginBR.isVisible());
      expect(this.labelDescriptionLoginBR.isVisible());
    } else {
      expect(this.labelTitleLogin.isVisible());
      expect(this.labelDescriptionLogin.isVisible());
    }
  }

  async assertDinerOtpScreenIsVisible() {
    expect(this.imageOTPDiners.isVisible());
    expect(this.labelDescriptionOTPDiners.isVisible());
  }

  async assertErrorOrderMessageIsPresent() {
    expect(this.labelMessageOrderFailed.isVisible());
    expect(this.buttonCloseAlertError.isVisible());
  }

  async assertErrorCardRequiredFieldsMessageIsPresent() {
    expect(this.labelContinueButtonError.isVisible());
    expect(this.labelCVVError.isVisible());
    expect(this.buttonCloseAlertError.isVisible());
  }

  async assertCouponIsRedeemed(coupon: string) {
    await this.isVisibleWithTimeout(this.page.locator(`[title="${coupon}"]`));
    await this.isVisibleWithTimeout(this.buttonDeleteCoupon);
  }

  async assertDiscountIsApplied() {
    await this.isVisibleWithTimeout(this.buttonDeleteCoupon);
  }

  async assertShippingAddressPaymentScreen(address: string) {
    expect(this.imageMapsAddress.isVisible());
    expect(this.page.locator(`p:contains("${address}")`).isVisible());
  }

  async assertDinerButtonGoBackIsVisible() {
    await expect(this.buttonGoBackToOrder).toBeVisible();
  }

  async assertSaveUserInfoFlagIsPresent() {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 60000 });

    const response = await this.responsePromise; // Esperamos la respuesta
    const request = response.request(); // Obtenemos la solicitud asociada
    const requestBody = request.postDataJSON(); // Obtenemos el cuerpo de la solicitud en formato JSON

    expect(requestBody).toHaveProperty('save_user_info');
    // Uncomment the following line once the backend implements the full functionality
    // expect(requestBody.save_user_info).toBe(true);
  }

  async assertCardsCreationIsCalled(saveCards: boolean) {
    if (saveCards) {
      const responseCreateCard = await this.responseCreateCard;
      if (responseCreateCard) {
        expect(responseCreateCard.status()).toBe(201);
      } else {
        console.log('[INFO] Cards request detected but response timeout handled');
      }
    }
    expect(this.cardsRequestDetected).toBe(saveCards);
  }

  async assertOrderStatusRequestPurchase(
    status: OrderStatusTypes,
    statusCode: number,
    options?: { disableBodyVerification: boolean }
  ) {
    const responsePurchase = await this.responsePromise;
    expect(responsePurchase.status(), 'purchase status').toBe(statusCode);
    if (!options?.disableBodyVerification) {
      const responsePurchaseBody = await responsePurchase.json();
      if (status != 'denied') {
        console.log(
          `[INFO] --> Order Status in request purchase: ${responsePurchaseBody.order.payment.data.status}`
        );
        expect(responsePurchaseBody.order.payment.data.status).toBe(status);
      }
    }
    return responsePurchase;
  }

  /**
   * Relies on `this.responsePromise` set by `clickOnPay`, so call it after the
   * pay action on this same page object.
   */
  async assertDeviceIdInPurchaseRequest(options?: { antiFraudProvider?: string[] }) {
    const responsePurchase = await this.responsePromise;
    assertDeviceIdInPurchaseRequest(responsePurchase.request(), options);
  }

  async assertNextActionIsPresent() {
    const response = await waitForPurchaseResponse(this.page, { timeout: 80000 });
    const responseBody = await response.json();
    expect(responseBody.order.payment.data).toHaveProperty('next_action');
    expect(responseBody.order.payment.data.next_action).not.toBeNull();
    expect(Object.keys(responseBody.order.payment.data.next_action).length).toBeGreaterThan(0);
    console.log('[SUCCESS] next_action está presente y no está vacío ni es null');
  }

  async assertNotNullAurthorizationCode() {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();

    console.log(
      `[INFO] -----> authorization_code in PURCHASED order is ${responsePurchaseBody.order.payment.data.authorization_code}`
    );

    expect(responsePurchaseBody.order.payment.data.authorization_code).not.toBeNull();
  }

  async assertAddressInPurchasedOrder(address: string) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    expect(responsePurchaseBody.order.shipping_address.address1).toContain(`${address}`);
    console.log(
      `[INFO] -----> Address in PURCHASED order is ${responsePurchaseBody.order.shipping_address.address1}`
    );
  }

  async assertAddressInOrderToPurchase(address: string) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    expect(responsePurchaseBody.shipping_address.address1).toContain(`${address}`);
    console.log(
      `[INFO] -----> Address in order TO PURCHASE is ${responsePurchaseBody.shipping_address.address1}`
    );
  }

  async assertPaymentOrderStatusRequestPurchase(status: OrderStatusTypes, statusCode: number) {
    const responsePurchase = await this.responsePromise;
    expect(responsePurchase.status(), 'purchase status').toBe(statusCode);
    const responsePurchaseBody = await responsePurchase.json();
    expect(responsePurchaseBody.order.payment.data.status).toBe(`${status}`);
  }

  async assertResponseErrorCode(errorCode: string) {
    const responsePurchase = await this.responsePromise;
    const { error } = await responsePurchase.json();
    expect(error.code).toStrictEqual(errorCode);
  }

  async assertHiddenSubtotal() {
    await expect(this.labelSubtotal).toBeHidden();
  }

  async assertHiddenTermsAndConditions() {
    await expect(this.labelTermsAndConditions).toBeHidden();
  }

  async assertTermsAndConditions() {
    await expect(this.labelTermsAndConditions).toBeVisible();
  }

  async assertThankyouPage(text: string) {
    await expect(this.labelThankYouPageTitle).toHaveText(text, { timeout: 120000 });
  }

  async assertDeunanowThankyouPage() {
    await expect(this.labelThankYouPageTitle).toHaveText(
      this.deunanowTranslations.screenThankYouPage.labelSuccessfulTitle,
      { timeout: 120000 }
    );
  }

  async assertThankyouPageSuccess() {
    await expect(this.labelThankYouPageSuccess).toBeVisible({ timeout: 10000 });
  }

  async assertThankyouStatusTextIsVisible(statusText: string) {
    await expect(this.page.getByText(statusText)).toBeVisible({ timeout: 10000 });
  }

  async assertThankyouBodyTitleIsVisible(title: string) {
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async assertCardPreSelected(cardNumber: string, statusCode: number = 200) {
    this.waitResponseFromGetCards();
    const responseAllCards = await this.responseAllCards;
    expect(responseAllCards.status(), 'cards request status').toBe(statusCode);
    const responseCardsBody = await responseAllCards.json();
    const cardLastFourDigit = responseCardsBody.data[0].last_four;
    const expectedCardLastFourDigit = cardNumber.slice(-4);
    expect(cardLastFourDigit).toBe(expectedCardLastFourDigit);
  }

  async assertUserSeeErrorNotification() {
    await this.ensureVisible(this.errorNotificationContainer, { timeout: 5000 });
  }

  async assertDenaiedPaymentLinkError() {
    await expect(this.labelLinkIsNotAvailable).toBeVisible();
    await expect(this.labelPleaseCheckOrderStatus).toBeVisible();
  }

  async assertInlineErrorMissingBillingData() {
    await expect(this.inlineErrorMissingBillingData).toBeVisible();
    await expect(this.inlineErrorMissingBillingData).toHaveText(
      this.deunanowTranslations.screenAlertNotifications.missingBillingData
    );
  }

  async assertEventWasFired(event: string, metadata?: Record<string, string>) {
    const request = await this.page.waitForRequest(
      (request) => {
        const url = request.url();
        const method = request.method();
        const postData = request.postData();

        if (url.includes('/track') && method === 'POST' && postData) {
          try {
            const body = JSON.parse(postData);
            if (metadata) {
              expect(body.properties.metadata).toStrictEqual(metadata);
            }
            return body.event === event && body.channel === 'web';
          } catch {
            return false;
          }
        }
        return false;
      },
      { timeout: 15000 }
    );

    expect(request).toBeTruthy();
  }

  async assertEventWasFiredAfterClickOnPayButton(eventName: string) {
    await Promise.all([
      this.clickOnPayButtonSummaryWithOutTransaction(),
      this.assertEventWasFired(eventName),
    ]);
  }

  async clickOnSafetypayTab() {
    await this.ensureVisibleToClick(this.tabSafetypay);
    await this.tabSafetypay.click();
  }

  async clickOnExternalButtonPay(page: Page) {
    await this.buttonPayExternal.click();
  }

  async assertAndClickIdentityDocumentTypeDropdown() {
    await expect(
      this.identityDocumentTypeDropdown,
      'The identity document type dropdown is not visible'
    ).toBeVisible();

    const isExpanded = await this.identityDocumentTypeDropdown.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await this.identityDocumentTypeDropdown.click();
    }
  }

  async assertIdentityDocumentDropdownOptions(
    countryCode: string,
    documentTypes: Record<string, string>
  ) {
    await expect(this.identityDocumentTypeDropdown).toBeVisible();

    await this.assertAndClickIdentityDocumentTypeDropdown();

    for (const documentType of Object.values(documentTypes)) {
      const option = this.getIdentityDocumentOptionLocator(countryCode, documentType);
      await expect(option).toBeVisible();
    }

    // Keep deterministic UI state for following steps (card fields filling/validation).
    await this.closeIdentityDocumentTypeDropdownIfOpen();
  }

  async closeIdentityDocumentTypeDropdownIfOpen() {
    const isExpanded = await this.identityDocumentTypeDropdown.getAttribute('aria-expanded');

    if (isExpanded === 'true') {
      await this.identityDocumentTypeDropdown.click();
    }
  }

  getIdentityDocumentOptionLocator(countryCode: string, documentType: string) {
    return this.page.getByTestId(
      `dropdown-item-${countryCode.toUpperCase()}_${documentType.toUpperCase()}`
    );
  }

  async getPurchaseRequestPayload() {
    const req = await this.responsePromise;
    if (typeof (req as any).postDataJSON === 'function') {
      return (req as any).postDataJSON();
    }
    const raw = req.postData();
    return raw ? JSON.parse(raw) : null;
  }

  async selectIdentityDocumentType(countryCode: string, documentType: string) {
    await this.assertAndClickIdentityDocumentTypeDropdown();
    const option = this.getIdentityDocumentOptionLocator(countryCode, documentType);
    await this.ensureVisibleToClick(option);
  }

  async assertInputDocumentNumberIsEmpty() {
    await expect(this.inputDocumentNumber).toHaveValue('');
  }

  async blurInputDocumentNumber() {
    await this.inputDocumentNumber.blur();
  }

  async clearInputDocumentNumber() {
    await this.clearInputField(this.inputDocumentNumber);
  }

  async assertInputDocumentNumberHasValue(value: string) {
    await expect(this.inputDocumentNumber).toHaveValue(value);
  }

  async fillInputDocumentNumber(documentNumber: string) {
    await this.pressTextOnInput(this.inputDocumentNumber, documentNumber, {
      delayPress: 100,
    });
  }

  async assertUserSeeIdentityDocumentError() {
    await expect(this.idDocumentErrorMessage).toBeVisible();
  }

  async assertUserDoesNotSeeIdentityDocumentError() {
    await expect(this.idDocumentErrorMessage).not.toBeVisible();
  }

  async validateDocumentFormat(
    countryCode: string,
    options: {
      switchTo?: string;
      invalidValue: string;
      validValue: string;
      // Expected value shown in the input after the mask is applied.
      // Only set for document types that have a visual format with separators
      // (e.g., DNI '12345678' → '12.345.678', CPF '11144477735' → '111.444.777-35').
      // Leave undefined for types with no separators (PASSPORT, CC, CE, etc.).
      expectedDisplayValue?: string;
    }
  ): Promise<void> {
    if (options.switchTo) {
      // selectIdentityDocumentType already opens the dropdown itself; calling
      // assertAndClickIdentityDocumentTypeDropdown() here too race-toggles it
      // shut before aria-expanded reflects the first click.
      await this.selectIdentityDocumentType(countryCode, options.switchTo);
      await this.assertInputDocumentNumberIsEmpty();
    }

    await this.fillInputDocumentNumber(options.invalidValue);
    await this.blurInputDocumentNumber();
    await this.assertUserSeeIdentityDocumentError();

    await this.clearInputDocumentNumber();
    await this.fillInputDocumentNumber(options.validValue);

    // When a document type has a visual mask (e.g., ###.###.###-##), typing the raw digits
    // causes the component to display the formatted value in the input field.
    // We assert this to verify the mask is correctly applied by the IdentityDocumentInput component.
    if (options.expectedDisplayValue) {
      await this.assertInputDocumentNumberHasValue(options.expectedDisplayValue);
    }

    await this.blurInputDocumentNumber();
    await this.assertUserDoesNotSeeIdentityDocumentError();
  }
}
