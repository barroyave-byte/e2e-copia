import { ConsoleMessage, FrameLocator, Locator, Page, Response, expect } from '@playwright/test';
import {
  BaseCreditCard,
  FillCardFormOptions,
} from '@support/interfaces/credit_cards/baseCreditCard';
import { DEFAULT_DOCUMENT_BY_COUNTRY } from '@support/constants/identityDocuments';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { EmaOrderStatus } from '@support/interfaces/emaOrderStatusTypes';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { RiskLevel, FraudDecision, FraudProcessStatus } from '@support/interfaces/riskOption';
import { getTranslations } from '@translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';
import { TextPaymentMethods } from '@support/interfaces/textsPaymentsMethodsUITypes';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import {
  getApiKeysFromMetabaseQueryForComparison,
  getCybersourceStatusCodeFromMetabaseQuery,
  getEnqueueAsyncTaskFromDB,
  getExternalTransactionIdUpperCaseFromMetabaseQuery,
  getRequestResponseCybersource,
  getInvoicesResponse,
} from '@support/request_helper/requestUtil';
import { mock_purchase_token } from '@support/mocks/purchasWithNetworkToken';
import { CommonsActions } from '@pages/commonActions';

import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import * as computedStyle from '@pages/helpers/computedStyle';
import { ThemeColors, ThemeControls } from '@support/interfaces/CheckoutConfigurationV2';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';
import { convertCurrency } from '@support/utils/convertCurrency';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import { PURCHASE_URL_PATTERN, isV2PurchaseRequest } from '@support/utils/purchase-contracts';
import { RemoteTranslations } from '@support/remote_translations/RemoteTranslations';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { retryGetFraudDecision, retryGetFraudProcessStatus } from '@support/utils/retries';
import { ModalExperienceTypePage } from '@pages/explore/modalExperienceTypePage';
import { declaresAlpha, normalizeColor } from '@pages/helpers/cssColor';

const ADD_CREDIT_CARD_LABEL = 'Agregar una tarjeta';

interface WidgetState {
  paymentMethods?: { selectedPaymentMethod?: any };
}

interface VerifyWidgetSelectedPaymentMethodState {
  customExpect?(widgetState: WidgetState): Promise<void>;
}

interface InstallmentsDeselectedPayloadParams<M = Record<string, unknown>> {
  metadata: M;
  amount: number;
  cardBin: string;
  country: string;
}

interface PaymentProcessingPayloadParams<M = {}> {
  metadata: M;
  methodType: string;
  processorName: string;
}

declare const window: Window & {
  DeunaSDK?: {
    getWidgetState: () => Promise<any>;
    submit: () => Promise<any>;
  };
};

export class PaymentDeunaNowPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: DeunanowTranslations;
  readonly subtitle: Locator;
  readonly subTitleCreditCardForm: Locator;
  readonly titlePaymentMethods: Locator;
  readonly buttonPay: Locator;
  readonly buttonClearInputValue: Locator;
  readonly buttonGoToSiteButton: Locator;
  readonly buttonFormSave: Locator;
  readonly buttonFormCancel: Locator;
  readonly buttonBackToMerchant: Locator;
  readonly buttonPayWidget: Locator;
  readonly buttonResendCode: Locator;
  readonly buttonChangeChannel: Locator;
  readonly buttonContinueAsGuest: Locator;
  readonly buttonSeeAllMyCards: Locator;
  readonly buttonSetCardAsDefault: (lastFour: string) => Locator;
  readonly buttonCvvModalCancel: Locator;
  readonly buttonCvvModalContinue: Locator;
  readonly buttonBillingSummary: Locator;
  readonly buttonLogout: Locator;
  readonly buttonLogoutConfirm: Locator;

  readonly inputCreditCardNumber: Locator;
  readonly inputExpirationDate: Locator;
  readonly inputCvv: Locator;
  readonly inputHolderName: Locator;
  readonly inputDocumentNumber: Locator;
  readonly inputOTP: Locator;
  readonly inputAddress1: Locator;
  readonly inputAddress2: Locator;
  readonly inputDescription: Locator;

  readonly labelEpiryDateExpiredCard: Locator;
  readonly labelEpiryDateInvalidFormat: Locator;
  readonly labelEpiryDateInvalidMonth: Locator;
  readonly labelCardForm: Locator;
  readonly titleCardForm: Locator;
  readonly labelPayWith: String;
  readonly labelPrivacyPolicy: String;
  readonly labelTermsAndConditions: String;
  readonly labelDescriptionCardForm: Locator;
  readonly buttonAddCreditCard: Locator;
  readonly labelCardNumber: Locator;
  readonly labelExpirationDate: Locator;
  readonly labelCvv: Locator;
  readonly labelTermsAndConditionsDisclaimer: Locator;
  readonly labelCardHolder: Locator;
  readonly labelDocumentNumber: Locator;
  readonly labelOtpTitle: Locator;
  readonly labelOtpSubtitle: Locator;
  readonly labelChangeBilling: Locator;
  readonly labelChangeBillingAlreadyFilled: Locator;
  readonly labelAccordionSummary: Locator;
  readonly labelSummaryTitle: Locator;
  readonly labelPrivacyPolicyAnchor: Locator;
  readonly labelTermsAndConditionsAnchor: Locator;
  readonly labelCvvModal: Locator;

  readonly selectInstallMSI: Locator;
  readonly selectInstallMSIBR: Locator;
  readonly selectInstallMCIBR: Locator;
  readonly selectInstallMCI: Locator;
  readonly selectUserGuest: Locator;
  readonly selectUserRegister: Locator;
  readonly installmentsDropdown: Locator;

  readonly iframeZoidVisible: FrameLocator;
  readonly iframeZoid: Locator;
  readonly iframe3ds: FrameLocator;
  readonly iframeAPMRedirect: FrameLocator;
  readonly iframeElements: FrameLocator;
  readonly tabCash: Locator;
  readonly checkboxLabel: Locator;
  readonly cardFieldsErrorMessageLabel: Locator;
  readonly titleBillingView: Locator;
  readonly modalDeUnaNow: Locator; //POST-TODO: analizar a detalle que tipo de elemento es o si existe objeto MODAL
  readonly dropdownBillingState: Locator;
  readonly optionBillingState: Locator;
  readonly dropdownBillingCountry: Locator;
  readonly optionBillingCountryMexico: Locator;
  readonly dropdownCity: Locator;
  readonly optionCity: Locator;
  // The bordered trigger element (@deuna/components-v3 Dropdown/CountryDropdown):
  // `id` lands on the inner search <input> (border-none), while the actual
  // border/state color classes (TRIGGER_BASE + dropdownStateVariants) live two
  // levels up, on the div carrying data-testid="dropdown-input-{id}". Use
  // these — not dropdownBillingCountry/State/dropdownCity — for border checks.
  readonly triggerBillingCountry: Locator;
  readonly triggerBillingState: Locator;
  readonly triggerCity: Locator;
  // Same locators as above (input fields + border triggers), pre-scoped into
  // the zoid iframe where the billing form actually lives — assertInputBorderColor/
  // assertDropdownBorderColor take a plain Locator with no iframe parameter,
  // unlike fillInputField/ensureVisibleToClick.
  readonly address1Border: Locator;
  readonly countryDropdownBorder: Locator;
  readonly stateDropdownBorder: Locator;
  readonly cityDropdownBorder: Locator;
  readonly countrySearchInput: Locator;
  readonly stateSearchInput: Locator;
  readonly citySearchInput: Locator;
  readonly errorNotificationContainer: Locator;
  readonly requiredFormField: Locator;
  readonly alertMissingBillingData: Locator;
  readonly alertPurchaseGenericError: Locator;
  readonly cardErrorMessage: Locator;
  readonly expDateErrorMessage: Locator;
  readonly cvvErrorMessage: Locator;
  readonly cardHolderErrorMessage: Locator;
  readonly cardHolderMissingLastNameErrorMessage: Locator;
  readonly idDocumentErrorMessage: Locator;
  readonly selectableCards: Locator;
  readonly selectCards: Locator;
  readonly buttonBackAction: Locator;
  readonly UpperTag: Locator;
  readonly LoweTag: Locator;
  readonly noInstallmentTooltip: Locator;
  readonly noInstallmentPopover: Locator;
  readonly dropdownReferenceOptionContainer: Locator;
  readonly dropdownReferenceCountry: Locator;
  readonly imageProcessorLocator: Locator;
  readonly selectOptionNoInstallments: Locator;
  readonly selectInstallment: Locator;
  readonly selectedCardLastFour: Locator;
  readonly identityDocumentTypeDropdown: Locator;
  readonly identityDocumentTypeDropdownExpandable: Locator;
  readonly chevronDownIdentityDocument: Locator;

  readonly imagePoweredByDeuna: Locator;
  readonly customImagePoweredByDeuna: Locator;
  readonly imageMerchantLogo: Locator;
  readonly iconCloseAlert: Locator;

  readonly labelDeniedTitle: Locator;
  readonly labelDeniedMainMessage: Locator;
  readonly labelRedirectPageTitle: Locator;
  readonly progressBar: Locator;
  readonly inputsContainers: Locator;
  readonly checkboxToggle: Locator;

  readonly buttonSpeiTab: Locator;
  readonly inputUserCardCvv: Locator;
  readonly buttonCardActionsTrigger: (lastFour: string) => Locator;
  readonly buttonDeleteCardOption: (lastFour: string) => Locator;
  readonly buttonConfirmDeleteCard: Locator;
  readonly alertContainer: Locator;
  readonly alertContainerSuccess: Locator;

  readonly remoteTranslations: RemoteTranslations;

  responsePromise: any;
  requestPurchase: any;
  responseRequestInstallments: any;
  responseRequestAntiFraudKey: any;
  three3dsResponsePromise: any;
  responseCreateCard: any;
  labelDocumentNumberError: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.remoteTranslations = new RemoteTranslations(page);
    this.page = page;
    this.selectors = getTranslations('deunanow', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    this.labelEpiryDateExpiredCard = page.getByText(
      this.selectors.screenExpiryDateField.cardExpired
    );
    this.labelEpiryDateInvalidFormat = page.getByText(
      this.selectors.screenExpiryDateField.invalidFormat
    );
    this.labelPayWith = this.selectors.screenPaymentLinkPaymentForm.payWith;
    this.labelPrivacyPolicy = this.selectors.screenPaymentLinkPaymentForm.privacyPolicy;
    this.labelTermsAndConditions = this.selectors.screenPaymentLinkPaymentForm.termsAndConditions;
    this.labelEpiryDateInvalidMonth = page.getByText(
      this.selectors.screenExpiryDateField.invalidMonth
    );
    this.labelCardForm = page.getByText(this.selectors.screenPaymentLinkPaymentForm.title);
    this.titleCardForm = this.iframeZoidVisible.locator(this.labelCardForm);
    this.labelDescriptionCardForm = page.getByText(
      this.selectors.screenPaymentLinkPaymentForm.description
    );
    this.buttonBillingSummary = this.iframeZoidVisible.locator('#btn-add-billing-data');
    this.subtitle = this.iframeZoidVisible.locator('h2');
    this.subTitleCreditCardForm = this.iframeZoidVisible.getByTestId('pattern-wrapper-subtitle');
    this.titlePaymentMethods = this.iframeZoidVisible.locator('h3');
    this.labelCardNumber = page.locator('label[for="card_number"]');
    this.labelExpirationDate = page.locator('label[for="payment-methods-expiration-date-input"]');
    this.labelCvv = page.locator('label[for="payment-methods-cvv-input"]');
    this.labelCardHolder = page.locator('label[for="payment-methods-card-holder"]');
    this.labelDocumentNumber = page
      .locator('label[data-testid="card_holder_dni-label"]')
      .or(page.getByTestId('dropdown-label-card_holder_dni')); // migration-or
    this.labelOtpTitle = page.locator('h1[data-testid="header-title"]');
    this.labelOtpSubtitle = page.locator('h2[data-testid="subtitle-otp-view"]');
    this.labelTermsAndConditionsDisclaimer = page.getByTestId('terms-conditions-disclaimer');
    this.labelPrivacyPolicyAnchor = page.locator('a[data-testid="privacy-policy-link"]');
    this.labelTermsAndConditionsAnchor = page.locator('a[data-testid="terms-conditions-link"]');

    this.iframeZoid = page.locator('iframe.zoid-visible');
    this.iframeElements = this.iframeZoidVisible.frameLocator('iframe[title="Full Screen Iframe"]');
    this.inputCreditCardNumber = page.locator('[data-baseweb="payment-card-input"] > input');
    this.inputExpirationDate = page.locator('[id="payment-methods-expiration-date-input"]');
    this.inputDocumentNumber = page
      .locator('[id="payment-methods-identity-number"]')
      .or(page.locator('[data-testid="card_holder_dni-value-input"]'))
      .or(page.locator('[data-testid="card_holder_dni-input"]'));
    this.inputHolderName = page.locator('[id="payment-methods-card-holder"]');
    this.installmentsDropdown = page.locator('[id="installments-dropdown"]');
    this.inputCvv = page.locator('[id="payment-methods-cvv-input"]');
    this.modalDeUnaNow = page.locator('[id="payment_link_container"]');
    this.buttonPay = page.locator('#payment-button');
    this.buttonClearInputValue = this.iframeZoidVisible.locator('[data-testid="close"]');
    this.buttonBackToMerchant = this.iframeZoidVisible.locator('[data-testid="top-area-back-btn"]');
    this.buttonPayWidget = page.locator('#payment-button');
    this.buttonResendCode = page.locator('[data-testid="resend_button"]');
    this.buttonChangeChannel = page.locator('[data-testid="change-otp-channel-button"]');
    this.buttonContinueAsGuest = page.locator('[data-testid="continue-as-guest-button"]');
    this.buttonSeeAllMyCards = page.getByTestId('see-all-cards-button');
    this.buttonSetCardAsDefault = (lastFour: string) =>
      this.iframeZoidVisible
        .getByTestId(`card-action-set-default-${lastFour}`)
        .or(this.iframeZoidVisible.getByText('Tarjeta predeterminada'));
    this.buttonAddCreditCard = this.iframeZoidVisible.getByTestId('add-card-button');
    this.selectedCardLastFour = this.iframeZoidVisible.getByTestId('selected-card-last-four');
    this.progressBar = this.iframeZoidVisible.locator('[data-baseweb="progress-bar"]');
    this.inputsContainers = this.iframeZoidVisible
      .locator('input[data-baseweb="base-input"]')
      .locator('xpath=..');
    this.checkboxToggle = this.iframeZoidVisible.locator('label[data-baseweb="checkbox"]');
    this.selectInstallMSI = page
      .getByRole('button', {
        name: `${this.selectors.screenInstallmentsQuantityMSI.buttonInstallmentsMSI}`,
      })
      .or(
        page
          .locator('[data-testid="dropdown-input-installments"]')
          .filter({ hasText: 'Sin cuotas' })
      )
      .first(); // migration-or
    this.selectInstallMCI = page
      .getByRole('button', {
        name: `${this.selectors.screenInstallmentsQuantityMCI.buttonInstallmentsMCI}`,
      })
      .or(
        page
          .locator('[data-testid="dropdown-input-installments"]')
          .filter({ hasText: 'Sin cuotas' })
      )
      .first(); // migration-or
    this.imageProcessorLocator = this.page.locator(
      `#root > div > main > div.MuiGrid-root.MuiGrid-container.css-7b4lok > div.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-3.css-4xkoi8 > div > div > div:nth-child(4) > div > img`
    );
    this.selectUserGuest = page.locator('[data-testid="continue-as-guest-button"]');
    this.selectUserRegister = page.locator('.ag > div:nth-child(3) > div');
    this.inputOTP = page.locator('#otp-input-0');
    this.tabCash = page
      .locator('[id="tab-cash:cash"]')
      .or(page.locator('[datatestid="tab-cash:cash"]')); // migration-or
    this.iframe3ds = this.iframeZoidVisible.frameLocator('[data-testid="apm-redirect-iframe"]');
    this.iframeAPMRedirect = this.iframeZoidVisible.frameLocator(
      '[data-testid="apm-redirect-iframe"]'
    );
    this.buttonGoToSiteButton = page.locator('[data-testid="go_to_site-button"]');
    this.checkboxLabel = page.getByText(this.selectors.screenBillingData.checkboxLabel);
    this.labelChangeBilling = page.getByText(this.selectors.screenBillingData.addBillingData);
    this.labelChangeBillingAlreadyFilled = page.getByText(
      this.selectors.screenBillingData.changeBillingData
    );
    this.titleBillingView = page.getByText(this.selectors.screenBillingData.titleBillingView);
    this.buttonFormSave = page.getByText(this.selectors.screenBillingData.buttonFormSave);
    this.inputAddress1 = page.locator('#input-billing-address1');
    this.inputAddress2 = page.locator('#input-billing-address2');
    this.inputDescription = page.locator('#additional_description');
    this.dropdownBillingState = page.locator('#dropdown-billing-state');
    this.optionBillingState = page
      .locator('#dropdown-billing-state >> text=Bogotá D.C.')
      .or(page.locator('#dropdown-content-dropdown-billing-state >> text=Bogotá D.C.')); // migration-or
    // Default id assigned to the Country field when BillingPattern renders it as a Dropdown
    // (packages/patterns/billing/.../configurableFields.tsx in modular-checkout) — see ENTP1-18066.
    this.dropdownBillingCountry = page.locator('#custom-select-dropdown');
    // `dropdown-item-{ISO}` (design-system dropdown/Dropdown.tsx) is keyed by
    // ISO code, not display text — the country list renders in the browser's
    // locale regardless of the app's configured language (e.g. "Mexico", not
    // "Mexico"), so matching by visible text is unreliable. No text-based
    // `.or()` fallback here: the option's own label renders as a nested
    // <span>, which a `>> text=` selector matches as a SEPARATE element from
    // the outer `role="option"` div — combined in one `.or()`, that's two
    // matches for the same option and a strict-mode violation, not a safe
    // fallback.
    this.optionBillingCountryMexico = page.locator('[data-testid="dropdown-item-MX"]');
    this.dropdownCity = page.locator('#city');
    this.optionCity = page
      .locator('#city >> text=Bogotá D.C.')
      .or(page.locator('#dropdown-content-city >> text=Bogotá D.C.')); // migration-or
    // Derived from the id-based input locator via ancestor traversal instead
    // of a hardcoded `dropdown-input-{id}` guess per field — the exact `id`
    // string modular-checkout assigns can vary/change, but the design system
    // Dropdown component always wraps its search <input> in a bordered
    // trigger div carrying a `dropdown-input-*` data-testid two levels up.
    const nearestDropdownTrigger = (input: Locator): Locator =>
      input.locator('xpath=ancestor::div[starts-with(@data-testid, "dropdown-input-")][1]');
    this.triggerBillingCountry = nearestDropdownTrigger(this.dropdownBillingCountry);
    this.triggerBillingState = nearestDropdownTrigger(this.dropdownBillingState);
    this.triggerCity = nearestDropdownTrigger(this.dropdownCity);
    this.address1Border = this.iframeZoidVisible.locator(this.inputAddress1);
    this.countryDropdownBorder = this.iframeZoidVisible.locator(this.triggerBillingCountry);
    this.stateDropdownBorder = this.iframeZoidVisible.locator(this.triggerBillingState);
    this.cityDropdownBorder = this.iframeZoidVisible.locator(this.triggerCity);
    this.countrySearchInput = this.iframeZoidVisible.locator(this.dropdownBillingCountry);
    this.stateSearchInput = this.iframeZoidVisible.locator(this.dropdownBillingState);
    this.citySearchInput = this.iframeZoidVisible.locator(this.dropdownCity);
    this.errorNotificationContainer = page.locator(
      '[id="alert-container-notification-negative"], #alert-container'
    );
    this.cardFieldsErrorMessageLabel = page.getByText(
      this.selectors.screenPaymentLinkUserInfo.cardFieldsErrorMessage
    );
    this.buttonFormCancel = page.getByRole('button', {
      name: `${this.selectors.screenBillingData.buttonFormCancel}`,
    });
    this.requiredFormField = page.getByText(
      this.selectors.screenBillingData.descriptionInputRequired
    );
    this.alertMissingBillingData = page.getByText(
      this.selectors.screenAlertNotifications.missingBillingData
    );
    this.cardErrorMessage = page.getByText(
      this.selectors.screenPaymentLinkUserInfo.cardErrorMessage
    );
    this.expDateErrorMessage = page.getByText(
      this.selectors.screenPaymentLinkUserInfo.expDateErrorMessage
    );
    this.cvvErrorMessage = page.getByText(this.selectors.screenPaymentLinkUserInfo.cvvErrorMessage);
    this.cardHolderErrorMessage = page.getByText(
      this.selectors.screenPaymentLinkUserInfo.cardHolderErrorMessage
    );
    this.cardHolderMissingLastNameErrorMessage = page.getByText(
      this.selectors.screenPaymentLinkUserInfo.cardHolderMissingLastNameErrorMessage
    );
    this.idDocumentErrorMessage = page.getByText(
      this.selectors.screenPaymentLinkUserInfo.idDocumentErrorMessage
    );
    this.imageMerchantLogo = page.locator('img[data-testid="merchant-logo"]');
    this.imagePoweredByDeuna = page.locator('div[aria-label*="Powered by DEUNA"]');
    this.customImagePoweredByDeuna = page.locator('img[alt*="Powered by DEUNA"]');
    // Retro-compatible saved-card list. Older consumers still render the BaseUI
    // accordion (panels); the migrated one renders a V3 Radio group (options as
    // <label>). Match either structure so the shared POM works across versions.
    const cardsAccordionRoot = this.iframeZoidVisible.locator('[data-baseweb="accordion"]');
    // Scope to the saved-cards radiogroup only (the one containing card-<lastFour>).
    // The legacy accordion renders a per-card inner Radio (its own role=radiogroup)
    // whose card testid sits OUTSIDE it, so those are excluded here.
    const cardsRadioRoot = this.iframeZoidVisible.locator(
      '[role="radiogroup"]:has([data-testid^="card-"])'
    );
    this.selectCards = cardsAccordionRoot.or(cardsRadioRoot);
    this.selectableCards = cardsAccordionRoot
      .locator('li, [data-testid="accordion-panel"]')
      .or(cardsRadioRoot.locator('label'))
      // Selectable = not the default card and not an expired one.
      .filter({ hasNotText: 'Predeterminada' })
      .filter({ hasNotText: 'Tarjeta expirada' });
    this.buttonBackAction = page.getByTestId('arrow_back_ios');
    this.alertPurchaseGenericError = page.getByText(
      this.selectors.screenAlertNotifications.widgetPurchaseError
    );
    this.UpperTag = page.locator('div#upper-tag');
    this.LoweTag = page.locator('div#lower-tag');
    this.noInstallmentTooltip = this.iframeZoidVisible.getByTestId('tooltip-no-installments');
    this.noInstallmentPopover = this.iframeZoidVisible.getByTestId(
      'tooltip-no-installments-popover'
    );
    this.labelAccordionSummary = this.iframeZoidVisible.locator(
      '[data-testid="order-summary-title"]'
    );
    this.labelSummaryTitle = this.iframeZoidVisible.locator('[data-testid="order-detail-title"]');
    this.dropdownReferenceCountry = this.iframeZoidVisible.locator(
      '#dropdown-reference-payment-country'
    );
    this.dropdownReferenceOptionContainer = this.iframeZoidVisible.locator(
      '#dropdown-content-dropdown-reference-payment-country'
    );
    this.selectOptionNoInstallments = this.iframeZoidVisible.getByTestId(
      'dropdown-item-00000000-0000-0000-0000-000000000000'
    );
    this.selectInstallment = this.iframeZoidVisible.getByTestId('dropdown-input-installments');

    this.iconCloseAlert = this.iframeZoidVisible.locator(
      '#alert-container-close-icon, svg[role="button"][title="Close"]'
    );
    const { labelDeniedTitle, labelDeniedMainMessage } =
      this.selectors.screenTransactionViewResult || {};

    this.labelDeniedTitle = this.iframeAPMRedirect.getByText(labelDeniedTitle);
    this.labelDeniedMainMessage = this.iframeAPMRedirect.getByText(labelDeniedMainMessage);
    this.buttonSpeiTab = page.getByRole('tab', { name: 'spei' });
    this.labelRedirectPageTitle = page.getByText(
      this.selectors.screenRedirectToCommerceView.labelProcessingOrder
    );
    this.inputUserCardCvv = this.iframeZoidVisible.locator('[id="user-card-cvv-input"]');
    this.buttonCardActionsTrigger = (lastFour: string) =>
      this.iframeZoidVisible.getByTestId(`card-actions-${lastFour}-trigger`).or(
        this.iframeZoidVisible.getByRole('button', {
          name: `Ver más opciones **** ${lastFour}`,
          exact: true,
        })
      );
    this.buttonDeleteCardOption = (lastFour: string) =>
      this.iframeZoidVisible.getByTestId(`card-action-delete-${lastFour}`);
    this.buttonConfirmDeleteCard = this.iframeZoidVisible.getByRole('button', {
      name: this.selectors.screenDeleteCard.confirmButton,
    });
    this.alertContainer = this.iframeZoidVisible.locator('#alert-container');
    this.alertContainerSuccess = this.iframeZoidVisible.locator(
      '#alert-container-notification-positive, #alert-container'
    );
    this.labelCvvModal = this.iframeZoidVisible.getByTestId('cvv-modal-title');
    this.buttonCvvModalCancel = this.iframeZoidVisible.getByTestId('cvv-modal-cancel-button');
    this.buttonCvvModalContinue = this.iframeZoidVisible.getByTestId('cvv-modal-continue-button');
    this.buttonLogout = this.iframeZoidVisible.getByText('Cerrar sesión');
    this.buttonLogoutConfirm = this.iframeZoidVisible.getByRole('button', { name: 'Confirmar' });

    // Label errors Card Pattern
    this.labelDocumentNumberError = this.iframeZoidVisible.getByTestId('card_holder_dni-caption');

    this.identityDocumentTypeDropdown = this.iframeZoidVisible
      .locator('#payment-methods-identity-number-dropdown')
      .or(this.iframeZoidVisible.locator('[data-testid="dropdown-input-card_holder_dni"]')); // migration-or
    this.identityDocumentTypeDropdownExpandable = this.iframeZoidVisible
      .locator('#payment-methods-identity-number-dropdown')
      .or(this.iframeZoidVisible.locator('[data-testid="card_holder_dni-combobox"]')); // migration-or
    this.chevronDownIdentityDocument = this.iframeZoidVisible.getByTestId(
      'identity-document-input-with-dropdown-chevron-down'
    );
  }

  getIframe() {
    return this.iframeZoidVisible;
  }

  getElementsIframe() {
    return this.iframeElements;
  }

  async closeAlert() {
    await this.ensureVisibleToClick(this.iconCloseAlert);
  }

  threeDSUrlAwaiter() {
    // Listen on the whole context: in the frictionless flow the continue call comes from the
    // 3DS wrapper popup the widget opens, which page.waitForResponse never sees.
    this.three3dsResponsePromise = this.page.context().waitForEvent('response', {
      predicate: (response) => response.url().includes('/three-ds-flow/continue'),
      timeout: 90_000,
    });
  }

  async waitForLoadOTPPage() {
    await expect(this.iframeZoidVisible.locator(this.inputOTP)).toBeVisible({ timeout: 20000 });
  }

  async checkIfDeunaSDKExists() {
    const isWebSDKAvailable = await this.page.evaluate(() => {
      return typeof window.DeunaSDK === 'object';
    });

    expect(isWebSDKAvailable).toBe(true);
  }

  async verifyWidgetSelectedPaymentMethodState(
    options: VerifyWidgetSelectedPaymentMethodState = {}
  ) {
    const widgetState: WidgetState = await this.page.evaluate(async () => {
      if (typeof window.DeunaSDK?.getWidgetState === 'function') {
        return await window.DeunaSDK.getWidgetState();
      }
      return null;
    });

    expect(widgetState).not.toBeNull();

    await options.customExpect(widgetState);
  }

  async assertNotRequiredCvv() {
    const inputCvv = this.iframeZoidVisible.locator(this.inputCvv);
    await expect(inputCvv).toBeDisabled();
    await expect(inputCvv).toHaveAttribute('placeholder', 'No requerido');
    await expect(inputCvv).toHaveAttribute('value', '');
  }

  /**
   * Waits until the 3DS popup has called three-ds-flow/continue, whatever its status, so the
   * test does not leave the page before the frictionless flow ends. The outcome is asserted
   * later (admin status); this only removes the race. Arm threeDSUrlAwaiter() before paying.
   */
  async waitForThreeDsFlowToFinish() {
    if (!this.three3dsResponsePromise) {
      throw new Error('threeDSUrlAwaiter() must be called before paying');
    }
    await this.three3dsResponsePromise;
  }

  async assert3dsResponseSuccess() {
    const response3ds = await this.three3dsResponsePromise;
    expect(response3ds.status(), '3DS Response').toBe(200);
  }

  async assertUserSeePaymentForm() {
    await this.ensureVisible(this.labelCardForm, {
      iframe: this.iframeZoidVisible,
    });
  }

  async assertInputUserCardCvvIsNotVisible() {
    await expect(this.inputUserCardCvv).toBeHidden();
  }

  async assertCvvModalIsVisible() {
    await expect(this.labelCvvModal).toBeVisible();
  }

  async waitResponseFromGetCards() {
    return this.page.waitForResponse(
      (response) => response.url().includes('/cards') && response.request().method() === 'GET'
    );
  }

  async waitResponseFromSaveCard() {
    return this.page.waitForResponse(
      (response) => response.url().includes('/cards') && response.request().method() === 'POST'
    );
  }

  async waitUntilLoadPage() {
    await this.ensureVisible(this.buttonBillingSummary, {
      timeout: 1000,
    });
  }

  /**
   * DO NOT CHANGE THIS METHOD
   * Validate that the response from the get cards endpoint has one saved card without cvv required
   * @param statusCode
   */
  async assertOneSavedCardWithoutCvvRequired(statusCode: number = 200) {
    const responseAllCards = await this.waitResponseFromGetCards();
    expect(responseAllCards.status(), 'cards request status').toBe(statusCode);
    const responseCardsBody = await responseAllCards.json();
    const cards = responseCardsBody.data;
    expect(cards.length === 1).toBeTruthy();
    const cvvRequired = cards[0].cvv_required;
    expect(cvvRequired).toBe(false);
  }

  async assertSubTitleCreditCardFormIsNotVisible() {
    await expect(this.subTitleCreditCardForm).not.toBeVisible();
  }

  async clickGoToSite() {
    await this.ensureVisibleToClick(
      this.buttonGoToSiteButton,
      this.iframeZoidVisible,
      'The button to Go to Site is not visible'
    );
  }

  async clickTagDetailToggle(tag: 'upper' | 'lower') {
    const chosenTag = tag === 'upper' ? this.UpperTag : this.LoweTag;

    await this.ensureVisibleToClick(
      chosenTag.getByText('Mostrar detalle'),
      this.iframeZoidVisible,
      'The tag detail toggle is not visible'
    );
  }

  async waitResponseFromInstallments() {
    this.responseRequestInstallments = this.page.waitForResponse(
      (response) =>
        response.url().includes('/installments') && response.request().method() === 'GET',
      {
        timeout: 40000,
      }
    );
  }

  async waitForInstallmentsResponse() {
    await this.responseRequestInstallments;
  }

  async getTotalAmountWithInterest(installments: InstallmentQuantity) {
    const installmentsResponse = await this.responseRequestInstallments;
    const installmentsPlanBodyResponse = await installmentsResponse.json();
    let installmentPlan = installmentsPlanBodyResponse.installments.find(
      (ins) => ins.installments == installments
    );
    return installmentPlan.installments_amount * Number(installments);
  }

  async clearInputsCreditCard(field = null) {
    const fields = {
      creditCardNumber: this.inputCreditCardNumber,
      expDate: this.inputExpirationDate,
      cvv: this.inputCvv,
      documentNumber: this.inputDocumentNumber,
      holderName: this.inputHolderName,
    };

    if (field && fields[field]) {
      await this.clearInputField(fields[field], this.iframeZoidVisible);
    } else if (!field) {
      for (const key in fields) {
        await this.clearInputField(fields[key], this.iframeZoidVisible);
      }
    } else {
      console.warn(`Field "${field}" not recognized.`);
    }
  }

  async hoverElement(element: Locator, searchInFrame: boolean = false) {
    const elementToHover = (await searchInFrame)
      ? this.iframeZoidVisible.locator(element)
      : element;
    expect(elementToHover).toBeVisible({ timeout: 5000 });

    await elementToHover.hover();
    await this.page.waitForTimeout(1000);
  }

  async fillCardForm(creditCardData, options: FillCardFormOptions = {}) {
    if (!options.avoidInstallmentsCall) await this.waitResponseFromInstallments();

    const identityDocument = options.country
      ? (DEFAULT_DOCUMENT_BY_COUNTRY[options.country] ?? creditCardData.document_number)
      : creditCardData.document_number;

    const fields = [
      { key: 'number', input: this.inputCreditCardNumber },
      { key: 'expiration_date', input: this.inputExpirationDate },
      { key: 'cvv_code', input: this.inputCvv },
      { key: 'cardholder_name', input: this.inputHolderName },
      { key: 'document_number', input: this.inputDocumentNumber, value: identityDocument },
    ];

    for (const { key, input, value } of fields) {
      if (creditCardData[key] && creditCardData[key].trim() !== '') {
        await this.iframeZoidVisible.locator(input).fill(value || creditCardData[key]);
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async fillCreditCardDataDeunaNow(
    creditCardData: BaseCreditCard,
    opts?: { waitForInstallments?: boolean; country?: string }
  ) {
    await this.waitCardNumberInputIsVisible();
    if (opts?.waitForInstallments) {
      this.waitResponseFromInstallments();
    }
    await this.clearInputsCreditCard();
    await this.fillInputCreditCardNumber(creditCardData.number);
    await this.fillInputExpirationDate(creditCardData.expiration_date);

    if (opts?.waitForInstallments) {
      await this.waitForInstallmentsResponse();
    }
    await this.fillInputCvv(creditCardData.cvv_code);
    await this.fillInputHolderName(creditCardData.cardholder_name);

    const documentNumber =
      opts?.country !== undefined
        ? (DEFAULT_DOCUMENT_BY_COUNTRY[opts.country] ?? creditCardData.document_number)
        : creditCardData.document_number;

    await this.fillInputDocumentNumber(documentNumber);
  }

  async fillCreditCard(number: string) {
    await this.fillInputCreditCardNumber(number);
  }

  async userDoesNotSeeInstallmentsDropdown() {
    expect(await this.installmentsDropdown.isHidden());
  }

  async userSeesInstallmentsDropdown() {
    expect(await this.installmentsDropdown.isVisible());
  }

  async clickClosestClearButton(fieldName) {
    const fieldLocators = {
      cardNumber: this.inputCreditCardNumber,
      expDate: this.inputExpirationDate,
      documentNumber: this.inputDocumentNumber,
      holderName: this.inputHolderName,
      cvv: this.inputCvv,
    };

    const inputLocator = fieldLocators[fieldName];
    await this.clearInputField(inputLocator, this.iframeZoidVisible);
  }

  async waitCardNumberInputIsVisible() {
    await this.ensureVisible(this.inputCreditCardNumber, {
      iframe: this.iframeZoidVisible,
      timeout: 115000,
      errorMessage: 'The input to enter the credit card number is not visible',
    });
  }

  async fillInputCreditCardNumber(creditCardNumber: string) {
    await this.pressTextOnInput(this.inputCreditCardNumber, creditCardNumber, {
      iframe: this.iframeZoidVisible,
      delayPress: 100,
    });
  }

  async fillInputExpirationDate(expirationDate: string) {
    await this.iframeZoidVisible.locator(this.inputExpirationDate).fill(expirationDate);
  }

  async appendInputExpirationDate(expirationDate: string) {
    await this.pressTextOnInput(this.inputExpirationDate, expirationDate, {
      iframe: this.iframeZoidVisible,
      delayPress: 100,
    });
  }

  async fillInputCvv(cvv: string) {
    await this.pressTextOnInput(this.inputCvv, cvv, {
      iframe: this.iframeZoidVisible,
    });
  }

  async assertCvvModalEmitEvents(cvv: string) {
    const promise = new Promise<void>((resolve, reject) => {
      this.assertEventWasFired(CheckoutEventsName.paymentMethodsCardSecurityCodeEntered).then(
        resolve,
        reject
      );
    });

    await this.inputUserCardCvv.fill(cvv);
  }

  async sendCvvInputEnteredInModal() {
    await this.buttonCvvModalContinue.click();
  }

  async touchCvvField() {
    await this.inputUserCardCvv.click();
  }

  async fillInputDocumentNumber(documentNumber: string, skipValidation?: boolean) {
    await this.pressTextOnInput(this.inputDocumentNumber, documentNumber, {
      iframe: this.iframeZoidVisible,
      delayPress: 100,
    });

    if (!Boolean(skipValidation) && documentNumber.trim() !== '') {
      await expect(
        this.labelDocumentNumberError,
        'CHK:CARD:invalid-document — cardPattern rejected invalid document number'
      ).not.toBeVisible({ timeout: 2_000 });
    }
  }

  async waitForSelectedCardLastFour(timeout?: number) {
    const effectiveTimeout = timeout ?? 40000;
    // Wait for the Zoid iframe to be visible before asserting inner elements.
    // Under concurrent load the GET /cards backend call may be delayed, causing
    // the widget to take longer than usual to render the preselected saved card.
    await expect(this.iframeZoid).toBeVisible({ timeout: effectiveTimeout });
    await expect(this.selectedCardLastFour).toBeVisible({ timeout: 90000 });
  }

  async areSavedCardsVisible() {
    return await this.selectedCardLastFour.isVisible();
  }

  async waitAndEnterOtpCode(code: string = '010101') {
    const otpInput = this.iframeZoidVisible.locator(this.inputOTP);
    await otpInput.waitFor({ state: 'visible', timeout: 30000 });
    await otpInput.click();
    await otpInput.fill(code, { timeout: 50000 });
  }

  async logout() {
    await this.buttonLogout.click();
    await this.buttonLogoutConfirm.click();
  }

  async clickOnSeeAllMyCards() {
    await this.ensureVisibleToClick(
      this.buttonSeeAllMyCards,
      this.iframeZoidVisible,
      'The button to see all my cards is not visible'
    );

    await expect(this.buttonSeeAllMyCards).not.toBeVisible();
  }

  async openCardActions(lastFour: string) {
    await this.ensureVisibleToClick(this.buttonCardActionsTrigger(lastFour));
  }

  async selectTokenizedCard(lastFourDigits: string) {
    // card-<lastFour> is now a span inside the radio option's <label>; clicking
    // it selects the radio (the label redirects the click to the input).
    const chosenCard = this.selectableCards.getByTestId(`card-${lastFourDigits}`);

    await this.ensureVisibleToClick(chosenCard);
  }

  async fillInputHolderName(holderName: string) {
    await this.fillInputField(this.inputHolderName, holderName, this.iframeZoidVisible);
  }

  async clickOnCancelFormButton() {
    await this.ensureVisibleToClick(this.buttonFormCancel, this.iframeZoidVisible);
  }

  async selectInstallmentDeselected() {
    await this.ensureVisibleToClick(this.selectInstallment);
    await this.ensureVisibleToClick(this.selectOptionNoInstallments);
  }

  async assertAddNewCreditCardButtonIsVisible() {
    await expect(this.buttonAddCreditCard).toBeVisible();
  }

  async selectOptionAddNewCreditCard() {
    await expect(this.iframeZoidVisible.locator(this.modalDeUnaNow)).toBeVisible();
    await this.ensureVisibleToClick(this.buttonAddCreditCard);
  }

  async selectInstallmentsMSI(installments: InstallmentQuantity) {
    await this.ensureVisibleToClick(this.selectInstallMSI, this.iframeZoidVisible);
    await this.page.waitForTimeout(1000);
    const locatorInstallments = this.page.locator(
      `text=/^${installments} ${this.selectors.screenInstallmentsQuantityMSI.labelInstallmentsMSI}/`
    );
    await this.ensureVisibleToClick(
      locatorInstallments,
      this.iframeZoidVisible,
      `The option ${installments} months is not visible`
    );
    await this.page.waitForTimeout(1000);
  }

  async selectInstallmentsMCI(installments: InstallmentQuantity) {
    await this.ensureVisibleToClick(
      this.selectInstallMCI,
      this.iframeZoidVisible,
      'The list of installments option is not visible'
    );
    await this.page.waitForTimeout(1000);
    const locatorInstallments = this.page.locator(
      `text=/${installments} ${this.selectors.screenInstallmentsQuantityMCI.labelInstallmentsMCI}/`
    );
    await this.ensureVisibleToClick(
      locatorInstallments,
      this.iframeZoidVisible,
      `The option ${installments} months is not visible`
    );
    await this.page.waitForTimeout(1000);
  }

  async assertEmptyInstallments() {
    await this.ensureNotVisible(
      this.selectInstallMSI,
      this.iframeZoidVisible,
      'The list of installments option is visible'
    );
    await this.page.waitForTimeout(1000);
  }

  async ensureNotVisibleInstallmentsMSI(installments: InstallmentQuantity) {
    const locatorInstallments = this.page.locator(
      `text=/^${installments} ${this.selectors.screenInstallmentsQuantityMSI.labelInstallmentsMSI}/`
    );
    await this.ensureNotVisible(
      locatorInstallments,
      this.iframeZoidVisible,
      `The option ${installments} months is visible`
    );
    await this.page.waitForTimeout(1000);
  }

  async userGuest() {
    const isGuestOptionVisible = await this.isVisibleWithTimeout(
      this.selectUserGuest,
      this.iframeZoidVisible,
      50000
    );
    if (!isGuestOptionVisible) {
      return;
    }
    await this.ensureVisibleToClick(this.selectUserGuest, this.iframeZoidVisible);
  }

  async enterOTPCode(codeOTP: string = '010101') {
    await this.fillInputField(this.inputOTP, codeOTP, this.iframeZoidVisible);
  }

  async clickSkipOTP() {
    await this.ensureVisibleToClick(this.selectUserGuest, this.iframeZoidVisible);
  }

  async assertSpeiPattern(title: string, description: string) {
    await this.page.waitForTimeout(1000);
    await this.ensureVisible(this.page.getByText(title), {
      iframe: this.iframeZoidVisible,
    });
    await this.ensureVisible(this.page.getByText(description), {
      iframe: this.iframeZoidVisible,
    });
  }

  async assertSpeiVoucher(
    title: string,
    description: string,
    referenceTitle: string,
    payBefore: string,
    instructionsTitle: string,
    downloadReference: string,
    seeOrderSummary?: string
  ) {
    await this.page.waitForTimeout(1000);
    await this.ensureVisible(this.page.getByText(title), {
      iframe: this.iframeZoidVisible,
    });
    await this.ensureVisible(this.page.getByText(description), {
      iframe: this.iframeZoidVisible,
    });
    await this.ensureVisible(this.page.getByText(referenceTitle), {
      iframe: this.iframeZoidVisible,
    });
    await this.ensureVisible(this.page.getByText(payBefore), {
      iframe: this.iframeZoidVisible,
    });
    await this.ensureVisible(this.page.getByText(instructionsTitle), {
      iframe: this.iframeZoidVisible,
    });
    await this.ensureVisible(this.page.getByText(downloadReference), {
      iframe: this.iframeZoidVisible,
    });
    if (seeOrderSummary) {
      await this.ensureVisible(this.page.getByText(seeOrderSummary), {
        iframe: this.iframeZoidVisible,
      });
    }
  }

  async clickOnPayButtonWithoutWaitResponse() {
    await this.ensureVisibleToClick(
      this.buttonPay,
      this.iframeZoidVisible,
      'The button to pay is not visible'
    );
  }

  async assertPayButtonIsNotVisible() {
    expect(await this.buttonPay.isVisible()).toBeFalsy();
  }

  async clickOnPayButton(withResponse = true) {
    if (withResponse) {
      this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 350000 });
    }

    await this.ensureVisibleToClick(
      this.buttonPay,
      this.iframeZoidVisible,
      'The button to pay is not visible'
    );
  }

  async fireDeunaSDKSubmit(withResponse = true) {
    if (withResponse) {
      this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 350000 });
    }

    await this.page.evaluate(async () => {
      if (typeof window.DeunaSDK?.submit === 'function') {
        await window.DeunaSDK.submit();
      }
    });
  }

  async userSeesErrors() {
    expect(await this.iframeZoidVisible.locator(this.cardErrorMessage).isVisible());
    expect(await this.iframeZoidVisible.locator(this.expDateErrorMessage).isVisible());
    expect(await this.iframeZoidVisible.locator(this.cvvErrorMessage).isVisible());
    expect(
      await this.iframeZoidVisible.locator(this.cardHolderMissingLastNameErrorMessage).isVisible()
    );
    expect(await this.iframeZoidVisible.locator(this.idDocumentErrorMessage).isVisible());
  }

  async userDoesNotSeeErrors() {
    expect(await this.iframeZoidVisible.locator(this.cardErrorMessage).isHidden());
    expect(await this.iframeZoidVisible.locator(this.expDateErrorMessage).isHidden());
    expect(await this.iframeZoidVisible.locator(this.cvvErrorMessage).isHidden());
    expect(await this.iframeZoidVisible.locator(this.cardHolderErrorMessage).isHidden());
    expect(
      await this.iframeZoidVisible.locator(this.cardHolderMissingLastNameErrorMessage).isHidden()
    );
    expect(await this.iframeZoidVisible.locator(this.idDocumentErrorMessage).isHidden());
  }

  async userDoesSeeErrors(field = null) {
    const errorFields = {
      cardError: this.cardErrorMessage,
      expDateError: this.expDateErrorMessage,
      cvvError: this.cvvErrorMessage,
      cardHolderError: this.cardHolderErrorMessage,
      cardHolderMissingLastNameError: this.cardHolderMissingLastNameErrorMessage,
      idDocumentError: this.idDocumentErrorMessage,
    };

    if (field && errorFields[field]) {
      expect(await this.iframeZoidVisible.locator(errorFields[field]).isVisible());
    } else if (!field) {
      for (const key in errorFields) {
        expect(await this.iframeZoidVisible.locator(errorFields[key]).isVisible());
      }
    } else {
      console.warn(`Error field "${field}" not recognized.`);
    }
  }

  async userSeeCardError() {
    expect(await this.iframeZoidVisible.locator(this.cardErrorMessage).isVisible());
  }

  async userSeeCvvError() {
    expect(await this.iframeZoidVisible.locator(this.cvvErrorMessage).isVisible());
  }

  async userSeeExpDateError() {
    expect(await this.iframeZoidVisible.locator(this.expDateErrorMessage).isVisible());
  }

  async userSeeHolderNameError() {
    expect(await this.iframeZoidVisible.locator(this.cardHolderErrorMessage).isVisible());
  }

  async userSeeDocumentNumberError() {
    expect(await this.iframeZoidVisible.locator(this.idDocumentErrorMessage).isVisible());
  }
  async clickPay(mockSpecificFields: boolean = false) {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 350000 });
    this.requestPurchase = this.page.waitForRequest(
      (r) => PURCHASE_URL_PATTERN.test(r.url()) && r.method() === 'POST',
      { timeout: 350000 }
    );

    await this.mockHolderNameCreditCard(mockSpecificFields);
    // For Mercado Pago fingerprint flows, hold the purchase until the anti-fraud
    // profiling is done so device_id isn't sent empty ("e30=") on slow CI. No-op
    // for every other flow.
    await this.clickOnPayButton();

    await Promise.all([this.responsePromise, this.responseCreateCard]);
  }

  async clickPayAndWaitForCardCreation(mockSpecificFields: boolean = false) {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 280000 });

    this.responseCreateCard = this.page.waitForResponse('**/cards', {
      timeout: 50000,
    });

    await this.mockHolderNameCreditCard(mockSpecificFields);
    await this.clickOnPayButton();

    await Promise.all([this.responsePromise, this.responseCreateCard]);
  }

  async clickBackToMerchantButton() {
    await expect(this.iframeZoid).toBeAttached();
    await expect(this.buttonBackToMerchant)
      .toBeVisible()
      .then(() => this.buttonBackToMerchant.click());
  }

  async selectPaymentMethod(paymentMethod: TextPaymentMethods) {
    const locatorPaymentMethod = this.page.locator(`p:has-text("${paymentMethod}")`);
    await this.ensureVisibleToClick(
      locatorPaymentMethod,
      this.iframeZoidVisible,
      'Payment method is not visible'
    );
  }

  async mockHolderNameCreditCard(mockSpecificFields: boolean = false) {
    await this.page.route(PURCHASE_URL_PATTERN, (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postData = JSON.parse(request.postData());

        if (isV2PurchaseRequest(postData)) {
          const cardInfo = postData.payment_source?.card_info as Record<string, string> | undefined;
          if (cardInfo?.card_holder?.includes('CLEAR')) {
            cardInfo.card_holder = cardInfo.card_holder.replace(/CLEAR\s?/, '');
          }
          if (mockSpecificFields) {
            const { credit_card } = mock_purchase_token;
            postData.payment_source = {
              ...postData.payment_source,
              card_info: {
                card_cvv: credit_card.card_cvv,
                expiry_month: credit_card.expiry_month,
                expiry_year: credit_card.expiry_year,
                card_holder: credit_card.card_holder,
                card_number: credit_card.card_number,
              },
            };
          }
        } else {
          if (postData.credit_card?.card_holder?.includes('CLEAR')) {
            postData.credit_card.card_holder = postData.credit_card.card_holder.replace(
              /CLEAR\s?/,
              ''
            );
          }
          if (mockSpecificFields) {
            const { credit_card } = mock_purchase_token;
            postData.credit_card = credit_card;
          }
        }

        route.continue({ postData: JSON.stringify(postData) });
      } else {
        route.continue();
      }
    });
  }

  async scrollToElement(element: Locator, iframe?: FrameLocator) {
    const locator = iframe ? iframe.locator(element) : element;

    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.scrollIntoViewIfNeeded();
  }

  async fillCvvCode(cvvCode: string) {
    await this.inputUserCardCvv.fill(cvvCode);
  }

  async clickCvvContinue() {
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 280000 });
    await this.buttonCvvModalContinue.click();
  }

  async verifyComboboxNotShown() {
    expect(await this.iframeZoidVisible.locator(this.selectInstallMSI).isHidden());
  }

  async getBodyInvoicesResponse(orderToken) {
    const invoicesResponse = await getInvoicesResponse(orderToken);
    return invoicesResponse.body;
  }

  // Asserts
  async assertIframe3dsVisible() {
    await expect(this.iframe3ds.owner(), 'Iframe 3ds is not visible').toBeVisible({
      timeout: 20_000,
    });
    await expect(this.iframe3ds.locator('body'), 'Iframe 3ds body is not visible').toBeVisible({
      timeout: 20000,
    });
  }

  async assertIframeAPMRedirectVisible() {
    await expect(this.iframeAPMRedirect.locator('body')).toBeVisible({ timeout: 20_000 });
  }

  async assertApmRedirectErrorMessages(timeout = 20_000) {
    await expect(this.labelDeniedTitle).toBeVisible({ timeout });
    await expect(this.labelDeniedMainMessage).toBeVisible({ timeout });
  }

  async assertOrderStatusRequestPurchase(
    status: OrderStatusTypes,
    statusCode: number,
    options?: { disableBodyVerification: boolean }
  ) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const requestPurchaseBody = responsePurchase.request().postDataJSON();

    expect(
      responsePurchase.status(),
      `purchase status is incorrect. Response body: \n${JSON.stringify(
        responsePurchaseBody,
        null,
        2
      )}\n\nRequest body: \n${JSON.stringify(requestPurchaseBody, null, 2)}`
    ).toBe(statusCode);

    if (!options?.disableBodyVerification) {
      return;
    }

    if (status != 'denied') {
      console.log(
        `[INFO] --> Order Status in request purchase: ${responsePurchaseBody.order.payment.data.status}`
      );
      expect(responsePurchaseBody.order.payment.data.status).toBe(status);
    }
    const token = responsePurchase.request().postDataJSON().token;
    return token;
  }

  async assertDeviceIdInPurchaseRequest(options?: { antiFraudProvider?: string[] }) {
    const req = await this.requestPurchase;
    let payload: any = null;
    try {
      if (typeof (req as any).postDataJSON === 'function') {
        payload = (req as any).postDataJSON();
      } else {
        const raw = req.postData();
        payload = raw ? JSON.parse(raw) : null;
      }
    } catch {
      payload = null;
    }
    expect(payload, 'purchase request payload').toBeTruthy();
    const deviceIdInRequest = isV2PurchaseRequest(payload)
      ? payload.anti_fraud_info?.device?.id
      : payload?.device_id;
    expect(deviceIdInRequest, 'device_id in purchase payload').toBeDefined();
    const deviceIdInRequestDecoded = Buffer.from(deviceIdInRequest, 'base64').toString('utf-8');

    expect(
      options?.antiFraudProvider?.every((provider) =>
        deviceIdInRequestDecoded.includes(provider.toUpperCase())
      )
    ).toBeTruthy();
  }

  async assertProcessorNameInPurchaseRequest(expectedProcessorName: string) {
    const req = await this.requestPurchase;
    let payload: any = null;
    try {
      if (typeof (req as any).postDataJSON === 'function') {
        payload = (req as any).postDataJSON();
      } else {
        const raw = req.postData();
        payload = raw ? JSON.parse(raw) : null;
      }
    } catch {
      payload = null;
    }
    expect(payload, 'purchase request payload').toBeTruthy();
    const processorNameInRequest = isV2PurchaseRequest(payload)
      ? ((payload.payment_source as any)?.processor ?? payload?.processor_name)
      : payload?.processor_name;
    expect(processorNameInRequest, 'processor_name in purchase payload').toBe(
      expectedProcessorName
    );
  }

  async assertOrderStatusRequestPurchaseReferenceProcessors(
    status: OrderStatusTypes,
    statusCode: number,
    options?: {
      disableBodyVerification: boolean;
      referenceName?: string;
      returnOnlyReferenceId?: boolean;
    }
  ) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const referenceProcessors =
      responsePurchaseBody.order.payment.data.next_action.authorization_reference_processors
        .reference_processors;

    if (options?.referenceName) {
      const processor = referenceProcessors.find(
        (processor) => processor.reference_name === options.referenceName
      );
      return options.returnOnlyReferenceId ? processor?.reference_id : processor;
    }

    return referenceProcessors;
  }

  async assertOrderStatusRequestPurchaseReferenceSafetypay(
    status: OrderStatusTypes,
    statusCode: number,
    options?: { disableBodyVerification: boolean }
  ) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const safetyPayReferenceId = responsePurchaseBody.order.payment.data.external_transaction_id;

    return safetyPayReferenceId;
  }

  async assertEmaOrderStatus(status: EmaOrderStatus) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    if (status != 'denied') {
      console.log(
        `[INFO] --> Order Status in request purchase: ${responsePurchaseBody.order.status}`
      );
      expect(responsePurchaseBody.order.status).toBe(status);
    }
  }

  async assertOpenPayFraudKeyLoaded() {
    this.responseRequestAntiFraudKey = this.page.waitForResponse(
      'https://sandbox-api.opencontrol.mx/v1/device**',
      {
        timeout: 60000,
      }
    );

    const responseAntiFraudKey = await this.responseRequestAntiFraudKey;

    expect(responseAntiFraudKey.status(), 'antifraudkeys status').toBe(200);
    await this.page.waitForTimeout(1000);
  }

  async assertErrorStatusRequestPurchase(errorCode: string, statusCode: number) {
    const responsePurchase = await this.responsePromise;
    expect(responsePurchase.status(), 'purchase status').toBe(statusCode);
    const responsePurchaseBody = await responsePurchase.json();
    expect(responsePurchaseBody.error.code).toBe(errorCode);
  }

  async assertShippingAmountPurchaseDeunaNow(valueShippingAmount: number) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    console.log(`[INFO] --> Shipping Amount: ${responsePurchaseBody.order.shipping_amount}`);
    expect(responsePurchaseBody.order.shipping_amount).toBe(valueShippingAmount);
  }

  async assertProcessorName(verifyProcessor: string) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    console.log(`[INFO] --> Processor name: ${responsePurchaseBody.order.payment.data.processor}`);
    expect(responsePurchaseBody.order.payment.data.processor).toBe(verifyProcessor);
  }

  async assertUserSeesErrorNotification() {
    expect(await this.iframeZoidVisible.locator(this.cardFieldsErrorMessageLabel).isVisible());
  }

  async assertFraudProcessStatus(
    fraudStatus: FraudProcessStatus,
    option: { privateKey: string; orderToken: string }
  ) {
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
    await retryGetFraudProcessStatus(emaService, option.privateKey, option.orderToken, fraudStatus);
  }

  async assertFraudProcessStatusChanged(
    fraudProcessStatus: FraudProcessStatus,
    privateKey: string,
    orderToken: string
  ) {
    const pollingInterval = 15000;
    const maxDuration = 90000;
    const maxIterations = maxDuration / pollingInterval;
    let fraudStatusChanged = false;

    for (let i = 0; i < maxIterations; i++) {
      let OrderData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
      const fraudStatus = OrderData.bodyResponse?.order?.fraud?.status;
      if (fraudStatus === fraudProcessStatus) {
        fraudStatusChanged = true;
        console.log('Fraud status changed to ', fraudProcessStatus);
        break;
      }

      console.log('Order has not changed fraud status yet. Current status: ', fraudStatus);
      await new Promise((resolve) => setTimeout(resolve, pollingInterval));
    }

    if (!fraudStatusChanged) {
      throw new Error('Fraud status did not changed on 90 secs, error in post transaction service');
    }
  }

  async assertFraudDecision(
    fraudProcessor: ConnectionsAvailable,
    risk: RiskLevel,
    fraudDecision: FraudDecision,
    options: {
      privateKey: string;
      orderToken: string;
    }
  ) {
    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
    const analysis = await retryGetFraudDecision(
      emaService,
      options.privateKey,
      options.orderToken,
      {
        processor: fraudProcessor,
        risk,
        decision: fraudDecision,
      }
    );

    const fraudAnalisysProcessor = JSON.stringify(analysis?.processor);
    const fraudAnalisysRiskLevel = JSON.stringify(analysis?.risk_level);
    const fraudAnalisysDecision = JSON.stringify(analysis?.fraud_decision);
    console.log(`[INFO] --> Fraud Processor: ${fraudAnalisysProcessor}`);
    console.log(`[INFO] --> Risk Level: ${fraudAnalisysRiskLevel}`);
    console.log(`[INFO] --> Fraud Decision: ${fraudAnalisysDecision}`);
    expect(fraudAnalisysProcessor).toContain(fraudProcessor);
    expect(fraudAnalisysRiskLevel).toContain(risk);
    expect(fraudAnalisysDecision).toContain(fraudDecision);
    expect(analysis.score).toBeDefined();
    expect(analysis.status).toBeDefined();
    expect(analysis.details).toBeDefined();
    expect(analysis.processor_response).toBeDefined();
  }

  async assertProcessor(fraudProcessor: ConnectionsAvailable) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const fraudAnalisysProcessor = JSON.stringify(
      responsePurchaseBody.order.fraud.analysis.processor
    );
    console.log(`[INFO] --> Fraud Processor: ${fraudAnalisysProcessor}`);
    expect(fraudAnalisysProcessor).toContain(fraudProcessor);
  }

  async assertOrderAmountRequestPurchase(amountWithInterest: number) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    console.log(`[INFO] ----> Order amount wiht interest: ${amountWithInterest}`);
    expect(responsePurchaseBody.order.payment.data.amount.amount).toBe(amountWithInterest);
  }

  async assertOrderFromCardInstallmentRateAndAmount(
    installmentRate: number,
    installmentAmount: number
  ) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    console.log(
      `[INFO] ----> Order From Card Installments Data: ${responsePurchaseBody.order.payment.data.from_card}`
    );
    const installment = responsePurchaseBody.order.payment.data.from_card.installment;
    expect(installment.installment_rate).toBe(installmentRate);
    expect(installment.installment_amount).toBe(installmentAmount);
  }

  async assertExpectedApyKeysOnSiftRequest(apiKey: string) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const { body, status, statusText } = await getApiKeysFromMetabaseQueryForComparison(
      responsePurchaseBody.order.order_id
    );
    expect(status).toBe(202);
    expect(statusText, 'Accepted');
    expect(body.row_count).toBe(1);
    expect(body.data.rows.length).toBeGreaterThan(0);
    expect(body.data.rows[0].length).toBeGreaterThanOrEqual(3);
    const keyToSift = body.data.rows[0][2];
    const firstFourCharsFromConfig = apiKey.substring(0, 4);
    const firstFourCharsToSift = keyToSift.substring(0, 4);
    const lastFourCharsFromConfig = apiKey.slice(-4);
    const lastFourCharsToSift = keyToSift.slice(-4);

    expect(firstFourCharsFromConfig).toBe(firstFourCharsToSift);
    expect(lastFourCharsFromConfig).toBe(lastFourCharsToSift);
  }

  async assertCyberSourceStatusCode() {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const { body, status, statusText } = await getCybersourceStatusCodeFromMetabaseQuery(
      responsePurchaseBody.order.order_id
    );
    expect(status).toBe(202);
    expect(statusText, 'Accepted');
    expect(body.row_count).toBe(1);
    expect(body.data.rows.length).toBeGreaterThan(0);
    expect(body.data.rows[0].length).toBeGreaterThanOrEqual(2);
    expect(body.data.rows[0][0]).toBe(responsePurchaseBody.order.order_id);
    expect(body.data.rows[0][1]).toBe('201');
  }

  async assertExternalTransactionIdUpperCase() {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();
    const { body, status, statusText } = await getExternalTransactionIdUpperCaseFromMetabaseQuery(
      responsePurchaseBody.order.order_id
    );
    expect(status).toBe(202);
    expect(statusText, 'Accepted');
    expect(body.row_count).toBe(1);
    expect(body.data.rows.length).toBeGreaterThan(0);
    expect(body.data.rows[0].length).toBeGreaterThanOrEqual(2);
    expect(body.data.rows[0][0]).toBe(responsePurchaseBody.order.order_id);
    expect(body.data.rows[0][1]).toBe(responsePurchaseBody.order.order_id.toUpperCase());
  }

  /**
   * Validates that the task registered in the database has the same merchant_id, order_token, operation_type, transaction_id and task_id.
   *
   * This function ensures that the task in the database matches the expected fields:
   * - `order_token`: The token associated with the order.
   * - `order_id`: The ID of the order.
   * - `merchant_id`: The ID of the merchant.
   * - `operation_type`: The type of operation (e.g., 'refund', 'void', 'capture').
   * - `task_id`: The ID of the asynchronous operation task.
   *
   * @param {any} orderCreated - The order object containing details about the created order.
   * @param {any} asynOperationResponse - The response object from the asynchronous operation.
   * @param {string} operationType - The type of operation (e.g., 'refund', 'void', 'capture').
   * @returns {Promise<void>} A Promise that resolves when the validation is complete.
   */
  async assertExpectedAsyncTaskFields(
    orderCreated: any,
    asynOperationResponse: any,
    operationType: string
  ) {
    const { body, status, statusText } = await getEnqueueAsyncTaskFromDB(
      orderCreated.token,
      operationType
    );
    expect(status).toBe(202);
    expect(statusText, 'Accepted');
    expect(body.row_count).toBe(1);
    expect(body.data.rows.length).toBeGreaterThan(0);
    expect(body.data.rows[0][0]).toEqual(orderCreated.token);
    expect(body.data.rows[0][1]).toEqual(orderCreated.order.order_id);
    expect(body.data.rows[0][2]).toEqual(orderCreated.merchant_id);
    expect(body.data.rows[0][3]).toEqual(operationType);
    expect(body.data.rows[0][4]).toEqual(asynOperationResponse.task_id);
  }

  async selectCashTab() {
    await this.ensureVisibleToClick(this.tabCash, this.iframeZoidVisible);
  }

  async assertVisibleIfOnlyPaymentMethodIsAPM(paymentMethodText: string) {
    await this.ensureVisible(this.page.getByText(paymentMethodText), {
      iframe: this.iframeZoidVisible,
      timeout: 50000,
    });
  }

  async assertThemeConfigCustomStyles(themeConfig: any, titleExist: boolean = true) {
    const { primaryTextColor, buttonPrimaryFill, buttonPrimaryText, primaryFontFamily } =
      themeConfig;
    const title = this.titleCardForm;
    const payButton = this.iframeZoidVisible.locator(this.buttonPayWidget);

    await this.assertCssColor(payButton, 'background-color', buttonPrimaryFill);
    if (buttonPrimaryText) {
      await this.assertCssColor(payButton, 'color', buttonPrimaryText);
    }
    if (titleExist) {
      await this.assertCssColor(title, 'color', primaryTextColor);
      await expect(title).toHaveCSS('font-family', new RegExp(`^${primaryFontFamily}`));
      await expect(title).toBeVisible();
    } else {
      await expect(title).not.toBeVisible();
    }
  }

  async assertMerchantLogoSrc(expectedSrc: string) {
    const logo = this.iframeZoidVisible.locator(this.imageMerchantLogo);
    await expect(logo, 'The merchant logo is not visible in the header').toBeVisible({
      timeout: 40000,
    });
    await expect(logo).toHaveAttribute('src', expectedSrc);
  }

  // Call only after the widget content is visible: before that, the logo is
  // trivially absent and this assertion would pass for the wrong reason.
  async assertMerchantLogoNotRendered() {
    await expect(
      this.iframeZoidVisible.locator(this.imageMerchantLogo),
      'The header renders a merchant logo although none is configured'
    ).toHaveCount(0, { timeout: 5000 });
  }

  // Measured against the widget iframe: the header spans the widget width, so a
  // centered logo sits on the iframe's horizontal center. The tolerance absorbs
  // the legacy header, which centers the logo in the column next to the back
  // action rather than across the whole bar.
  async assertMerchantLogoCentered(tolerancePx: number) {
    const logo = this.iframeZoidVisible.locator(this.imageMerchantLogo);
    await expect(logo, 'The merchant logo is not visible in the header').toBeVisible({
      timeout: 40000,
    });
    await expect
      .poll(
        async () => {
          const [logoBox, frameBox] = await Promise.all([
            logo.boundingBox(),
            this.iframeZoid.boundingBox(),
          ]);
          if (!logoBox || !frameBox) {
            return Number.POSITIVE_INFINITY;
          }
          const logoCenter = logoBox.x + logoBox.width / 2;
          const frameCenter = frameBox.x + frameBox.width / 2;
          return Math.abs(logoCenter - frameCenter);
        },
        {
          message: `The merchant logo is not centered in the header (tolerance ${tolerancePx}px)`,
          timeout: 10000,
        }
      )
      .toBeLessThanOrEqual(tolerancePx);
  }

  async assertOtpViewCustomStyles(otpInfo: any) {
    const {
      title,
      description,
      maskedPhone,
      otpChangeChannelButton,
      continueAsGuestButton,
      resendCodeButton,
    } = otpInfo;
    const otpTitle = this.iframeZoidVisible.locator(this.labelOtpTitle);
    const otpSubtitle = this.iframeZoidVisible.locator(this.labelOtpSubtitle);
    const otpChangeChannel = this.iframeZoidVisible.locator(this.buttonChangeChannel);
    const otpContinueAsGuestButton = this.iframeZoidVisible.locator(this.buttonContinueAsGuest);
    const otpResendCodeButton = this.iframeZoidVisible.locator(this.buttonResendCode);
    await expect(otpTitle).toHaveText(title);
    await expect(otpSubtitle).toHaveText(`${description} ${maskedPhone}`);
    await expect(otpChangeChannel).toHaveText(otpChangeChannelButton.description.sms);
    await expect(otpContinueAsGuestButton).toHaveText(continueAsGuestButton.description);
    await expect(otpResendCodeButton).toHaveText(resendCodeButton.description);
  }

  async assertCardFormCustomStyles(cardFormInputs: any) {
    const { cardNumber, expirationDate, securityCode, cardHolder, identityDocument } =
      cardFormInputs;
    const cardNumberInput = this.iframeZoidVisible.locator(this.labelCardNumber);
    const expirationDateInput = this.iframeZoidVisible.locator(this.labelExpirationDate);
    const cvvInput = this.iframeZoidVisible.locator(this.labelCvv);
    const cardHolderInput = this.iframeZoidVisible.locator(this.labelCardHolder);
    const documentNumberInput = this.iframeZoidVisible.locator(this.labelDocumentNumber);

    await expect(cardNumberInput).toHaveText(cardNumber.label);
    await expect(expirationDateInput).toHaveText(expirationDate.label);
    await expect(cvvInput).toHaveText(securityCode.label);
    await expect(cardHolderInput).toHaveText(cardHolder.label);
    await expect(documentNumberInput).toHaveText(identityDocument.label.CO);
  }

  async assertTermsAndConditionsDisclaimerCustomStyles(
    legalMessage: string,
    connectorText: string
  ) {
    const disclaimer = this.iframeZoidVisible.locator(this.labelTermsAndConditionsDisclaimer);
    await expect(disclaimer).toHaveText(
      `${legalMessage} ${this.labelPrivacyPolicy} ${connectorText} ${this.labelTermsAndConditions}`
    );
  }

  async assertTermsAndConditionsDisclaimerIsHidden() {
    await expect(this.labelTermsAndConditionsDisclaimer).not.toBeVisible();
  }

  async assertTermsAndConditionsUrlsAreCorrect(
    termsAndConditionsUrl: string,
    privacyPolicyUrl: string
  ) {
    const privacyPolicyAnchor = this.iframeZoidVisible.locator(this.labelPrivacyPolicyAnchor);
    const termsAndConditionsAnchor = this.iframeZoidVisible.locator(
      this.labelTermsAndConditionsAnchor
    );

    await expect(privacyPolicyAnchor).toHaveAttribute('href', privacyPolicyUrl);
    await expect(termsAndConditionsAnchor).toHaveAttribute('href', termsAndConditionsUrl);
  }

  async assertPaymentMethodsInfoCustomStyles(paymentMethodsInfo: any) {
    const title = this.titleCardForm;
    await expect(title).toHaveText(`${this.labelPayWith} ${paymentMethodsInfo.title}`);
    const subtitle = this.iframeZoidVisible.locator(this.labelDescriptionCardForm);
    await expect(subtitle).toHaveText(paymentMethodsInfo.subtitle);
  }

  async assertPaymentMethodsInfoCustomStylesWithSubtitle(paymentMethodsInfo: any) {
    const title = this.titleCardForm;
    await expect(title).toHaveText(`${this.labelPayWith} ${paymentMethodsInfo.title}`);
    const subtitle = this.iframeZoidVisible.getByText(paymentMethodsInfo.subtitle);
    await expect(subtitle).toHaveText(paymentMethodsInfo.subtitle);
  }

  async assertBillingTitleWithCustomStyles(billingTitle: string) {
    const title = this.iframeZoidVisible.getByText(billingTitle);
    await expect(title).toHaveText(billingTitle);
  }

  async assertPayButtonCustomStyles(
    payButton: any,
    expectedColors: Partial<ThemeColors>,
    options?: { waitForColorTransition?: boolean }
  ) {
    const { label, showOrderTotal, amountDisplay } = payButton;
    const button = this.iframeZoidVisible.locator(this.buttonPayWidget);
    if (showOrderTotal) {
      await expect(button).toHaveText(`${label} ${amountDisplay}`);
    } else {
      await expect(button).not.toHaveText(`${label} ${amountDisplay}`);
    }

    await this.assertButtonCustomStyles(button, expectedColors);
  }

  /**
   * Pairs an expected color with a formatter for the rendered one, both in the
   * same canonical shape, so a hex in the test data can be compared against the
   * `rgb(...)` the legacy widget reports or the `rgba(...)` the current one does.
   */
  private colorExpectation(expected: string) {
    const includeAlpha = declaresAlpha(expected);

    return {
      value: normalizeColor(expected, includeAlpha),
      format: (computed: string) => normalizeColor(computed, includeAlpha),
    };
  }

  /**
   * `toHaveCSS` compares the raw computed string, so it breaks as soon as the
   * widget switches between `rgb(...)` and `rgba(...)`. This polls the computed
   * property and compares it normalized — polling also absorbs the color
   * transition, whose duration varies enough across machines to be flaky.
   */
  private async assertCssColor(element: Locator, property: string, expected: string) {
    const color = this.colorExpectation(expected);

    // Wait for the element up front: `evaluate` blocks until the locator
    // resolves, so without this the poll below burns its whole budget waiting
    // for the widget to render and reports a bare predicate timeout instead of
    // "locator resolved to no elements".
    await expect(element).toBeAttached();

    await expect
      .poll(
        async () =>
          color.format(
            await element.evaluate(
              (el, prop) => getComputedStyle(el).getPropertyValue(prop),
              property
            )
          ),
        { timeout: 5000 }
      )
      .toBe(color.value);
  }

  async assertButtonCustomStyles(button: Locator, expectedColors: Partial<ThemeColors>) {
    if (expectedColors.buttonPrimaryFill) {
      await this.page.mouse.move(0, 0);
      await this.assertCssColor(button, 'background-color', expectedColors.buttonPrimaryFill);
    }

    if (expectedColors.buttonPrimaryHover) {
      await button.hover();
      await this.assertCssColor(button, 'background-color', expectedColors.buttonPrimaryHover);
    }

    if (expectedColors.buttonPrimaryActive) {
      await button.hover();
      await this.page.mouse.down();
      await this.page.mouse.move(0, 0);

      await this.assertCssColor(button, 'background-color', expectedColors.buttonPrimaryActive);
      await this.page.mouse.up();
    }
  }

  async assertElementHoverBgColor(element: Locator, expectedColor: string) {
    await expect(element).toBeVisible({ timeout: 5000 });
    await element.hover();
    await this.assertCssColor(element, 'background-color', expectedColor);
  }

  async assertPoweredByDeunaCustomStyles(poweredByDeunaImage: any) {
    const {
      url,
      hide,
      imageStyle: { width, height, filter },
    } = poweredByDeunaImage;
    const image = this.iframeZoidVisible.locator(this.customImagePoweredByDeuna);
    await expect(image).toHaveAttribute('src', url);
    if (hide) {
      await expect(image).not.toBeVisible();
    } else {
      await expect(image).toBeVisible();
      const inlineStyles = await image.getAttribute('style');
      expect(inlineStyles).toContain(`width: ${width}`);
      expect(inlineStyles).toContain(`height: ${height}`);
      expect(inlineStyles).toContain(`filter: ${filter}`);
    }
  }

  async assertPoweredByDeunaIsHidden() {
    await expect(this.imagePoweredByDeuna).not.toBeVisible();
  }

  async assertComputedBackgroundColor(element: Locator, expectedHex: string) {
    await computedStyle.assertComputedBackgroundColor(element, expectedHex);
  }

  // assertInputBorderColor/assertDropdownBorderColor now live on CommonsActions
  // (shared with VaultWidgetPage — see its comment there).

  // UpperTag/LowerTag's background color used to be painted on a BaseUI (V2)
  // ancestor carrying data-baseweb="notification". The Alert component now
  // defaults to V3/Tailwind (see @deuna/components-v3 Alert), which renders
  // no data-baseweb attribute at all — #upper-tag/#lower-tag IS the colored
  // element itself there. Try the legacy ancestor climb first, fall back to
  // the tag element so both design-system versions resolve correctly.
  notificationWrapperFor(tag: Locator): Locator {
    return tag.locator('xpath=ancestor::div[@data-baseweb="notification"][1]').or(tag);
  }

  async assertInputsDimensions(controls: ThemeControls) {
    await computedStyle.assertDimensionsForAll(this.inputsContainers, controls);
  }

  async assertButtonDimensions(controls: ThemeControls) {
    await computedStyle.assertDimensions(
      this.iframeZoidVisible.locator(this.buttonPayWidget),
      controls
    );
  }

  /** Maps each theme color token to the element that renders it in this widget. */
  async assertThemeColorTokens(colors: Partial<ThemeColors>) {
    if (colors.primaryTextColor) {
      await computedStyle.assertComputedColor(this.titleCardForm, 'color', colors.primaryTextColor);
    }

    if (colors.buttonPrimaryFill) {
      await computedStyle.assertComputedBackgroundColor(
        this.iframeZoidVisible.locator(this.buttonPayWidget),
        colors.buttonPrimaryFill
      );
    }

    if (colors.togglePrimaryFill) {
      await computedStyle.assertComputedBackgroundColor(
        this.checkboxToggle.first(),
        colors.togglePrimaryFill
      );
    }

    if (colors.progressPrimaryFill) {
      await computedStyle.assertComputedBackgroundColor(
        this.progressBar,
        colors.progressPrimaryFill
      );
    }

    if (colors.inputBorder) {
      await computedStyle.assertComputedColor(
        this.inputsContainers.first(),
        'border-top-color',
        colors.inputBorder
      );
    }
  }

  async assertCustomStyleTextIsVisible(text: string) {
    await expect(this.iframeZoidVisible.getByText(text)).toBeVisible({ timeout: 10000 });
  }

  async assertOrderSummaryTitleText(title: string) {
    await expect(this.labelAccordionSummary).toHaveText(title);
  }

  async assertNoInstallmentsTooltipCustomStyles(tooltip: {
    label: string;
    popoverProps: { title: string; content: string; list: string[] };
  }) {
    await this.assertCustomStyleTextIsVisible(tooltip.label);
    await this.hoverElement(this.noInstallmentTooltip);
    await this.assertNoInstallmentsPopover();
    await this.assertCustomStyleTextIsVisible(tooltip.popoverProps.title);
    await this.assertCustomStyleTextIsVisible(tooltip.popoverProps.content);
    for (const reason of tooltip.popoverProps.list) {
      await this.assertCustomStyleTextIsVisible(reason);
    }
  }

  async assertBillingCheckboxIsVisible() {
    await this.ensureVisibleToClick(this.labelChangeBilling, this.iframeZoidVisible, undefined, {
      timeout: 60000,
    });
  }

  async assertBillingCheckboxAlreadyFilledIsVisibleToClick() {
    await this.ensureVisibleToClick(
      this.labelChangeBillingAlreadyFilled,
      this.iframeZoidVisible,
      undefined,
      {
        timeout: 60000,
      }
    );
  }

  async assertBillingButtonAnyTypeIsVisibleToClick() {
    const billingButton = this.getLocator(this.labelChangeBilling, this.iframeZoidVisible).or(
      this.getLocator(this.labelChangeBillingAlreadyFilled, this.iframeZoidVisible)
    );

    await expect(
      billingButton,
      'Neither "Agregar datos" nor "Cambiar" billing button became visible'
    ).toBeVisible({ timeout: 60_000 });
    await billingButton.click();
  }

  async assertFieldsRequiredMessages() {
    await expect(this.iframeZoidVisible.locator(this.requiredFormField.first())).toBeVisible({
      timeout: 10000,
    });
  }

  async fillBillingForm() {
    await this.pressTextOnInput(this.inputDescription, 'Santa catalina', {
      iframe: this.iframeZoidVisible,
    });

    await this.ensureVisibleToClick(this.dropdownBillingState, this.iframeZoidVisible);
    await this.ensureVisibleToClick(this.optionBillingState, this.iframeZoidVisible);

    await this.ensureVisibleToClick(this.dropdownCity, this.iframeZoidVisible);
    await this.ensureVisibleToClick(this.optionCity, this.iframeZoidVisible);
  }

  async clickToSaveFormButton() {
    await this.ensureVisibleToClick(this.buttonFormSave, this.iframeZoidVisible);
  }

  async assertDiscountCodesAreVisible(codes: string[]) {
    await this.labelAccordionSummary.click();
    for (const code of codes) {
      await expect(this.iframeZoidVisible.getByText(code)).toBeVisible({
        timeout: 10000,
      });
    }
  }

  async getBillToAndShipToNames(orderId: string): Promise<{
    billToFirstName: string;
    billToLastName: string;
    shipToFirstName: string;
    shipToLastName: string;
  }> {
    console.log(`[INFO] --> Order Id to request getRequestResponseCybersource: ${orderId}`);

    // Obtain the response from Cybersource
    const requestResponseCybersource = await getRequestResponseCybersource(orderId);

    // Validate the response structure
    if (
      !requestResponseCybersource?.body?.data?.rows ||
      requestResponseCybersource.body.data.rows.length === 0
    ) {
      throw new Error('[ERROR] --> No data found in the Cybersource response');
    }

    // Extract the JSON string from the first row and parse it
    const requestBodyString = requestResponseCybersource.body.data.rows[0][0];
    const jsonData = JSON.parse(requestBodyString);

    // Validate that orderInformation exists
    if (!jsonData?.CreateDecisionManagerCaseRequest?.orderInformation) {
      throw new Error('[ERROR] --> orderInformation is missing in the response.');
    }

    const billTo = jsonData.CreateDecisionManagerCaseRequest.orderInformation.billTo;
    const shipTo = jsonData.CreateDecisionManagerCaseRequest.orderInformation.shipTo;

    if (!billTo || !shipTo) {
      throw new Error('[ERROR] --> billTo or shipTo is missing.');
    }

    return {
      billToFirstName: billTo.firstName,
      billToLastName: billTo.lastName,
      shipToFirstName: shipTo.firstName,
      shipToLastName: shipTo.lastName,
    };
  }

  async assertLastNameRemainsNotEmpty(orderId: string) {
    const { billToFirstName, billToLastName } = await this.getBillToAndShipToNames(orderId);
    expect(billToFirstName).not.toBe('');
    expect(billToLastName).not.toBe('');
    console.log('[SUCCESS] --> All values are not empty.');
  }

  async assertNamesHaveOnlyLettersAndSpaces(orderId: string) {
    const { billToFirstName, billToLastName } = await this.getBillToAndShipToNames(orderId);
    expect(billToFirstName).toMatch(/^[a-zA-Z\u00C0-\u00FF\s]+$/);
    expect(billToLastName).toMatch(/^[a-zA-Z\u00C0-\u00FF\s]+$/);
    console.log('[SUCCESS] --> All values contain only letters and spaces.');
  }

  async assertNamesHaveNoLeadingOrTrailingSpaces(orderId: string) {
    const { billToFirstName, billToLastName } = await this.getBillToAndShipToNames(orderId);
    expect(billToFirstName).toBe(billToFirstName.trim());
    expect(billToLastName).toBe(billToLastName.trim());
    console.log('[SUCCESS] --> No values have leading or trailing spaces.');
  }

  async assertNamesAreAPRO(orderId: string) {
    const { billToFirstName, billToLastName } = await this.getBillToAndShipToNames(orderId);
    expect(billToFirstName).toBe('APRO');
    expect(billToLastName).toBe('APRO');
    console.log("[SUCCESS] --> All values match 'APRO'.");
  }

  async assertAlertMissingBillingData() {
    await expect(this.iframeZoidVisible.locator(this.alertMissingBillingData)).toBeVisible({
      timeout: 10000,
    });
  }

  async assertInstallmentsMSI() {
    await this.ensureVisible(this.selectInstallMSI, {
      iframe: this.iframeZoidVisible,
      timeout: 10000,
      errorMessage: 'The msi installment dropdown is not visible',
    });
  }

  async assertAlertPurchaseGenericError() {
    await expect(this.iframeZoidVisible.locator(this.alertPurchaseGenericError)).toBeVisible({
      timeout: 10000,
    });
  }

  async assertExpiryDateErrorMessageNotVisible() {
    expect(await this.iframeZoidVisible.locator(this.labelEpiryDateInvalidMonth).isHidden());
  }

  async assertNoInstallmentsTooltip() {
    await expect(this.noInstallmentTooltip).toBeVisible({ timeout: 10000 });
  }

  async assertNoInstallmentsPopover() {
    await expect(this.noInstallmentPopover).toBeVisible({ timeout: 10000 });
  }

  async userSeesExpiryDateInvalidMonthErrorMessage() {
    expect(await this.iframeZoidVisible.locator(this.labelEpiryDateInvalidMonth).isVisible());
  }

  async assertPaymentWidgetModalNotVisible() {
    await expect(this.iframeZoid).not.toBeAttached({ timeout: 10000 });
  }

  async userSeesExpiryDateInvalidFormatMessage() {
    expect(await this.iframeZoidVisible.locator(this.labelEpiryDateInvalidFormat).isVisible());
  }

  async userSeesExpiryDateExpiredCardMessage() {
    expect(await this.iframeZoidVisible.locator(this.labelEpiryDateExpiredCard).isVisible());
  }

  async assertCorrectFieldsFromRawResponse(orderToken: string, addressComplement: string) {
    const dataInvoicesResponce = await this.getBodyInvoicesResponse(orderToken);
    const rawResponse = dataInvoicesResponce.data.rows[0][59]; // Index 59 corresponds to raw_response
    const rawResponseParsed = JSON.parse(rawResponse);
    const complement = rawResponseParsed.steps[0].raw_request.shipping.address.complement;
    console.log('Complement:', complement);
    if (complement === addressComplement) {
      console.log('The complement is correct:', complement);
    } else {
      console.log(
        'The complement does not match. Expected:',
        addressComplement,
        'Obtained:',
        complement
      );
    }
  }

  async clickOnBackAction() {
    await this.ensureVisibleToClick(this.iframeZoidVisible.locator(this.buttonBackAction));
  }

  // Workaround for the Mercado Pago anti-fraud SDK: on the first widget open the
  // SDK does not inject device_id into the purchase payload, so we close and
  // reopen. The SDK collects the fingerprint asynchronously (it calls back to
  // mercadopago/mercadolibre). On slow/headless CI that collection isn't done by
  // the time clickPay fires, so device_id goes out as "e30=" ({}). Instead of a
  // blind pre-reopen sleep, we wait AFTER reopening for the SDK's device-profiling
  // request to complete. The wait is bounded and swallows timeouts, so locally
  // (npm run onetest) it resolves fast and never hangs or changes behavior.
  async closeAndReopenPaymentWidget() {
    // Only the Mercado Pago device-fingerprint flows reopen the widget, so this is
    // the right place to start tracking MP anti-fraud profiling requests. clickPay
    // then waits for that profiling to go quiet before firing the purchase.
    this.startTrackingMercadoPagoProfiling();

    await this.clickOnBackAction();
    const modal = new ModalExperienceTypePage(this.page);

    // Wait for the widget close transition to finish before reopening, otherwise
    // the shadow-dom overlay still intercepts pointer events and the reopen (and
    // later the pay click) fails against a half-closed/merchant page.
    await this.page.waitForTimeout(8000);

    await modal.selectExperienceTypeAndConfirm('Payment Widget');
  }

  // Records the timestamp of the last Mercado Pago anti-fraud request. Installed only
  // for MP fingerprint flows (via closeAndReopenPaymentWidget) so non-MP tests pay no
  // cost. Per-test instance, so nothing leaks between tests.
  private lastMercadoPagoRequestAt: number | null = null;
  private mercadoPagoTrackerInstalled = false;

  private startTrackingMercadoPagoProfiling() {
    if (this.mercadoPagoTrackerInstalled) return;
    this.mercadoPagoTrackerInstalled = true;
    this.lastMercadoPagoRequestAt = Date.now();
    this.page.on('request', (req) => {
      if (/mercado(pago|libre|livre)\.com/.test(req.url())) {
        this.lastMercadoPagoRequestAt = Date.now();
      }
    });
  }

  // Arms the console listener before the action that triggers the close, since
  // the widget can emit 'onClosed userAction' faster than the test reaches the
  // next line — registering the listener after the click races the event.
  armWidgetClosedListener() {
    return this.waitForConsoleMessage('onClosed userAction');
  }

  async assertWidgetIsClosed(widgetClosedEvent: Promise<ConsoleMessage>) {
    const closedMessage = await widgetClosedEvent;
    expect(closedMessage.text()).toContain('onClosed userAction');
  }

  async assertEventWasFired(
    event: string,
    bodyValidator?: (body: Record<string, unknown>) => boolean
  ) {
    let body: Record<string, unknown> = {};

    let success = false;

    await this.page.waitForRequest(
      (request) => {
        const url = request.url();
        const method = request.method();
        const postData = request.postData();

        if (url.includes('/track') && method === 'POST' && postData) {
          try {
            body = JSON.parse(postData);
            success = body.event === event && body.channel === 'web';
            return success;
          } catch {
            return false;
          }
        }
        return false;
      },
      { timeout: 30000 }
    );

    if (success && bodyValidator) {
      expect(bodyValidator(body)).toBeTruthy();
    } else {
      expect(success).toBeTruthy();
    }
  }

  assertMissingBillingModuleEventWasFired() {
    return this.waitForConsoleMessage(
      `onEventDispatch ${CheckoutEventsName.errorMissingBillingModule}`
    );
  }

  async assertMissingCardInfoEventWasFired(options: { present: string[]; absent?: string[] }) {
    await this.assertEventWasFired(CheckoutEventsName.errorMissingCardInfo, (body) => {
      const missingInputs = (
        (body.properties as Record<string, unknown>).metadata as Record<string, unknown>
      ).missingInputs as string[];
      return (
        options.present.every((f) => missingInputs.includes(f)) &&
        (options.absent ?? []).every((f) => !missingInputs.includes(f))
      );
    });
  }

  async assertMissingBillingInfoEventWasFired(requiredFields: string[]) {
    await this.assertEventWasFired(CheckoutEventsName.errorMissingBillingInfo, (body) => {
      const missingInputs = (
        (body.properties as Record<string, unknown>).metadata as Record<string, unknown>
      ).missingInputs as string[];
      return requiredFields.every((f) => missingInputs.includes(f));
    });
  }

  async assertEventWasFiredOnlyAFewTimes(
    event: string,
    numberOfValidEvents: number = 2,
    bodyValidator?: (body: Record<string, unknown>) => boolean
  ) {
    let firstBody: Record<string, unknown> = {};
    let count = 0;

    const matches = (request: any): boolean => {
      const url = request.url();
      const method = request.method();
      const postData = request.postData();
      if (!(url.includes('/track') && method === 'POST' && postData)) return false;
      try {
        const body = JSON.parse(postData);
        const ok = body.event === event && body.channel === 'web';
        if (ok) {
          count += 1;
          if (count === 1) firstBody = body;
        }
        return ok;
      } catch {
        return false;
      }
    };

    const onRequest = (request: any) => {
      matches(request);
    };

    this.page.on('request', onRequest);

    try {
      await this.page.waitForEvent('request', { predicate: matches, timeout: 15000 });

      await this.page.waitForTimeout(5000);
    } finally {
      this.page.off('request', onRequest);
    }

    if (count === 0) {
      expect(count).toBe(numberOfValidEvents);
      return;
    }

    if (bodyValidator) {
      expect(bodyValidator(firstBody)).toBeTruthy();
    }

    expect(count).toBeLessThanOrEqual(numberOfValidEvents);
  }

  async selectReferenceCountry(country: string = 'EC') {
    await this.ensureVisibleToClick(
      this.dropdownReferenceCountry,
      undefined,
      'The reference country dropdown is not visible',
      { timeout: 60_000 }
    );

    const option = this.dropdownReferenceCountry
      .getByTestId(`dropdown-item-${country}`)
      .or(this.dropdownReferenceOptionContainer.getByTestId(`dropdown-item-${country}`)); // migration-or
    await this.ensureVisibleToClick(option);
  }

  async assertDropdownReferenceCountryToBeVisible() {
    await expect(this.dropdownReferenceCountry).toBeVisible({ timeout: 5_000 });
  }

  async assertReferenceCountryIsHidden() {
    await expect(this.dropdownReferenceCountry).not.toBeVisible();
  }

  async assertReferenceLogoIsVisible(alt: string) {
    const logo = this.iframeZoidVisible.locator(`img[title="${alt}"]`);
    await expect(logo).toBeVisible({ timeout: 20_000 });
  }

  async assertInstallmentsDeselectedPayload({
    metadata,
    amount,
    cardBin,
    country,
  }: InstallmentsDeselectedPayloadParams) {
    const displayAmount = convertCurrency(amount, country);

    const expectedPayload = {
      cardBin,
      cardIndex: 0,
      installments: 1,
      planOptionId: '00000000-0000-0000-0000-000000000000',
    };

    expect(metadata[CheckoutEventsName.onInstallmentSelected]).toEqual(expectedPayload);
  }

  async assertPaymentProcessingdPayload({
    metadata,
    methodType,
    processorName,
  }: PaymentProcessingPayloadParams) {
    const expectedPayload = {
      methodType,
      processorName,
    };

    await expect(metadata[CheckoutEventsName.paymentProcessing]).toEqual(expectedPayload);
  }

  async assertNextActionIsPresent() {
    const response = await waitForPurchaseResponse(this.page, { timeout: 80000 });
    const responseBody = await response.json();
    expect(responseBody.order.payment.data).toHaveProperty('next_action');
    expect(responseBody.order.payment.data.next_action).not.toBeNull();
    expect(Object.keys(responseBody.order.payment.data.next_action).length).toBeGreaterThan(0);
    console.log('[SUCCESS] next_action is present and is not empty or null');
  }

  async assertErrorPopupCopy() {
    await this.ensureVisible(this.errorNotificationContainer, {
      iframe: this.iframeZoidVisible,
      timeout: 60000,
    });
  }

  async selectSpeiTab() {
    await this.ensureVisibleToClick(this.buttonSpeiTab, this.iframeZoidVisible);
  }

  async assertRedirectPage() {
    await this.ensureVisible(this.labelRedirectPageTitle, {
      iframe: this.iframeZoidVisible,
    });
  }

  async assertCreateCardResponse(response: Response) {
    expect(response.status()).toBe(201);
    const responseJson = await response.json();

    expect(responseJson.data.id).toBeTruthy();
    expect(responseJson.data.user_id).toBeTruthy();
    expect(responseJson.data.card_holder).toBeTruthy();
    expect(responseJson.data.card_holder_dni).toBeTruthy();
    expect(responseJson.data.company).toBeTruthy();
    expect(responseJson.data.last_four).toBeTruthy();
    expect(responseJson.data.first_six).toBeTruthy();
    expect(responseJson.data.expiration_date).toBeTruthy();
    expect(responseJson.data.is_valid).toBe(false);
    expect(responseJson.data.is_expired).toBe(false);
    expect(responseJson.data.verified_at).toBeTruthy();
    expect(responseJson.data.last_used).toBeTruthy();
    expect(responseJson.data.bank_name).toBeTruthy();
    expect(responseJson.data.country_iso).toBeTruthy();
    expect(responseJson.data.card_type).toBeTruthy();
    expect(responseJson.data.source).toBeTruthy();
    expect(responseJson.data.zip_code).toBeTruthy();
    expect(responseJson.data.is_default).toBe(false);
  }

  async assertBINAndLastFourInPurchaseOrder(bin: string, lastFour: string) {
    const responsePurchase = await this.responsePromise;
    const responsePurchaseBody = await responsePurchase.json();

    console.log('Response Body completo:', JSON.stringify(responsePurchaseBody, null, 2));

    const fromCard =
      responsePurchaseBody.payment?.data?.from_card ??
      responsePurchaseBody.order?.payment?.data?.from_card ??
      responsePurchaseBody.data?.from_card ??
      responsePurchaseBody.from_card;

    expect(
      fromCard,
      `No se pudo encontrar información de la tarjeta en la respuesta. Estructura disponible: ${Object.keys(
        responsePurchaseBody
      ).join(', ')}`
    ).toBeDefined();
    expect(fromCard.first_six, 'BIN (first 6 digits)').toEqual(bin);
    expect(fromCard.last_four, 'Last 4 digits').toEqual(lastFour);
  }

  async isIdentityDocumentTypeDropdownExpanded() {
    if ((await this.identityDocumentTypeDropdownExpandable.count()) === 0) {
      return false;
    }

    return (
      (await this.identityDocumentTypeDropdownExpandable.getAttribute('aria-expanded')) === 'true'
    );
  }

  async assertAndClickIdentityDocumentTypeDropdown() {
    await expect(
      this.identityDocumentTypeDropdown,
      'CHK: identityDocumentTypeDropdown is not visible'
    ).toBeVisible();

    if (!(await this.isIdentityDocumentTypeDropdownExpanded())) {
      await this.identityDocumentTypeDropdown.click();
    }
  }

  async selectIdentityDocumentType(countryCode: string, documentType: string) {
    await this.assertAndClickIdentityDocumentTypeDropdown();
    const option = this.getIdentityDocumentOptionLocator(countryCode, documentType);
    await this.ensureVisibleToClick(
      option,
      undefined,
      `CHK: identityDocumentOptionLocator ${countryCode} - ${documentType} is not visible`
    );
  }

  async closeIdentityDocumentTypeDropdownIfOpen() {
    if (await this.isIdentityDocumentTypeDropdownExpanded()) {
      await this.identityDocumentTypeDropdown.click();
    }
  }

  async assertInputDocumentNumberIsEmpty() {
    await expect(this.iframeZoidVisible.locator(this.inputDocumentNumber)).toHaveValue('');
  }

  async assertInputDocumentNumberHasValue(value: string) {
    await expect(this.iframeZoidVisible.locator(this.inputDocumentNumber)).toHaveValue(value);
  }

  async blurInputDocumentNumber() {
    await this.iframeZoidVisible.locator(this.inputDocumentNumber).blur();
  }

  async clearInputDocumentNumber() {
    await this.clearInputField(this.inputDocumentNumber, this.iframeZoidVisible);
  }

  getIdentityDocumentOptionLocator(countryCode: string, documentType: string) {
    return this.iframeZoidVisible.getByTestId(
      `dropdown-item-${countryCode.toUpperCase()}_${documentType.toUpperCase()}`
    );
  }

  async getPurchaseRequestPayload() {
    const req = await this.requestPurchase;
    if (typeof (req as any).postDataJSON === 'function') {
      return (req as any).postDataJSON();
    }
    const raw = req.postData();
    return raw ? JSON.parse(raw) : null;
  }

  async clickDeleteCardOption(lastFour: string, expectedText?: string) {
    const option = this.buttonDeleteCardOption(lastFour);

    if (expectedText) {
      await expect(option).toHaveText(expectedText);
    }
    await this.ensureVisibleToClick(option);
  }

  async clickConfirmDeleteCard() {
    await this.buttonConfirmDeleteCard.click();
  }

  async clickCancelDeleteCard(cancelText: string) {
    await this.iframeZoidVisible.getByText(cancelText).click();
  }

  async waitForAlertContainerVisible(timeout = 5000) {
    await expect(this.alertContainer).toBeVisible({ timeout });
  }

  async waitForSuccessAlertVisible(timeout = 10000) {
    await expect(this.alertContainerSuccess).toBeVisible({ timeout });
  }
}
