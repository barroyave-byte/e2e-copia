import { FrameLocator, Locator, Page, Response, expect } from '@playwright/test';

import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { TextPaymentMethods } from '@support/interfaces/textsPaymentsMethodsUITypes';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';
import { getTransactionLogsByTransactionID } from '@support/request_helper/requestUtil';
import { getTranslations } from '@translations/getTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';

import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

import { CommonsActions } from '@pages/commonActions';
import { DEFAULT_DOCUMENT_BY_COUNTRY } from '@support/constants/identityDocuments';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import {
  PURCHASE_URL_PATTERN,
  PurchaseRequest,
  isV2PurchaseRequest,
} from '@support/utils/purchase-contracts';
import { PurchasePayloadAsserter } from '@support/utils/PurchasePayloadAsserter';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';

interface FillBillingFormParams {
  customExpected?: () => Promise<void>;
  country?: string;
  state?: string;
  department?: string;
  address?: string;
  zipCode?: string;
  firstName?: string;
  lastName?: string;
}

// types.ts
export interface LabelConfig {
  [field: string]: string;
}

export const labelsConfig: Partial<Record<CountryCodes, LabelConfig>> = {
  MX: {
    state: 'Estado *',
    city: 'Ciudad/Municipio *',
    zipCode: 'Código Postal (CP)',
  },
  CO: {
    state: 'Departamento *',
    phone: 'Teléfono/Celular *',
    zipCode: 'Código postal *',
  },
};

export const droppdownCountryConfig: Partial<Record<CountryCodes, string>> = {
  MX: 'dropdown-item-MX',
  CO: 'dropdown-item-CO',
  AR: 'dropdown-item-AR',
};

export const droppdownStateFallbackConfig: Partial<Record<CountryCodes, string>> = {
  AR: getTranslations('checkout', 'ES').billingFormSelectors.labelInputCityAR,
};

// Legacy widget only exposes the long bilingual phone-country label
// ("Mexico (México)"); it has no stable id/testid to key off of. Maps that
// legacy label to its country code so selectPhoneCountry can also try the
// Tailwind dropdown's stable #dropdown-item-{CODE} testid.
const phoneCountryNameToCode: Partial<Record<string, CountryCodes>> = {
  'Mexico (México)': 'MX',
};

export class PaymentPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: CheckoutTranslations;
  readonly deunaNowTranslations: DeunanowTranslations;
  readonly iframeZoidVisible: FrameLocator;
  readonly iframeSecondaryZoidVisible: FrameLocator;
  readonly buttonPay: Locator;
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
  readonly buttonSeeAllMyCards: Locator;
  readonly inputEnterCoupon: Locator;
  readonly buttonDeleteCoupon: Locator;
  readonly imageOTPDiners: Locator;
  readonly labelDescriptionOTPDiners: Locator;
  readonly inputOTPDiners: Locator;
  readonly imageMapsAddress: Locator;
  readonly buttonGoBackToOrder: Locator;
  readonly inputCodeOtpDiners2: Locator;
  readonly labelWrongOtpMessage: Locator;
  readonly optionAddCreditCard: Locator;
  readonly inputCardCvvRegistered: Locator;
  readonly cardNumberError: Locator;
  readonly returnButtonErrorPurchase: Locator;
  readonly alertNotification: Locator;
  readonly alertInfoNotification: Locator;
  readonly alertErrorNotification: Locator;
  readonly alertNotificationText: Locator;
  readonly alertInfoNotificationText: Locator;
  readonly alertErrorNotificationText: Locator;
  readonly paymentLinkContainer: Locator;
  readonly cancelButton: Locator;
  readonly tabCash: Locator;
  readonly tabPayPal: Locator;
  readonly tabSTPCodi: Locator;
  readonly selectBank: Locator;
  readonly inputCardCVVCVC: Locator;
  readonly sectionPayPalInfo: Locator;
  readonly sectionPayPalAccounts: Locator;
  readonly buttonPayPal: Locator;
  readonly buttonCancelPayPal: Locator;
  readonly labelProcessingModalTitle: Locator;
  readonly labelPayPalRedirectTitle: Locator;
  readonly labelPayPalRedirectSubtitle: Locator;
  readonly selectInstallmentsButton: Locator;
  readonly selectInstallmentsOption: Locator;
  readonly buttonPayWithAnotherAccountPayPal: Locator;
  readonly buttonAddBillingData: Locator;
  readonly buttonUpdateBillingData: Locator;
  readonly inputBillingFormCountry: Locator;
  readonly inputBillingFormState: Locator;
  readonly inputBillingFormStateCity: Locator;
  readonly buttonBillingFormSave: Locator;
  readonly inputBillingFormEmail: Locator;
  readonly inputBillingFormFirstName: Locator;
  readonly inputBillingFormLastName: Locator;
  readonly inputBillingAddress: Locator;
  readonly inputBillingFormZipCode: Locator;
  readonly inputBillingFormPhoneRequired: Locator;
  readonly selectDropdownStateCity: Locator;
  readonly selectOptionDropdownStateCity: Locator;
  readonly selectDropdownCountry: Locator;
  readonly selectDropdownStateName: Locator;
  readonly selectOptionDropdownStateName: Locator;
  readonly dropdownArrowIcon: Locator;
  readonly labelAddressMXError: Locator;
  readonly labelFirstNameCustom: Locator;
  readonly labelZipCodeError: Locator;
  readonly inputBillingFormPhone: Locator;
  readonly selectPhoneCountryDropdown: Locator;
  readonly inputPhoneSelector: Locator;
  readonly imageApmRedirectPaymentIcon: Locator;
  readonly buttonPaypalSpb: Locator;
  readonly labelProcessingViewTitle: Locator;
  readonly labelLocators: Map<string, Locator>;
  readonly selectDropdownCountryOptions: Map<string, Locator>;
  readonly selectOptionDropdownFallbackStates: Map<string, Locator>;
  readonly buttonBillingCancelButton: Locator;
  readonly labelBillingTitle: Locator;
  readonly selectDropdownCity: Locator;
  readonly selectOptionDropdownStateCityFallback: Locator;
  readonly customInputBillingFormStateCity: Locator;
  readonly safetyPayTab: Locator;
  readonly tabFemsaOxxo: Locator;
  readonly spinnerBasePayPalRedirect: Locator;
  readonly progressBarBasePayPalRedirect: Locator;
  readonly tabFintoc: Locator;
  requestPromise: any;
  responsePromise: any;
  purchaseRequestBody: PurchaseRequest;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.purchaseRequestBody = {} as PurchaseRequest;
    this.selectors = getTranslations('checkout', languageCode);
    this.deunaNowTranslations = getTranslations('deunanow', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.iframeSecondaryZoidVisible = page
      .locator('[data-testid="d_una_checkout"]')
      .nth(1)
      .contentFrame();

    // Localizadores generales
    this.labelProcessingModalTitle = this.page.getByRole('dialog').locator('h1');
    this.labelPayPalRedirectTitle = this.page.getByTestId('paypal-redirect-title');
    this.labelPayPalRedirectSubtitle = this.page.getByTestId('paypal-redirect-subtitle');
    this.selectInstallmentsButton = this.page.getByTestId('installments_dropdown');
    this.selectInstallmentsOption = this.page
      .locator('#dropdown-content-installments_dropdown')
      .nth(0);
    this.buttonPayWithAnotherAccountPayPal = this.page.getByTestId(
      'paypal-pay-with-another-account'
    );
    this.alertNotification = this.page.locator(
      '#alert-container-notification-warning, #alert-container'
    );
    this.alertNotificationText = this.alertNotification
      .locator('h2, [data-testid="alert-description"]')
      .last();
    this.alertInfoNotification = this.page.locator(
      '#alert-container-notification-info, #alert-container'
    );
    this.alertInfoNotificationText = this.alertInfoNotification
      .locator('h2, [data-testid="alert-description"]')
      .last();
    this.alertErrorNotification = this.page.locator(
      '#alert-container-notification-negative, #alert-container'
    );
    this.alertErrorNotificationText = this.alertErrorNotification
      .locator('h2, [data-testid="alert-description"]')
      .last();
    this.buttonPay = this.page.locator('#payment-button');

    // Localizadores asociados al iframe
    this.buttonCloseAlertError = this.iframeZoidVisible.locator(
      "[title='Close'], [aria-label='Cerrar alerta']"
    );
    this.selectInstallments = this.iframeZoidVisible
      .getByRole('button', {
        name: `${this.selectors.screenInstallmentsQuantityMSI.buttonInstallmentsMSI}`,
      })
      .or(
        page
          .locator('[data-testid="dropdown-input-installments"]')
          .filter({ hasText: 'Sin cuotas' })
      );
    this.inputCreditCardNumber = this.iframeZoidVisible.locator(
      '[data-baseweb="payment-card-input"] > input'
    );
    this.inputExpirationDate = this.iframeZoidVisible.locator(
      '[id="payment-methods-expiration-date-input"]'
    );
    this.inputDocumentNumber = this.iframeZoidVisible
      .locator('[id="payment-methods-identity-number"]')
      .or(this.iframeZoidVisible.locator('[data-testid="card_holder_dni-value-input"]')); // migration-or

    this.inputCardCVV = this.iframeZoidVisible.locator('[id="payment-methods-cvv-input"]');
    this.inputCardCvvRegistered = this.iframeZoidVisible.locator('#cvv-user-card-cvv-input');
    this.inputCardName = this.iframeZoidVisible.locator('#payment-methods-card-holder');
    this.labelTitleLogin = this.iframeZoidVisible.getByText('Hola QA TEST✌️');
    this.labelTitleLoginBR = this.iframeZoidVisible.getByText('Olá QA TEST✌️');
    this.labelDescriptionLogin = this.iframeZoidVisible.getByText(
      this.selectors.loginFormSelectors.labelReviewYourAddressAndPaymentBeforeBuying
    );
    this.labelDescriptionLoginBR = this.iframeZoidVisible.getByText(
      'Certifique-se de verificar seu endereço e forma de pagamento antes de comprar.'
    );
    this.labelMessageOrderFailed = this.iframeZoidVisible.getByText(
      this.deunaNowTranslations.screenAlertNotifications.purchaseError
    );
    this.labelContinueButtonError = this.iframeZoidVisible.getByText(
      this.selectors.cardSelectors.continueButtonError
    );
    this.labelCVVError = this.iframeZoidVisible.getByText(this.selectors.cardSelectors.cvvError);
    this.buttonSeeAllMyCards = this.iframeZoidVisible.getByText(
      this.selectors.cardSelectors.buttonSeeAllMyCards
    );
    this.inputEnterCoupon = this.iframeZoidVisible.locator('[name="coupon"]');
    this.buttonDeleteCoupon = this.iframeZoidVisible.locator('svg[title="Delete"]');
    this.imageOTPDiners = this.iframeZoidVisible.locator('img[src*="diners_club.png"]');
    this.labelDescriptionOTPDiners = this.iframeZoidVisible.getByText(
      this.selectors.otpDinersSelectors.descriptionOTPDiners
    );
    this.inputOTPDiners = this.iframeZoidVisible.locator('[autocomplete="one-time-code"]');
    this.imageMapsAddress = this.iframeZoidVisible.locator('[alt="Map Image"]');
    this.buttonGoBackToOrder = this.iframeZoidVisible.locator(
      `button:has-text("${this.selectors.otpDinersSelectors.buttonGoBackToOrder}")`
    );
    this.cardNumberError = this.iframeZoidVisible.locator(
      `div[data-baseweb="form-control-caption"]:has-text("${this.selectors.cardSelectors.cardNumberError}")`
    );
    this.inputCodeOtpDiners2 = this.iframeZoidVisible.locator('#otp-input-0');
    this.labelWrongOtpMessage = this.iframeZoidVisible.getByText(
      this.selectors.otpDinersSelectors.wrongOtpMessage
    );
    this.optionAddCreditCard = this.iframeZoidVisible
      .locator('div')
      .filter({ hasText: /^Agregar una tarjeta$/ })
      .first();
    this.returnButtonErrorPurchase = this.iframeZoidVisible.getByRole('button', { name: 'Volver' });

    this.paymentLinkContainer = this.iframeZoidVisible.locator('#payment_link_container');
    this.cancelButton = this.iframeZoidVisible.getByTestId('changeMethod-button');
    this.tabCash = this.iframeZoidVisible
      .locator('[id="tab-cash:cash"]')
      .or(this.iframeZoidVisible.locator('[datatestid="tab-cash:cash"]')); // migration-or
    this.safetyPayTab = this.iframeZoidVisible
      .locator('[id="tab-bank_transfer:safetypay"]')
      .or(this.iframeZoidVisible.locator('[datatestid="tab-bank_transfer:safetypay"]'))
      .or(this.iframeZoidVisible.locator('[id="tab-voucher:safetypay"]'))
      .or(this.iframeZoidVisible.locator('[datatestid="tab-voucher:safetypay"]')); // migration-or
    this.tabPayPal = this.iframeZoidVisible
      .locator('[id="tab-wallet:paypal_wallet"]')
      .or(this.iframeZoidVisible.locator('[datatestid="tab-wallet:paypal_wallet"]')); // migration-or
    this.tabSTPCodi = this.iframeZoidVisible
      .locator('[id="tab-bank_transfer:stp_codi"]')
      .or(this.iframeZoidVisible.locator('[datatestid="tab-bank_transfer:stp_codi"]')); // migration-or
    this.tabFemsaOxxo = this.iframeZoidVisible
      .locator('[id="tab-voucher:femsa_oxxo_cash"]')
      .or(this.iframeZoidVisible.locator('[datatestid="tab-voucher:femsa_oxxo_cash"]')); // migration-or
    this.tabFintoc = this.iframeZoidVisible
      .locator('[datatestid="tab-bank_transfer:fintoc"]')
      .or(this.iframeZoidVisible.locator('[data-testid="tab-bank_transfer:fintoc"]'))
      .or(this.iframeZoidVisible.locator('[data-testid="tab-fintoc"]'))
      .or(this.iframeZoidVisible.getByText('fintoc', { exact: false })); // migration-or
    this.selectBank = this.iframeZoidVisible.getByRole('button', {
      name: 'Seleccione un banco Down',
    });
    this.inputCardCVVCVC = this.iframeZoidVisible.getByPlaceholder('CVV');
    this.sectionPayPalInfo = this.iframeZoidVisible.getByTestId('paypal-info-container');
    this.sectionPayPalAccounts = this.iframeZoidVisible.getByTestId('paypal-accounts-container');
    this.buttonPayPal = this.iframeZoidVisible.getByTestId('button-pay-paypal');
    this.buttonCancelPayPal = this.iframeZoidVisible.getByTestId('button-cancel-paypal');

    this.buttonAddBillingData = this.iframeZoidVisible.locator('#btn-add-billing-data');
    this.buttonUpdateBillingData = this.iframeZoidVisible.locator(
      '[data-testid="btn-update-billing-data"]'
    );
    this.inputBillingFormCountry = this.iframeZoidVisible.locator('#input-billing-country');
    this.inputBillingFormState = this.iframeZoidVisible.locator('#input-billing-state');
    this.customInputBillingFormStateCity = this.iframeZoidVisible.locator('#input-billing-city');
    this.inputBillingFormStateCity = this.iframeZoidVisible.locator('#city');
    this.buttonBillingFormSave = this.iframeZoidVisible.locator('button:has-text("Guardar")');
    this.inputBillingFormEmail = this.iframeZoidVisible.locator('#input-billing-email');
    this.inputBillingFormFirstName = this.iframeZoidVisible.locator('#input-billing-first-name');
    this.inputBillingFormLastName = this.iframeZoidVisible.locator('#input-billing-last-name');
    this.inputBillingAddress = this.iframeZoidVisible.locator('#input-billing-address1');
    this.inputBillingFormZipCode = this.iframeZoidVisible.locator('#input-billing-zipcode');
    this.inputBillingFormPhoneRequired = this.iframeZoidVisible
      .locator('#phone-selector-Teléfono *')
      .or(this.iframeZoidVisible.locator('[data-testid="input-billing-phone-value-input"]')); // migration-or
    this.buttonBillingCancelButton = this.iframeZoidVisible.getByText(
      this.selectors.billingFormSelectors.labelBillingCancelButton
    );
    this.labelBillingTitle = this.iframeZoidVisible.getByText(
      this.selectors.billingFormSelectors.labelBillingTitle
    );

    this.selectDropdownCity = this.iframeZoidVisible
      .locator('[data-testid="dropdown-input-city"] #dropdown-search-input')
      .or(
        this.iframeZoidVisible.locator('[data-testid="dropdown-input-city"] input[role="combobox"]')
      );

    this.selectDropdownStateCity = this.iframeZoidVisible.locator('#city');
    this.selectOptionDropdownStateCity = this.selectDropdownStateCity
      .locator('[data-testid^="dropdown-item"]')
      .nth(1)
      .or(
        this.iframeZoidVisible
          .locator('#dropdown-content-city')
          .locator('[data-testid^="dropdown-item"]')
          .nth(1)
      ); // migration-or

    this.selectOptionDropdownStateCityFallback = this.selectDropdownStateCity
      .locator('[data-testid^="dropdown-item"]')
      .nth(0)
      .or(
        this.iframeZoidVisible
          .locator('#dropdown-content-city')
          .locator('[data-testid^="dropdown-item"]')
          .nth(0)
      ); // migration-or

    this.selectDropdownStateName = this.iframeZoidVisible.locator('#dropdown-billing-state');
    this.selectOptionDropdownStateName = this.selectDropdownStateName
      .locator('[data-testid^="dropdown-item"]')
      .nth(1)
      .or(
        this.iframeZoidVisible
          .locator('#dropdown-content-dropdown-billing-state')
          .locator('[data-testid^="dropdown-item"]')
          .nth(1)
      ); // migration-or

    this.dropdownArrowIcon = this.selectDropdownStateName
      .locator('svg')
      .or(
        this.iframeZoidVisible.locator('[data-testid="dropdown-chevron-dropdown-billing-state"]')
      ); // migration-or

    this.selectDropdownCountry = this.iframeZoidVisible.locator('#custom-select-dropdown');

    this.labelFirstNameCustom = this.iframeZoidVisible.getByText('Primer nombre (opcional)');
    this.labelAddressMXError = this.iframeZoidVisible.getByText(
      this.selectors.billingFormSelectors.labelInputErrorText
    );
    this.labelZipCodeError = this.iframeZoidVisible.getByText(
      this.selectors.billingFormSelectors.labelZipCodeErrorText
    );

    this.inputBillingFormPhone = this.iframeZoidVisible
      .locator('[aria-label="Please enter a phone number without the country dial code."]')
      .or(this.iframeZoidVisible.locator('[data-testid="input-billing-phone-value-input"]')); // migration-or

    this.selectPhoneCountryDropdown = this.iframeZoidVisible
      .locator('[data-baseweb="phone-input"] [data-baseweb="select"]')
      .or(this.iframeZoidVisible.locator('[data-testid="dropdown-input-phone"]')); // migration-or
    this.inputPhoneSelector = this.iframeZoidVisible
      .locator('[id*="phone-selector"]')
      .or(this.iframeZoidVisible.locator('[data-testid="phone-value-input"]')); // migration-or

    this.imageApmRedirectPaymentIcon = this.iframeZoidVisible.getByTestId(
      'apm-redirect-payment-icon'
    );
    this.spinnerBasePayPalRedirect = this.iframeZoidVisible.getByTestId('base-spinner');
    this.progressBarBasePayPalRedirect = this.iframeZoidVisible.getByTestId('progress-bar-base');
    this.buttonPaypalSpb = this.iframeZoidVisible.getByTestId('paypal-spb-button');
    this.labelProcessingViewTitle = this.iframeZoidVisible.getByText(
      this.selectors.screenPaymentProcessing.labelProcessingOrder
    );

    this.labelLocators = new Map();

    this.selectDropdownCountryOptions = new Map();
    for (const [country, text] of Object.entries(droppdownCountryConfig)) {
      this.selectDropdownCountryOptions.set(
        country,
        this.selectDropdownCountry
          .getByTestId(text as string)
          .or(
            this.iframeZoidVisible
              .locator('#dropdown-content-custom-select-dropdown')
              .getByTestId(text as string)
          )
      ); // migration-or
    }

    this.selectOptionDropdownFallbackStates = new Map();
    for (const [country, text] of Object.entries(droppdownStateFallbackConfig)) {
      this.selectOptionDropdownFallbackStates.set(
        country,
        this.selectDropdownStateName
          .getByText(text as string)
          .or(
            this.iframeZoidVisible
              .locator('#dropdown-content-dropdown-billing-state')
              .getByText(text as string)
          )
      ); // migration-or
    }

    this.page.on('request', (request) => {
      if (PURCHASE_URL_PATTERN.test(request.url())) {
        this.purchaseRequestBody = request.postDataJSON();
      }
    });
  }

  /**
   *
   * @deprecated Esta función está obsoleta y será eliminada en futuras versiones.
   * Usa `newFunction` en su lugar.
   */
  async selectPaymentMethod(paymentMethod: TextPaymentMethods) {
    const locatorPaymentMethod = this.iframeZoidVisible.locator(`p:has-text("${paymentMethod}")`);
    expect(locatorPaymentMethod, 'Payment method is not visible').toBeVisible();
    await locatorPaymentMethod.click();
  }

  async showBillingForm() {
    if (await this.isVisibleWithTimeout(this.buttonUpdateBillingData, undefined, 5000)) {
      await this.ensureVisibleToClick(this.buttonUpdateBillingData);
    } else {
      await this.ensureVisibleToClick(this.buttonAddBillingData);
    }
  }

  async showBillingFormIFrame() {
    if (await this.isVisibleWithTimeout(this.buttonAddBillingData, undefined, 5000)) {
      await this.ensureVisibleToClick(this.buttonAddBillingData);
    } else {
      await this.ensureVisibleToClick(this.buttonUpdateBillingData);
    }
  }

  async clickBillingCancelButton() {
    await this.ensureVisibleToClick(this.buttonBillingCancelButton);
  }

  async fillBillingFormWithCustomTypeFields(options?: FillBillingFormParams) {
    await this.inputBillingFormCountry.fill(options?.country ?? '');
    await this.inputBillingFormState.fill(options?.state ?? '');
    await this.customInputBillingFormStateCity.fill(options?.department ?? '');
    await this.buttonBillingFormSave.click();
  }

  async fillNameAndAddress(options?: FillBillingFormParams) {
    await this.ensureVisibleToClick(this.inputBillingFormFirstName);
    await this.inputBillingFormFirstName.fill(options?.firstName ?? '');
    await this.ensureVisibleToClick(this.inputBillingFormLastName);
    await this.inputBillingFormLastName.fill(options?.lastName ?? '');
    await this.ensureVisibleToClick(this.inputBillingAddress);
    await this.inputBillingAddress.fill(options?.address ?? '');
  }

  async fillBillingFormWithCustomValidation() {
    await this.ensureVisibleToClick(this.selectDropdownStateName);
    await this.ensureVisibleToClick(this.selectOptionDropdownStateName);

    await this.ensureVisibleToClick(this.selectDropdownStateCity);
    await this.ensureVisibleToClick(this.selectOptionDropdownStateCity);

    await this.buttonBillingFormSave.click();
  }

  async fillBillingFormWithFallbackOption(country: string) {
    await this.ensureVisibleToClick(this.selectDropdownStateName);
    await this.ensureVisibleToClick(this.selectOptionDropdownFallbackStates.get(country));
    await this.ensureVisibleToClick(this.selectDropdownStateCity);
    await this.ensureVisibleToClick(
      this.selectOptionDropdownStateCityFallback,
      undefined,
      undefined,
      {
        timeout: 1000,
      }
    );

    await this.buttonBillingFormSave.click();
  }

  async fillCountryBillingForm(save: boolean = true) {
    await this.ensureVisibleToClick(this.selectDropdownStateName);
    await this.ensureVisibleToClick(this.selectOptionDropdownStateName);
    await this.ensureVisibleToClick(this.selectDropdownStateCity);
    await this.ensureVisibleToClick(this.selectOptionDropdownStateCity);
    if (save) {
      await this.ensureVisibleToClick(this.buttonBillingFormSave);
    }
  }

  async fillCountryBillingFormSequentially() {
    await this.ensureVisibleToClick(this.selectDropdownStateName);
    await this.ensureVisibleToClick(this.selectOptionDropdownStateName);
    await this.ensureVisibleToClick(this.selectDropdownStateCity);
  }

  async fillAddressAndZipcode(values: FillBillingFormParams) {
    await this.inputBillingAddress.fill(values.address ?? '');
    await this.inputBillingFormZipCode.fill(values.zipCode ?? '');

    await this.buttonBillingFormSave.click();
  }

  async fillPhone(phone: string) {
    await this.inputBillingFormPhoneRequired.fill(phone);
  }

  async changeCountry(country: CountryCodes) {
    await this.selectDropdownCountry.click();
    await this.selectDropdownCountryOptions.get(country)?.click();
  }

  async fillMXZipcode() {
    await this.inputBillingFormZipCode.fill('78136');
  }

  async clickSaveButton() {
    await this.buttonBillingFormSave.click();
  }

  async assertBillingTitleExist() {
    expect(this.labelBillingTitle).toBeVisible();
  }

  async fillCreditCardDataWithBase(creditCardData: BaseCreditCard, opts?: { country?: string }) {
    await this.scrollThis(0, 200);
    await this.page.waitForTimeout(1000);
    expect(this.inputCreditCardNumber, 'Credit card input is not visible').toBeVisible({
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

  async fillPhoneBilling(phone: string) {
    await this.inputBillingFormPhone.fill(phone);
  }

  async clickOnPayButton(withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const buttonPayLocator = iframe.locator(this.buttonPay);
    await this.ensureVisibleToClick(buttonPayLocator);
  }

  async clickOnPay(
    customMockFunction?: ((params: any) => Promise<void>) | null,
    withPurchaseData = true,
    withSecondaryFrame = false
  ) {
    if (withPurchaseData) {
      this.requestPromise = this.page.waitForRequest(PURCHASE_URL_PATTERN, {
        timeout: 380000,
      });
      this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 380000 });
    }

    await this.scrollThis(0, 200);
    await this.mockHolderNameCreditCard();
    if (customMockFunction !== undefined && customMockFunction !== null) {
      await customMockFunction(this);
    }

    await this.clickOnPayButton(withSecondaryFrame);

    if (withPurchaseData) {
      await this.page.waitForTimeout(1000);
      const [requestPurchase, responsePurchase] = await Promise.all([
        this.requestPromise,
        this.responsePromise,
      ]);
      const [requestPayload, responseData] = await Promise.all([
        requestPurchase.postData(),
        responsePurchase.json(),
      ]);

      return {
        requestPayload: JSON.parse(requestPayload),
        responseData,
      };
    }
  }

  async assertCardNumberErrorShown() {
    await expect(this.cardNumberError).toBeVisible();
  }

  async mockHolderNameCreditCard() {
    await this.page.route(PURCHASE_URL_PATTERN, (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postData = JSON.parse(request.postData() ?? '{}');

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
    const locatorInstallments = this.iframeZoidVisible.locator(
      `text=/^${installments} ${this.selectors.screenInstallmentsQuantityMSI.labelInstallmentsMSI}/`
    );
    await this.ensureVisibleToClick(
      locatorInstallments,
      undefined, // Eliminar referencia explícita al iframe
      `The option ${installments} months is not visible`
    );
  }

  async selectAndFillCvvCreditCard(lastFourDigits: string, cvvCode: string) {
    await this.iframeZoidVisible.locator(`p:has-text("${lastFourDigits}")`).click();
    await this.inputCardCvvRegistered.fill(cvvCode);
  }

  async fillCvvCode(cvvCode: string) {
    await this.inputCardCVVCVC.fill(cvvCode);
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
    // Clear all inputs filled
    await this.inputCreditCardNumber.clear({ timeout: 5000 });
    await this.inputExpirationDate.clear({ timeout: 5000 });
    await this.inputCardCVV.clear({ timeout: 5000 });
    await this.inputCardName.clear({ timeout: 5000 });
    await this.inputDocumentNumber.clear({ timeout: 5000 });
  }

  async clearAndFillCreditCard(creditCardData: BaseCreditCard, opts?: { country?: string }) {
    await this.clearInputsCreditCard();
    await this.fillCreditCardDataWithBase(creditCardData, opts);
  }

  async scrollThis(horizontal: number, vertical: number) {
    await this.page.mouse.wheel(horizontal, vertical);
  }

  async clickOnSeeAllMyCards() {
    await this.buttonSeeAllMyCards.click();
  }

  async clickOnTestCard(cardNumber: string) {
    const lastFourDigits = cardNumber.slice(-4);
    await this.iframeZoidVisible.locator(`p:has-text("${lastFourDigits}")`).click();
  }

  async selectPseBank(nameBank: string) {
    await this.selectBank.click();
    await this.iframeZoidVisible
      .locator('div')
      .filter({ hasText: new RegExp(`^${nameBank}$`) })
      .click();
  }

  async selectCashTab() {
    await this.ensureVisibleToClick(this.tabCash);
  }

  async closePopupWithReturnButton() {
    await this.ensureVisibleToClick(this.returnButtonErrorPurchase);
    await expect(this.paymentLinkContainer).toBeHidden();
  }

  async cancelPurchase() {
    this.requestPromise = this.page.waitForRequest('**/v1/track');
    await this.ensureVisibleToClick(this.cancelButton);
    await expect(this.paymentLinkContainer).toBeHidden();
  }

  async clickOnPayPalTab() {
    await this.ensureVisibleToClick(this.tabPayPal);
  }

  async clickOnSafetypayTab() {
    await this.ensureVisibleToClick(this.safetyPayTab);
  }

  async clickOnSTPCodiTab() {
    await this.ensureVisibleToClick(this.tabSTPCodi);
  }

  async clickOnPixTab(processorType: 'asaas_pix' | 'nuvei_pix') {
    const pixTab = this.iframeZoidVisible
      .locator(`[id="tab-bank_transfer:${processorType}"]`)
      .or(this.iframeZoidVisible.locator(`[datatestid="tab-bank_transfer:${processorType}"]`)); // migration-or
    await this.ensureVisibleToClick(pixTab);
  }

  async clickOnFintocTab() {
    await this.ensureVisibleToClick(this.tabFintoc);
  }

  async clickOnFemsaOxxoTab() {
    await this.ensureVisibleToClick(this.tabFemsaOxxo);
  }

  async clickOnPayPalButton() {
    await this.ensureVisibleToClick(this.buttonPayPal);
  }

  async goToPayPalExperience() {
    await this.ensureVisibleToClick(this.buttonPayPal.last());
  }

  async clickOnCancelPayPalButton() {
    await this.ensureVisibleToClick(this.buttonCancelPayPal);
  }

  async selectInstallmentsPayPal(withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const installmentsButtonLocator = iframe.locator(this.selectInstallmentsButton);
    const installmentsOptionLocator = iframe.locator(this.selectInstallmentsOption);

    await this.ensureVisibleToClick(installmentsButtonLocator, undefined, undefined, {
      timeout: 120000,
    });
    await this.ensureVisibleToClick(installmentsOptionLocator);
  }

  async clickOnPayWithAnotherAccountPayPal(withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const locator = iframe.locator(this.buttonPayWithAnotherAccountPayPal);
    await this.ensureVisibleToClick(locator);
  }

  async selectPhoneCountry(country: string) {
    await this.ensureVisibleToClick(this.selectPhoneCountryDropdown);

    // Legacy widget renders <li role="option"> with the long bilingual label
    // ("Mexico (México)"), matched by text. The Tailwind dropdown instead
    // exposes a stable #dropdown-item-{CODE} testid, with just the short
    // localized name ("México") as its text. Prefer the stable testid when
    // the country code is known, falling back to the legacy text match.
    const shortCountryName = country.match(/\(([^)]+)\)/)?.[1] ?? country;
    const countryCode = phoneCountryNameToCode[country];
    const testId = countryCode && droppdownCountryConfig[countryCode];

    // filter({ hasText }) matches the option element itself (by its
    // aggregate text), not a descendant text node — so in the Tailwind DOM
    // this resolves to the exact same element the testid locator finds,
    // letting .or() dedupe to one match instead of two in strict mode.
    const textOption = this.iframeZoidVisible
      .getByRole('option')
      .filter({ hasText: shortCountryName });
    const option = testId ? this.iframeZoidVisible.getByTestId(testId).or(textOption) : textOption;

    await this.ensureVisibleToClick(option);
  }

  async fillPhoneSelector(phone: string) {
    await this.ensureVisible(this.inputPhoneSelector, {});
    await this.inputPhoneSelector.fill(phone);
  }

  async fillPhoneWithCountry(country: string, phone: string) {
    await this.selectPhoneCountry(country);
    await this.fillPhoneSelector(phone);
  }

  async clickOnPaypalSpbButton() {
    await this.ensureVisibleToClick(
      this.buttonPaypalSpb,
      undefined,
      'CHK:PaypalSpbButton:PayPal SPB Button not visible',
      { timeout: 30000 }
    );
  }

  //Assertions
  async assertPaypalSpbButton() {
    await this.ensureVisible(this.buttonPaypalSpb, {
      errorMessage: 'CHK:PaypalSpbButton:PayPal SPB Button not visible',
      timeout: 10000,
    });
  }

  async assertProcessingView() {
    await this.ensureVisible(this.labelProcessingViewTitle, {
      errorMessage: 'CHK:PaymentProcessing:Payment Processing view not visible',
    });
  }

  async assertApmRedirectPaymentIcon() {
    await this.ensureVisible(this.imageApmRedirectPaymentIcon, {
      errorMessage: 'CHK:PaymentIcon:apm-redirect-view-logo-no-visible',
    });
  }

  async assertLoginTextsArePresent(country: CountryCodes = 'MX', title?: string) {
    let labelCustomTitleLogin: Locator;
    if (title) {
      labelCustomTitleLogin = this.iframeZoidVisible.getByText(title);
    }

    // isVisibleWithTimeout returns a boolean and asserts nothing, so this method used to
    // pass no matter what the screen showed. assertIsVisible is the class's own
    // expect(...).toBeVisible() wrapper and does fail when the text is missing.
    if (country == 'BR') {
      await this.assertIsVisible(title ? labelCustomTitleLogin : this.labelTitleLoginBR, {
        timeout: 40000,
      });
      await this.assertIsVisible(this.labelDescriptionLoginBR, { timeout: 40000 });
    } else {
      await this.assertIsVisible(title ? labelCustomTitleLogin : this.labelTitleLogin, {
        timeout: 40000,
      });
      await this.assertIsVisible(this.labelDescriptionLogin, { timeout: 40000 });
    }
  }

  async assertAddNewCardText() {
    expect(this.labelDescriptionLoginBR).toBeVisible();
  }

  async assertDinerOtpScreenIsVisible() {
    expect(this.imageOTPDiners).toBeVisible();
    expect(this.labelDescriptionOTPDiners).toBeVisible();
  }

  async assertErrorOrderMessageIsPresent() {
    await this.isVisibleWithTimeout(this.labelMessageOrderFailed);
    await this.isVisibleWithTimeout(this.buttonCloseAlertError);
  }

  async assertErrorCardRequiredFieldsMessageIsPresent() {
    expect(this.labelContinueButtonError).toBeVisible();
    expect(this.labelCVVError).toBeVisible();
    expect(this.buttonCloseAlertError).toBeVisible();
  }

  async assertErrorCardCVV() {
    expect(this.labelCVVError).toBeVisible();
  }

  async assertCouponIsRedeemed(coupon: string) {
    await this.isVisibleWithTimeout(this.iframeZoidVisible.locator(`[title="${coupon}"]`));
    await this.isVisibleWithTimeout(this.buttonDeleteCoupon);
  }

  async assertDiscountIsApplied() {
    await this.isVisibleWithTimeout(this.buttonDeleteCoupon);
  }

  async assertShippingAddressPaymentScreen(address: string) {
    expect(this.imageMapsAddress).toBeVisible();
    expect(this.iframeZoidVisible.locator(`p:contains("${address}")`)).toBeVisible();
  }

  async assertDinerButtonGoBackIsVisible() {
    expect(this.buttonGoBackToOrder).toBeVisible();
  }

  async assertOrderStatusErrorRequestPurchase(statusCode: number, messageError: string) {
    const responsePurchase = await this.responsePromise;
    expect(responsePurchase.status(), 'purchase status').toBe(statusCode);
    const responsePurchaseBody = await responsePurchase.json();
    expect(responsePurchaseBody.error.processor_error.message).toBe(messageError);
  }

  async assertOrderStatusRequestPurchase(status: OrderStatusTypes, statusCode: number) {
    const responsePurchase = await this.responsePromise;
    expect(responsePurchase.status(), 'purchase status').toBe(statusCode);
    const responsePurchaseBody = await responsePurchase.json();
    if (status != 'denied') {
      console.log(
        `[INFO] --> Order Status in request purchase: ${responsePurchaseBody.order.payment.data.status}`
      );
      expect(responsePurchaseBody.order.payment.data.status).toBe(status);
    }
  }

  async assertNotNullAurthorizationCode() {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();

    console.log(
      `[INFO] -----> authorization_code in PURCHASED order is ${responsePurchaseBody.order.payment.data.authorization_code}`
    );

    expect(responsePurchaseBody.order.payment.data.authorization_code).not.toBeNull();
  }

  async assertOrderPaymentCardBrand(cardBrand: string) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    expect(responsePurchaseBody.order.payment.data.from_card.card_brand).toBe(cardBrand);
  }

  async assertBillingAddressInPurchaseOrder(address: string) {
    PurchasePayloadAsserter.from(this.purchaseRequestBody).assertAddress(address);
  }

  async assertZipCodeInPurchaseOrder(zipCode: string) {
    PurchasePayloadAsserter.from(this.purchaseRequestBody).assertZipCode(zipCode);
  }

  async assertEmailInPurchaseOrder(email: string) {
    PurchasePayloadAsserter.from(this.purchaseRequestBody).assertEmail(email);
  }

  async assertPhoneInPurchaseOrder(phone: string) {
    PurchasePayloadAsserter.from(this.purchaseRequestBody).assertPhone(phone);
  }

  async assertFirstAndLastNameInPurchaseOrder(first_name: string, last_name: string) {
    PurchasePayloadAsserter.from(this.purchaseRequestBody).assertFirstLastName(
      first_name,
      last_name
    );
  }

  async assertCountryInPurchaseOrder(country: CountryCodes) {
    PurchasePayloadAsserter.from(this.purchaseRequestBody).assertCountry(country);
  }

  async assertCityInPurchaseOrder(city: string) {
    PurchasePayloadAsserter.from(this.purchaseRequestBody).assertCity(city);
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
    // V2 anida shipping_address dentro de order; V1 lo expone top-level.
    const shippingAddress =
      responsePurchaseBody.order?.shipping_address ?? responsePurchaseBody.shipping_address;
    expect(shippingAddress?.address1).toContain(`${address}`);
    console.log(`[INFO] -----> Address in order TO PURCHASE is ${shippingAddress?.address1}`);
  }

  async assertPaymentOrderStatusRequestPurchase(status: OrderStatusTypes, statusCode: number) {
    const responsePurchase = await this.responsePromise;
    expect(responsePurchase.status(), 'purchase status').toBe(statusCode);
    const responsePurchaseBody = await responsePurchase.json();
    expect(responsePurchaseBody.order.payment.data.status).toBe(`${status}`);
  }

  async assertWrongOTPMessage() {
    expect(this.labelWrongOtpMessage).toBeVisible();
  }

  async assertPaymentOrderUserDeviceSession(): Promise<string> {
    const response: Response = await this.responsePromise;
    const headers = response.request().headers();
    const sessionID = headers['x-session-id'];

    expect(sessionID).toBeTruthy();

    return sessionID;
  }

  async assertTransactionLogsCountByTransactionId(rowCount: number) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const { body, status, statusText } = await getTransactionLogsByTransactionID(
      responsePurchaseBody.order.order_id
    );

    expect(status).toBe(202);
    expect(statusText, 'Accepted');
    expect(body.row_count).toBe(rowCount);
    expect(body.data.rows.length).toBe(rowCount);
  }

  async assertErrorCode(errorCode: string) {
    const errorLabel = this.iframeZoidVisible.getByText(errorCode);
    await expect(errorLabel).toBeVisible();
  }

  async assertLabelsFor(country: CountryCodes) {
    const config = labelsConfig[country];
    for (const [field, text] of Object.entries(config as any)) {
      this.labelLocators.set(field, this.iframeZoidVisible.getByText(text as string));
    }
    for (const field of Object.keys(config)) {
      const locator = this.labelLocators.get(field);
      await expect(locator).toBeVisible();
    }
  }

  async clearInputField(inputLocator: Locator) {
    await inputLocator.fill('');
  }

  async clearZipcode() {
    await this.clearInputField(this.inputBillingFormZipCode);
  }

  async assertInvalidZipCodeError() {
    expect(this.labelZipCodeError).toBeVisible();
  }

  async assertMXCountryCustomLabelsAreCorrect() {
    expect(this.labelFirstNameCustom).toBeVisible();
  }

  async assertMXErrorsArePresent() {
    expect(this.labelAddressMXError.first()).toBeVisible();
  }

  async assertResponseCancelEvent() {
    const requestTrack = await this.requestPromise;
    const requestTrackStringData = await requestTrack.postData();
    const { event } = JSON.parse(requestTrackStringData);
    expect(event).toEqual(CheckoutEventsName.apmCancelPayment);
  }

  async assertEventWasFired(event: string) {
    const request = await this.page.waitForRequest(
      (request) => {
        const url = request.url();
        const method = request.method();
        const postData = request.postData();
        if (url.includes('/track') && method === 'POST' && postData) {
          try {
            const body = JSON.parse(postData);
            return body.event === event && body.channel === 'web';
          } catch {
            return false;
          }
        }
        return false;
      },
      { timeout: 10000 }
    );

    expect(request).toBeTruthy();
  }

  async assertEventWasNotFired(event: string) {
    try {
      await this.page.waitForRequest(
        (request) => {
          const url = request.url();
          const method = request.method();
          const postData = request.postData();

          if (url.includes('/track') && method === 'POST' && postData) {
            try {
              const body = JSON.parse(postData);
              return body.event === event && body.channel === 'web';
            } catch {
              return false;
            }
          }
          return false;
        },
        { timeout: 10000 }
      );
      throw new Error(`Event '${event}' was fired when it should not have been.`);
    } catch (error: any) {
      if (error?.name === 'TimeoutError') {
        // This is the expected outcome, so the assertion passes.
        expect(true).toBe(true);
      } else {
        // For any other error, re-throw it.
        throw error;
      }
    }
  }

  async assertAlertNotification(text: string, withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const locator = iframe.locator(this.alertNotificationText);
    await expect(locator).toHaveText(text, { timeout: 120000 });
  }

  async assertAlertInfoNotification(text: string, withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const locator = iframe.locator(this.alertInfoNotificationText);
    await expect(locator).toHaveText(text, { timeout: 120000 });
  }

  async assertAlertErrorNotification(text: string, withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const locator = iframe.locator(this.alertErrorNotificationText);
    await expect(locator).toHaveText(text, { timeout: 120000 });
  }

  async assertVisibleIfOnlyPaymentMethodIsAPM(paymentMethodText: string) {
    await this.ensureVisible(this.page.getByText(paymentMethodText), {
      iframe: this.iframeZoidVisible,
    });
  }

  async assertProcessingModalWithTitle(text: string, withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const locator = iframe.locator(this.labelProcessingModalTitle);
    await expect(locator).toHaveText(text);
  }

  async assertPayPalRedirectTitle(text: string, withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const locator = iframe.locator(this.labelPayPalRedirectTitle);
    await expect(locator).toHaveText(text);
  }

  async assertPayPalRedirectSubtitle(text: string, withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const locator = iframe.locator(this.labelPayPalRedirectSubtitle);
    await expect(locator).toHaveText(text);
  }

  async assertButtonPayVisible(withSecondaryFrame = false) {
    const iframe = !withSecondaryFrame ? this.iframeZoidVisible : this.iframeSecondaryZoidVisible;
    const buttonPayLocator = iframe.locator(this.buttonPay);
    await expect(buttonPayLocator).toBeVisible();
  }

  async assertPayPalInfo() {
    await expect(this.sectionPayPalInfo).toBeVisible();
  }

  async assertPayPalAccounts() {
    await expect(this.sectionPayPalAccounts).toBeVisible();
  }

  async assertStateDropdownEnabled() {
    expect(this.selectDropdownStateName).toBeEnabled();
  }

  async assertCityDropdownIsDisabled() {
    expect(this.selectDropdownCity).toBeDisabled();
  }
  async assertCityDropdownIsEnabled() {
    expect(this.selectDropdownStateCity).toBeEnabled();
  }

  async assertSTPCodiTabIsVisible() {
    expect(this.tabSTPCodi).toBeVisible();
  }

  async assertChangeMethodButtonIsHidden() {
    const changeMethodText = this.iframeZoidVisible.getByText('Cambiar método de pago');
    await expect(changeMethodText).toBeHidden();
  }

  async assertDefaultDropdownArrowColor() {
    // The widget can still be rolled back between design systems, so both the
    // BaseUI neutral color and the Tailwind design-system color are valid.
    const ACCEPTED_COLORS = ['#17171a', 'rgb(0, 130, 54)', '#5a51be'];

    // Chrome preserves wide-gamut CSS colors (e.g. oklch(), used by the Tailwind
    // design tokens) as-is when fillStyle is read back, instead of normalizing to
    // hex. Comparing the raw string breaks across color notations even when the
    // rendered color is identical, so resolve every side to concrete sRGB pixel
    // bytes via canvas and compare those instead.
    const { actual, acceptedRgba } = await this.dropdownArrowIcon.evaluate((el, colors) => {
      const toRgba = (cssColor: string) => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.fillStyle = cssColor;
        ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      };

      return {
        actual: toRgba(getComputedStyle(el).color),
        acceptedRgba: colors.map(toRgba),
      };
    }, ACCEPTED_COLORS);

    const matches = acceptedRgba.some((rgba) => JSON.stringify(rgba) === JSON.stringify(actual));

    expect(
      matches,
      `CHK: dropdown arrow color ${JSON.stringify(actual)} does not match any accepted design-system color ${JSON.stringify(acceptedRgba)}`
    ).toBe(true);
  }
}
