import { expect, FrameLocator, Locator, Response, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { FormHelpers } from './formHelpers';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { getTranslations } from '@translations/getTranslations';
import { ClickToPayTranslations } from '@support/translations/selectors/explore/click_to_pay/clickToPayTranlations';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

interface FillUserInfoProps {
  avoidWaitingPurchase?: boolean;
}

export class ClickToPayFormPage extends FormHelpers {
  readonly page: Page;
  readonly selectors: ClickToPayTranslations;
  readonly paymentContainer: Locator;
  readonly inputPhoneNumber: Locator;
  nequiPushVerifyResponse: any;
  readonly labelPhoneVerification: Locator;
  readonly labelClickToPayDisclaimer: Locator;
  readonly labelUserOtpTitle: Locator;
  readonly labelUserDataTitle: Locator;
  readonly labelFirstNameLabel: Locator;
  readonly labelLastNameLabel: Locator;
  readonly labelPaymentsTitle: Locator;
  readonly labelCardNumberLabel: Locator;
  readonly labelCardHolderLabel: Locator;
  readonly labelExpirationDateLabel: Locator;
  readonly labelSecurityCodeLabel: Locator;
  readonly labelBillingTitle: Locator;
  readonly labelClickToPayAgreementSection: Locator;
  readonly labelProcessingYourRequest: Locator;
  readonly labelAccessToYourAccount: Locator;
  readonly labelEmail: Locator;
  readonly labelCvvRequiredMessage: Locator;
  readonly labelMissingEmail: Locator;

  readonly inputCreditCardNumber: Locator;
  readonly inputCollectEmail: Locator;
  readonly inputExpiryDate: Locator;
  readonly inputCvv: Locator;
  readonly inputHolderName: Locator;
  readonly inputOtpFirstElement: Locator;
  readonly inputStandaloneCvv: Locator;
  readonly inputOtpSecondElement: Locator;
  readonly inputOtpThirdElement: Locator;
  readonly inputOtpFourthElement: Locator;
  readonly inputOtpFifthElement: Locator;
  readonly inputOtpSixthElement: Locator;

  readonly buttonContinue: Locator;
  readonly buttonCreateAccount: Locator;
  readonly buttonExitClickToPay: Locator;
  readonly buttonConfirmGuestFlow: Locator;
  readonly buttonContinueAsGuest: Locator;
  readonly buttonSendOtpViaEmail: Locator;
  readonly buttonSendOtpViaSms: Locator;
  readonly buttonContinueToAuthFlow: Locator;
  readonly buttonContinueToClickToPayFlow: Locator;
  readonly buttonTermsAndConditionsLink: Locator;
  readonly buttonAcceptTermsAndConditions: Locator;
  readonly buttonBack: Locator;

  readonly mcUserInfoIframe: FrameLocator;
  readonly checkboxEnterAsGuest: Locator;
  readonly divMcSonicBrandContainer: Locator;
  readonly clickToPayInputFirstName: Locator;
  readonly clickToPayInputLastName: Locator;
  readonly containerAvailableCards: Locator;
  readonly labelMissingCvvError: Locator;
  readonly alertMissingTermsAndConditions: Locator;
  readonly checkboxAcceptTermsAndConditions: Locator;
  readonly iframeAuthWindow: FrameLocator;

  msSonicResponse: any;
  isSonicSdkCalled: any;
  responsePromise: any;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore/click_to_pay', languageCode);
    this.paymentContainer = page.locator('#payment_link_container');
    this.inputPhoneNumber = page.locator('#phone-selector-Número\\ de\\ celular');
    this.inputCreditCardNumber = page.locator('[data-baseweb="payment-card-input"] > input');
    this.inputExpiryDate = page.locator('[id="payment-methods-expiration-date-input"]');
    this.clickToPayInputFirstName = page.locator('input[id="first_name"]');
    this.clickToPayInputLastName = page.locator('input[id="last_name"]');
    this.inputCvv = page.locator('[id="payment-methods-cvv-input"]');
    this.inputStandaloneCvv = page.locator('input#cvv');
    this.inputCollectEmail = page.locator('input#c2p-element-email');
    this.inputHolderName = page.locator('[id="payment-methods-card-holder"]');
    this.iframeAuthWindow = this.iframeElements.frameLocator('iframe[id="authenticationWindow"]');
    this.inputOtpFirstElement = this.iframeAuthWindow.locator('input[id="verification-code-0"]');
    this.inputOtpSecondElement = this.iframeAuthWindow.locator('input[id="verification-code-1"]');
    this.inputOtpThirdElement = this.iframeAuthWindow.locator('input[id="verification-code-2"]');
    this.inputOtpFourthElement = this.iframeAuthWindow.locator('input[id="verification-code-3"]');
    this.inputOtpFifthElement = this.iframeAuthWindow.locator('input[id="verification-code-4"]');
    this.inputOtpSixthElement = this.iframeAuthWindow.locator('input[id="verification-code-5"]');

    this.buttonSendOtpViaEmail = this.iframeAuthWindow.locator(
      `button[data-test="continue-another-way"]:has-text("${this.selectors.screenAuthFlowClickToPay.labelEmailChannel}")`
    );
    this.buttonSendOtpViaSms = this.iframeAuthWindow.getByRole('button', {
      name: this.selectors.screenAuthFlowClickToPay.labelSmsChannel,
    });
    this.labelMissingCvvError = page.locator('[id="alert-container-notification-negative"]');

    this.buttonContinue = page.locator(
      `button:has-text("${this.selectors.screenStartClickToPay.continueLabel}")`
    );
    // Mastercard's otpCTAExperiment changes this button's text per traceId bucket
    // ("Continuar" vs "ACCEDER A MIS TARJETAS"); data-test is the same in every variant.
    this.buttonContinueToAuthFlow = this.iframeAuthWindow.locator(
      'button[data-test="continue-button"]'
    );
    this.buttonBack = this.iframeElements.locator('[id="get_back_button"]');
    this.buttonContinueToClickToPayFlow = this.iframeElements.locator('button#continue_button');
    this.buttonExitClickToPay = page.locator('[data-testid="arrow_back_ios"]');
    this.buttonConfirmGuestFlow = page.locator('button:has-text("Confirmar")');
    this.buttonContinueAsGuest = page.locator('button:has-text("Verificar de otra forma")');
    this.mcUserInfoIframe = page.frameLocator('#paymentWindow');
    this.mcUserInfoIframe = this.iframeElements.frameLocator('#paymentWindow');
    this.buttonCreateAccount = this.iframeElements.locator(
      'button[id="not_my_account_continue_button"]'
    );
    this.checkboxAcceptTermsAndConditions = this.iframeElements.locator(
      '#terms-conditions-checkbox'
    );
    this.buttonTermsAndConditionsLink = this.iframeElements.locator(
      'a[data-testid="terms-conditions-link"]'
    );
    this.alertMissingTermsAndConditions = this.iframeElements.locator(
      '#alert-container-notification-warning, #alert-container'
    );
    this.labelMissingEmail = this.iframeElements.getByText(
      this.selectors.screenStartClickToPay.missingEmailLabel
    );
    this.labelAccessToYourAccount = page.locator(
      `h1:has-text("${this.selectors.screenStartClickToPay.accessYourAccountClickToPay}")`
    );
    this.labelCvvRequiredMessage = page.locator(
      `p:has-text("${this.selectors.screenAuthFlowClickToPay.cvvRequiredMessage}")`
    );
    this.labelEmail = page.locator(
      `p:has-text("${this.selectors.screenStartClickToPay.emailLabel}")`
    );
    this.labelClickToPayDisclaimer = page.locator(
      `p:has-text("${this.selectors.screenStartClickToPay.disclaimerClickToPay}")`
    );

    this.labelUserOtpTitle = page.locator(
      `h1:has-text("${this.selectors.screenStartClickToPay.otpUserPageTitle}")`
    );
    this.labelUserDataTitle = page.locator(
      `h2:has-text("${this.selectors.screenNewUserDataSection.userDataTitle}")`
    );
    this.labelFirstNameLabel = page
      .locator(`label:has-text("${this.selectors.screenNewUserDataSection.firstNameLabel}")`)
      .first();
    this.labelLastNameLabel = page.locator(
      `label:has-text("${this.selectors.screenNewUserDataSection.lastNameLabel}")`
    );
    this.labelPaymentsTitle = page.locator(
      `h2:has-text("${this.selectors.screenPaymentSection.paymentsTitle}")`
    );
    this.labelCardNumberLabel = page.locator(
      `label:has-text("${this.selectors.screenPaymentSection.cardNumberLabel}")`
    );
    this.labelCardHolderLabel = page.locator(
      `label:has-text("${this.selectors.screenPaymentSection.cardHolderLabel}")`
    );
    this.labelExpirationDateLabel = page.locator(
      `label:has-text("${this.selectors.screenPaymentSection.expirationDateLabel}")`
    );
    this.labelSecurityCodeLabel = page.locator(
      `label:has-text("${this.selectors.screenPaymentSection.securityCodeLabel}")`
    );
    this.labelBillingTitle = page.locator(
      `h1:has-text("${this.selectors.screenBillingSection.billingTitle}")`
    );
    this.labelClickToPayAgreementSection = page.locator(
      `h2:has-text("${this.selectors.clickToPayAgreementSection.agreementDisclaimer}")`
    );
    this.labelProcessingYourRequest = page.getByText('Estamos procesando tu orden.');
    this.checkboxEnterAsGuest = page.locator('[data-test="radio-item-guest"]');
    this.containerAvailableCards = page.locator(
      'src-card-list[card-brands="visa,mastercard,amex"][locale="es_MX"]'
    );
    this.labelMissingCvvError = page.getByText(
      this.selectors.screenAuthFlowClickToPay.labelCvvEmptyError
    );
  }

  async assertClickToPayAuthFormIsVisible() {
    await expect(this.iframeAuthWindow.locator('div.otp-container')).toBeVisible({
      timeout: 40000,
    });
  }

  async waitForPurchaseResponse() {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 280000 });
  }

  async assertUserDataIsSendInPurchaseRequest({ name, last_name }) {
    const responsePurchase = await this.responsePromise;
    const postData = responsePurchase.request().postData();
    if (!postData) {
      throw new Error('❌ No postData found in purchase request.');
    }
    const data = JSON.parse(postData);

    const billingAddress = isV2PurchaseRequest(data)
      ? data.order?.billing_address
      : data.billing_address;

    const shippingAddress = isV2PurchaseRequest(data)
      ? data.order?.shipping_address
      : data.shipping_address;

    expect(billingAddress?.first_name).toBe(name);
    expect(billingAddress?.last_name).toBe(last_name);

    expect(shippingAddress?.first_name).toBe(name);
    expect(shippingAddress?.last_name).toBe(last_name);
  }

  async fillUserData({ name, last_name }) {
    await this.fillInputField(this.clickToPayInputFirstName, name, this.iframeElements);
    await this.fillInputField(this.clickToPayInputLastName, last_name, this.iframeElements);
  }

  async fillInputCreditCardNumber(creditCardNumber: string) {
    await this.fillInputField(this.inputCreditCardNumber, creditCardNumber, this.iframeElements);
  }

  async fillInputExpirationDate(expirationDate: string) {
    await this.fillInputField(this.inputExpiryDate, expirationDate, this.iframeElements);
  }

  async fillInputCvv(cvv: string) {
    await this.fillInputField(this.inputCvv, cvv, this.iframeElements);
  }

  async fillInputCardHolder(cardHolder: string) {
    await this.fillInputField(this.inputHolderName, cardHolder, this.iframeElements);
  }

  async fillEmail(email: string) {
    await this.clearInputField(this.inputCollectEmail, this.iframeElements);
    await this.pressTextOnInput(this.inputCollectEmail, email, {
      iframe: this.iframeElements,
    });
    const emailInput = this.getLocator(this.inputCollectEmail, this.iframeElements);
    await emailInput.blur();
  }

  async clickOnBack() {
    await expect(this.iframeElements.locator(this.buttonExitClickToPay)).toBeVisible();
    await this.iframeElements.locator(this.buttonExitClickToPay).click();
  }

  async acceptCookiePolicyIfPresent(country: string) {
    if (typeof country === 'string' && country === 'BR') {
      console.log('Country is BR, accepting cookie policy');
      // Verificar si hay múltiples modales visibles
      const allModals = this.page.locator('div[role="dialog"], div[role="alertdialog"]');
      const count = await allModals.count();
      for (let i = 0; i < count; i++) {
        const modal = allModals.nth(i);
        if (await modal.isVisible()) {
          const modalText = await modal.textContent();
          if (modalText?.includes('Cookies') || modalText?.includes('Cookie')) {
            // Este es el modal de cookies
            await modal.locator('#onetrust-accept-btn-handler').click();
            break;
          }
        }
      }
    }
  }
  async widgetIsVisible() {
    return this.iframeElements.locator(this.paymentContainer).isVisible();
  }

  async waitForValidationRequest() {
    this.page.waitForResponse((response) => {
      const url = response.url();
      return url.includes('/api/identities/validation');
    });
  }

  async widgetIsNotVisible() {
    return this.iframeElements.locator(this.paymentContainer).isHidden();
  }

  async fillCardInfo(creditCardInfo: BaseCreditCard) {
    await this.fillInputCreditCardNumber(creditCardInfo.number);
    await this.fillInputExpirationDate(creditCardInfo.expiration_date);
    await this.fillInputCvv(creditCardInfo.cvv_code);
    await this.fillInputCardHolder(creditCardInfo.cardholder_name);
  }

  async fillOtp(otp: string) {
    await this.inputOtpFirstElement.isVisible();

    const otpElements = [
      this.inputOtpFirstElement,
      this.inputOtpSecondElement,
      this.inputOtpThirdElement,
      this.inputOtpFourthElement,
      this.inputOtpFifthElement,
      this.inputOtpSixthElement,
    ];

    for (let i = 0; i < otpElements.length; i++) {
      await otpElements[i].fill(otp[i]);
    }
  }

  async clickOnContinueToAuthFlow() {
    await this.buttonContinueToAuthFlow.isVisible();
    const continueButton = this.buttonContinueToAuthFlow;
    await continueButton.click();
  }

  async assertAvailableCards() {
    await this.iframeElements.locator(this.containerAvailableCards).isVisible();
  }

  async clickOnSendOtp(otpType: 'email' | 'sms') {
    if (otpType === 'email') {
      await expect(this.buttonSendOtpViaEmail).toBeVisible();
      const sendToEmail = this.buttonSendOtpViaEmail;
      await sendToEmail.click();
    } else {
      await expect(this.buttonSendOtpViaSms).toBeVisible();
      const sendToSms = this.buttonSendOtpViaSms;
      await sendToSms.click();
    }
  }

  async clickOnBackButton() {
    await this.buttonBack.click();
  }

  async clickOnContinueToClickToPayFlow() {
    await this.buttonContinueToClickToPayFlow.isVisible();
    const continueButton = this.buttonContinueToClickToPayFlow;
    await continueButton.click();
  }

  async assertCvvRequiredMessage() {
    await this.iframeElements.locator(this.labelCvvRequiredMessage).isVisible();
    await this.iframeElements.locator(this.labelMissingCvvError).isVisible();
  }

  async fillCvv(cvv: string) {
    await this.fillInputCvv(cvv);
  }

  async fillStandaloneCvv(cvv: string) {
    await this.pressTextOnInput(this.inputStandaloneCvv, cvv, {
      iframe: this.iframeElements,
    });
  }

  async clickOnContinue() {
    await this.iframeElements.locator(this.buttonContinue).click();
  }

  async attemptToContinue(options?: {
    withoutEmail?: boolean;
    withoutTermsAndConditions?: boolean;
  }) {
    await this.ensureVisibleToClick(this.buttonCreateAccount);
    if (options?.withoutEmail) {
      await this.showErrorMessageForMissingEmail();
    }
    if (options?.withoutTermsAndConditions) {
      await this.showAlertForMissingTermsAndConditions();
    }
  }

  async showErrorMessageForMissingEmail() {
    await this.ensureVisible(this.labelMissingEmail, {
      errorMessage: 'The alert for missing email is not visible',
    });
  }

  async showAlertForMissingTermsAndConditions() {
    await this.ensureVisible(this.alertMissingTermsAndConditions, {
      errorMessage: 'The alert for missing terms and conditions is not visible',
    });
  }

  async opensTermsConditionsPage(urlLink: string) {
    const termsLink = this.buttonTermsAndConditionsLink;

    const href = await termsLink.getAttribute('href');

    expect(href).toContain(urlLink);

    const hasTarget = await termsLink.getAttribute('target');

    if (hasTarget === '_blank') {
      await this.page
        .context()
        .route(`**${urlLink}**`, (route) => route.fulfill({ status: 200, body: '' }));
      const [newPage] = await Promise.all([
        this.page.context().waitForEvent('page', { timeout: 10000 }),
        termsLink.click(),
      ]);
      await newPage.waitForLoadState();
      expect(newPage.url()).toContain(urlLink);
      await newPage.close();
    } else {
      await Promise.all([
        this.page.waitForURL((url) => url.toString().includes(urlLink), { timeout: 10000 }),
        termsLink.click(),
      ]);
    }
  }

  async clickOnAcceptTermsAndConditions() {
    await this.ensureVisible(this.checkboxAcceptTermsAndConditions, {
      errorMessage: 'The checkbox for accepting terms and conditions is not visible',
    });
    await this.checkboxAcceptTermsAndConditions.click();
  }

  async fillUserInfo(props?: FillUserInfoProps) {
    if (!props?.avoidWaitingPurchase) {
      await this.waitForPurchaseResponse();
    }
    await this.mcUserInfoIframe
      .locator('input#phoneNumber')
      .fill(`32${Math.floor(10000000 + Math.random() * 90000000)}`);
    await this.mcUserInfoIframe.locator('button:has-text("Continuar")').click();

    await this.mcUserInfoIframe
      .locator(this.buttonContinueAsGuest)
      .waitFor({ timeout: 4000, state: 'attached' })
      .catch(() => null);

    const continueAsGuestVisible = await this.mcUserInfoIframe
      .locator(this.buttonContinueAsGuest)
      .isVisible()
      .catch(() => false);

    if (continueAsGuestVisible) {
      console.log('Guest flow detected, continuing as guest...');
      await this.clickInContinueAsGuest();
      await this.clickInEnterAsGuest();
      await this.clickInContinueAndConfirmsGuestFlow();
    } else {
      console.log('Guest flow skipped, likely redirected to thank you page.');
    }
  }

  async waitResponseFromSaveCard() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/cards') &&
        response.url().includes('deuna') &&
        response.request().method() === 'POST',
      {
        timeout: 30000,
      }
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

  async fillMastercardUserInfo() {
    await this.fillUserInfo();
  }

  async clickInContinueAsGuest() {
    await this.mcUserInfoIframe.locator(this.buttonContinueAsGuest).click();
  }

  async clickInEnterAsGuest() {
    await this.mcUserInfoIframe.locator(this.checkboxEnterAsGuest).click();
  }

  async clickInContinueAndConfirmsGuestFlow() {
    await this.mcUserInfoIframe.locator(this.buttonContinue).click();
    await this.mcUserInfoIframe.locator(this.buttonConfirmGuestFlow).click();
  }

  async assertCollectEmailHeadings() {
    await expect(this.iframeElements.locator(this.labelAccessToYourAccount)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelEmail)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelClickToPayDisclaimer)).toBeVisible();
  }

  async assertUserDataHeadings() {
    await expect(this.iframeElements.locator(this.labelUserDataTitle)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelFirstNameLabel)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelLastNameLabel)).toBeVisible();
  }

  async assertPaymentsHeadings() {
    await expect(this.iframeElements.locator(this.labelPaymentsTitle)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelCardNumberLabel)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelCardHolderLabel)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelExpirationDateLabel)).toBeVisible();
    await expect(this.iframeElements.locator(this.labelSecurityCodeLabel)).toBeVisible();
  }

  async assertMastercardHasProperLocaleText(locale: string) {
    await expect(this.mcUserInfoIframe.locator(`[data-test="country-text"]`)).toHaveText(locale);
  }

  async assertBillingHeadings() {
    await expect(this.iframeElements.locator(this.labelBillingTitle)).toBeVisible();
  }

  async assertClickToPayAgreementSection() {
    await expect(this.iframeElements.locator(this.labelClickToPayAgreementSection)).toBeVisible();
  }

  async assertUserOtpTitle() {
    await expect(this.iframeElements.locator(this.labelUserOtpTitle)).toBeVisible();
  }

  async saveMastercardUserInfo() {
    await this.buttonContinue.click();
  }

  async WaitForSonicSdkCalled(timeout = 15000) {
    try {
      await this.page.waitForRequest('**/mc-sonic.min.js', { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async assertProcessingPage() {
    await expect(this.iframeElements.locator(this.labelProcessingYourRequest)).toBeVisible();
  }
  async assertUserSeesMastercardSonicBrand() {
    const sonicCalled = await this.WaitForSonicSdkCalled();
    expect(sonicCalled).toBeTruthy();
  }
}
