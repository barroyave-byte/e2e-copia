import { FrameLocator, Locator, Page, Response, expect } from '@playwright/test';
import { BaseCreditCard, FillCardFormOptions } from '@support/interfaces/credit_cards';
import { DEFAULT_DOCUMENT_BY_COUNTRY } from '@support/constants/identityDocuments';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { getTranslations } from '@translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';
import { CommonsActions } from '@pages/commonActions';

import envConfig from '@support/envConfig';
import { LinkLocator } from '@support/interfaces/vaultWidgetPage';
import { VaultTranslations } from '@support/translations/selectors/explore/vault/vaultTranslations';
import { hexToRgb } from '@pages/helpers/hexToRgb';
import { normalizeColor } from '@pages/helpers/cssColor';
import * as computedStyle from '@pages/helpers/computedStyle';
import { ThemeControls } from '@support/interfaces/CheckoutConfigurationV2';
import { retryOperation } from '@support/utils/retries';
import { PURCHASE_URL_PATTERN, isV2PurchaseRequest } from '@support/utils/purchase-contracts';
import { EventCapture } from '@framework/plugins/analytics/EventCapture';

const expectedTermsConditionsURL =
  'https://legal.deuna.com/docs/t%C3%A9rminos-y-condiciones-de-los-sitios-de-e-commerce-provistos-por-fortcar-sa';
const expectedPrivacyPolicyURL = 'https://legal.deuna.com/docs/pol%C3%ADtica-de-privacidad';

interface EventMetadataParams<M = {}> {
  metadata: M;
  eventName: string;
  expectedPayload: M;
}

interface LegalContent {
  [key: string]: { title: string; url: string; linkLocator: Locator };
}

const VAULT_IFRAME_SELECTOR =
  "xpath=//iframe[contains(@src, 'vault')] | //iframe[@data-testid='d_una_checkout'] | //iframe[contains(@class, 'zoid-visible')]";

const CARDS_URL_PATTERN = '**/users/*/cards';
const PURCHASE_V2_URL_PATTERN = '**/v2/merchants/orders/purchase';

const CAPTURE_PATTERNS = {
  createCard: CARDS_URL_PATTERN,
  purchase: PURCHASE_V2_URL_PATTERN,
} as const;

type CaptureType = keyof typeof CAPTURE_PATTERNS;

export class VaultWidgetPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: VaultTranslations;
  readonly modalContainer: Locator;
  private readonly POLL_TIMEOUT = process.env.CI ? 15000 : 5000;

  readonly btnClose: Locator;
  readonly btnPay: Locator;
  readonly buttonSeeMoreCards: Locator;
  readonly addCardButton: Locator;
  readonly buttonSendOtpByEmail: Locator;
  readonly buttonSendOtpBySMS: Locator;
  readonly closeElementsWidgetButton: Locator;
  readonly confirmButton: Locator;
  readonly continueAsGuestButton: Locator;
  readonly buttonResendOtpCode: Locator;
  readonly buttonClearInput: Locator;
  readonly buttonChangeChannel: Locator;
  readonly buttonSetCardAsDefault: (lastFour: string) => Locator;
  readonly buttonCardActionsTrigger: (lastFour: string) => Locator;
  readonly buttonCardDeleteOption: (lastFour: string) => Locator;
  readonly cardActionsPanel: (lastFour: string) => Locator;
  readonly triggerRemoveSelectedCard: Locator;
  readonly buttonRemoveSelectedCard: Locator;
  readonly buttonConfirmDeleteCard: Locator;
  readonly buttonGetBack: Locator;
  readonly buttonAddNewCard: Locator;
  readonly buttonPayWithTwoCards: Locator;
  readonly buttonContinueWithCard2: Locator;
  readonly checkboxBillingPattern: Locator;
  readonly buttonContinueWithThePaymentSummary: Locator;
  readonly buttonArrowBackToSinglePayment: Locator;
  readonly buttonAddProduct: Locator;
  readonly buttonRemoveProduct: Locator;
  readonly buttonAddCardContainer: Locator;
  readonly buttonIconAddNewCard: Locator;
  readonly buttonAddBillingData: Locator;
  readonly buttonUpdateBillingData: Locator;
  readonly buttonClearCardNumber: Locator;
  readonly buttonClearCvv: Locator;
  readonly buttonClearCardHolder: Locator;
  readonly buttonClearIdentityNumber: Locator;
  readonly buttonClearExpirationDate: Locator;
  readonly buttonPaySummary: Locator;

  readonly inputCardNumber: Locator;
  readonly inputExpDate: Locator;
  readonly inputCVV: Locator;
  readonly inputCardHolder: Locator;
  readonly inputIdentityNumber: Locator;
  readonly inputAdjustAmount: Locator;
  readonly inputAdjustAmountCard1: Locator;
  readonly inputAdjustAmountCard2: Locator;
  readonly inputCard1AmountError: Locator;
  readonly inputTotalToPay: Locator;
  readonly titleAmountToPay: Locator;
  readonly inputsContainers: Locator;
  readonly inputAddress1: Locator;

  readonly labelSummaryTitle: Locator;
  readonly labelAlertInfoNotification: Locator;
  readonly labelCardNumber: Locator;
  readonly labelFilteredCardNumbers: Locator;
  readonly labelSelectedCardTitle: Locator;
  readonly labelSelectedCardLastFourDigits: Locator;
  readonly labelErrorViewTitle: Locator;
  readonly labelErrorViewDescription: Locator;
  readonly labelLoadingInstallments: Locator;
  readonly labelBillingTitle: Locator;

  readonly selectInstallments: Locator;
  readonly selectCards: Locator;
  readonly selectableCards: Locator;
  readonly selectDefaultCard: Locator;
  readonly selectBillingState: Locator;
  readonly selectCity: Locator;
  readonly cityInput: Locator;

  readonly checkboxSaveCard: Locator;
  readonly checkboxSaveCardAsDefault: Locator;

  readonly privacyPolicy: Locator;
  readonly termsAndConditions: Locator;
  readonly paymentPageTitle: Locator;
  readonly paymentPageSubTitle: Locator;
  readonly cvvInput: Locator;
  readonly otpPageTitle: Locator;
  readonly inputCodeOtp: Locator;
  readonly inputInstallments: Locator;
  readonly stepperSplitPayments: Locator;
  readonly stepperSplitPaymentProgressBar: Locator;
  readonly labelSplitPaymentCardDetails: Locator;
  readonly labelSplitPaymentSummaryCard1: Locator;
  readonly labelSplitPaymentSummaryCard2: Locator;
  readonly loaderContainer: Locator;

  readonly containerSelectedCard: Locator;

  readonly privacyPolicyLink: Locator;
  readonly termsConditionsLink: Locator;
  readonly titleE2E: Locator;
  readonly termsAndConditionsExternalPageTitle: Locator;
  readonly privacyPolicyExternalPageTitle: Locator;
  readonly titleMainView: Locator;
  readonly withoutInstallments: Locator;
  readonly openInstallmentsDropdown: Locator;
  readonly alertsModal: Locator;

  readonly iframeVault: FrameLocator;
  readonly iframeVaultElement: Locator;

  readonly iconSuccessValidator: Locator;
  readonly iconErrorValidator: Locator;

  readonly labelInvalidCardHolder: Locator;

  readonly labelCardIdentityDocument: Locator;
  readonly captionIdentityNumberError: Locator;

  readonly buttonBackToCardForm: Locator;
  readonly inputNameBillingForm: Locator;
  readonly buttonSaveBillingForm: Locator;
  readonly inputPhone: Locator;
  readonly selectDropdownCountry: Locator;
  readonly imageCardIcon: Locator;
  readonly logoCardIcon: Locator;
  readonly logoDefaultCardIcon: Locator;

  responsePurchaseV1: any;
  requestPurchaseV1: any;
  responsePurchaseV2: any;
  requestPurchaseV2: any;
  requestCreateCard: any;
  responseCreateCard: any;
  responseCards: any;
  responseCardsFirst: any;
  responseInstallments: any;
  responseAllCards: any;
  responseInstallmentsResponse: any;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore/vault', languageCode);
    this.iframeVault = page.frameLocator(VAULT_IFRAME_SELECTOR);
    this.iframeVaultElement = page.locator(VAULT_IFRAME_SELECTOR).first();
    this.continueAsGuestButton = this.iframeVault.locator(
      '[data-testid="continue-as-guest-button"]'
    );
    this.buttonResendOtpCode = this.iframeVault.getByTestId('resend_button');
    this.buttonChangeChannel = this.iframeVault.locator(
      '[data-testid="change-otp-channel-button"]'
    );
    this.btnClose = page.locator("button[id='base button']");
    this.btnPay = this.iframeVault.locator("button[id='vault_payment_button']");
    this.selectInstallments = page.getByRole('button', {
      name: `${this.selectors.screenVaultWidgetPage.buttonInstallmentsMSI}`,
    });
    this.buttonClearInput = this.iframeVault.locator('div[data-testid="close"]');
    this.buttonClearCardNumber = this.iframeVault
      .locator('div[data-testid="card_number-clear"]')
      .or(this.iframeVault.locator('button[data-testid="card_number-clear"]'));
    this.buttonClearCvv = this.iframeVault
      .locator('div[data-testid="cvv-clear"]')
      .or(this.iframeVault.locator('button[data-testid="payment-methods-cvv-input-clear"]')); // migration-or
    this.buttonClearExpirationDate = this.iframeVault
      .locator('div[data-testid="expiration_date-clear"]')
      .or(
        this.iframeVault.locator(
          'button[data-testid="payment-methods-expiration-date-input-clear"]'
        )
      ); // migration-or
    this.buttonClearIdentityNumber = this.iframeVault
      .getByTestId('card_holder_dni-enhancer')
      .or(this.iframeVault.locator('div[data-testid="card_holder_dni-clear"]'))
      .or(this.iframeVault.locator('button[data-testid="card_holder_dni-clear"]'));
    this.buttonClearCardHolder = this.iframeVault
      .locator('div[data-testid="card_holder-clear"]')
      .or(this.iframeVault.locator('button[data-testid="payment-methods-card-holder-clear"]')); // migration-or

    this.inputInstallments = this.iframeVault.locator(
      'div[data-testid="dropdown-input-installments"]'
    );
    this.labelLoadingInstallments = page.locator(
      `h2:has-text("${this.selectors.screenVaultWidgetPage.labelLoadingInstallments}")`
    );
    this.inputCardNumber = this.iframeVault.locator('[data-baseweb="payment-card-input"] > input');
    this.inputExpDate = this.iframeVault.locator('[id="payment-methods-expiration-date-input"]');
    this.inputCVV = this.iframeVault.locator('[id="payment-methods-cvv-input"]');
    this.inputCardHolder = this.iframeVault.locator("input[id='payment-methods-card-holder']");
    this.inputIdentityNumber = this.iframeVault
      .locator("input[id='payment-methods-identity-number']")
      .or(this.iframeVault.locator('[data-testid="card_holder_dni-value-input"]'))
      .or(this.iframeVault.locator('[data-testid="card_holder_dni-input"]'));
    this.loaderContainer = this.page.locator('.deuna-loader-container');
    this.cvvInput = this.iframeVault.locator(
      "input[id='user-card-cvv-input'], input[id='cvv-user-card-cvv-input']"
    );
    this.inputCodeOtp = this.iframeVault.locator("input[id='otp-input-0']");

    this.privacyPolicy = this.iframeVault.locator("text='Políticas de privacidad'");
    this.termsAndConditions = this.iframeVault.getByTestId('terms-conditions-disclaimer');
    this.paymentPageTitle = this.iframeVault.locator("text='Pago con tarjeta crédito o débito'");
    this.paymentPageSubTitle = this.iframeVault.locator("text='Ingresa los datos de tu tarjeta'");
    this.otpPageTitle = this.iframeVault.locator("text='Ingresa el código enviado a tu teléfono'");
    this.buttonSeeMoreCards = this.iframeVault.getByTestId('see-all-cards-button');
    this.buttonAddNewCard = this.iframeVault.locator('p[data-testid="add-card-button"]');
    this.buttonIconAddNewCard = this.iframeVault
      .locator('div[data-testid="add_circle_outline"]')
      .or(this.iframeVault.locator('svg[data-testid="add_circle_outline"]'));
    this.buttonSendOtpByEmail = this.iframeVault.locator('#send-by-email');
    this.buttonSendOtpBySMS = this.iframeVault.locator('#send-by-sms');
    this.closeElementsWidgetButton = page.locator("[id='close-elements-widget']");
    this.confirmButton = page.locator("text='Confirmar'");

    this.modalContainer = page.locator("[id='vault_modal_container']");

    this.alertsModal = this.iframeVault.locator("div[data-baseweb='modal']");
    this.privacyPolicyLink = this.iframeVault.locator('a[data-testid="privacy-policy-link"]');
    this.withoutInstallments = this.iframeVault.locator(
      "[id='00000000-0000-0000-0000-000000000000']"
    );
    this.termsConditionsLink = this.iframeVault.locator('a[data-testid="terms-conditions-link"]');

    this.openInstallmentsDropdown = this.iframeVault
      .locator('svg[data-baseweb="icon"][title="Down"]')
      .or(this.iframeVault.locator('[data-testid="dropdown-chevron-installments"]')); // migration-or
    this.titleMainView = this.iframeVault.getByText(
      this.selectors.screenVaultWidgetPage.titleMainView
    );

    // Retro-compatible saved-card list. Older consumers still render the BaseUI
    // accordion (panels); the migrated one renders a V3 Radio group (options as
    // <label>). Match either structure so the shared POM works across versions.
    const cardsAccordionRoot = this.iframeVault.locator('[data-baseweb="accordion"]');
    // Scope to the saved-cards radiogroup only (the one containing card-<lastFour>).
    // The legacy accordion renders a per-card inner Radio (its own role=radiogroup)
    // whose card testid sits OUTSIDE it, so those are excluded here.
    const cardsRadioRoot = this.iframeVault.locator(
      '[role="radiogroup"]:has([data-testid^="card-"])'
    );
    const cardRows = cardsAccordionRoot
      .locator('li, [data-testid="accordion-panel"]')
      .or(cardsRadioRoot.locator('label'));

    this.selectCards = cardsAccordionRoot.or(cardsRadioRoot);
    this.selectableCards = cardRows
      .filter({ hasNotText: 'Predeterminada' })
      .filter({ hasNotText: 'Tarjeta expirada' });

    // TODO: Drop the `.or()` fallbacks once Elements ships the Popover V3 card
    // actions menu (ENTP1-18142); until then its build has no per-option testids.
    this.buttonSetCardAsDefault = (lastFour: string) =>
      this.iframeVault
        .getByTestId(`card-action-set-default-${lastFour}`)
        .or(this.iframeVault.getByText('Tarjeta predeterminada'));
    this.buttonCardActionsTrigger = (lastFour: string) =>
      this.iframeVault.getByTestId(`card-actions-${lastFour}-trigger`).or(
        this.iframeVault.getByRole('button', {
          name: `Ver más opciones **** ${lastFour}`,
          exact: true,
        })
      );
    this.buttonCardDeleteOption = (lastFour: string) =>
      this.iframeVault.getByTestId(`card-action-delete-${lastFour}`);
    this.cardActionsPanel = (lastFour: string) =>
      this.iframeVault.getByTestId(`card-actions-${lastFour}-panel`);
    // Single-card view: the kebab beside the selected card and its delete entry.
    this.triggerRemoveSelectedCard = this.iframeVault.getByTestId(
      'icon-remove-selected-card-trigger'
    );
    this.buttonRemoveSelectedCard = this.iframeVault.getByTestId('remove-card-button');
    // TODO: Add data-testid in the UI and migrate this selector
    this.buttonConfirmDeleteCard = this.iframeVault.getByRole('button', { name: 'Confirmar' });
    this.selectDefaultCard = cardRows.filter({ hasText: 'Predeterminada' });
    this.checkboxSaveCard = this.iframeVault.locator('#save_card_checkbox');
    this.checkboxSaveCardAsDefault = this.iframeVault.locator(
      '#set_card_as_predetermined_checkbox'
    );
    this.buttonGetBack = this.iframeVault.locator('button[data-testid="top-area-back-btn"]');
    this.buttonPaySummary = page.locator('button:has-text("Pagar")').nth(1);
    this.labelFilteredCardNumbers = this.iframeVault
      .locator('div:has-text("👀 Pagar con")')
      .locator('div p')
      .filter({ hasText: /\*{4}\s\d{4}/ });
    this.labelErrorViewTitle = this.iframeVault.getByText(
      this.selectors.screenErrorView.labelErrorViewTitle
    );
    this.labelErrorViewDescription = this.iframeVault.getByText(
      this.selectors.screenErrorView.labelErrorViewDescription
    );
    this.inputsContainers = this.iframeVault
      .locator('div[data-baseweb="input"]')
      .or(this.iframeVault.locator('[data-testid="payment-card-input"]'))
      .or(this.iframeVault.locator('[data-testid$="-input-container"]'));
    this.labelBillingTitle = this.iframeVault.getByText(this.selectors.screenBillingData.title);
    this.selectBillingState = page.locator('#dropdown-billing-state');
    this.selectCity = this.iframeVault.getByTestId('dropdown-input-city');
    this.cityInput = this.iframeVault
      .locator('[data-testid="dropdown-input-city"] #dropdown-search-wrapper')
      .or(this.iframeVault.locator('[data-testid="dropdown-input-city"]'));
    this.inputAddress1 = page.locator('#input-billing-address1');
    this.inputPhone = this.iframeVault
      .locator('[name="phone"]')
      .or(this.iframeVault.locator('[data-testid="input-billing-phone-value-input"]')); // migration-or
    this.selectDropdownCountry = this.iframeVault.locator(
      '[data-testid="dropdown-input-custom-select-dropdown"]'
    );
    this.imageCardIcon = this.iframeVault
      .locator('[data-testid="selected-card-container"]')
      .locator('img');
    this.logoCardIcon = this.iframeVault.locator('img[alt="credit card icon"]');
    this.logoDefaultCardIcon = this.iframeVault
      .locator('img[alt="Card"]')
      .or(this.iframeVault.locator('[data-testid="card-franchise-indicator"]'));
    this.buttonPayWithTwoCards = page.locator('[data-testid="split-payment-button"]');
    this.buttonContinueWithCard2 = page
      .locator('[data-testid="split-continue-to-step-2"]')
      .or(this.iframeVault.locator('[data-testid="split-continue-to-step-2"]'));
    this.buttonContinueWithThePaymentSummary = page
      .locator('[data-testid="split-continue-to-step-3"]')
      .or(this.iframeVault.locator('[data-testid="split-continue-to-step-3"]'));
    this.checkboxBillingPattern = this.iframeVault.getByTestId('use-same-billing-checkbox');
    this.labelSummaryTitle = page.locator('[data-testid="summary-title"]');
    this.inputAdjustAmount = this.iframeVault.locator('input[id^="card-currency-input-"]');
    this.inputAdjustAmountCard1 = this.iframeVault
      .locator('[data-testid="card-amount-row-0"]')
      .locator('input');
    this.inputAdjustAmountCard2 = this.iframeVault
      .locator('[data-testid="card-amount-row-1"]')
      .locator('input');
    this.inputCard1AmountError = this.iframeVault.locator('[data-testid="card-error-message-0"]');
    this.inputTotalToPay = this.iframeVault.getByTestId('total-amount-value');
    this.titleAmountToPay = this.iframeVault.getByTestId('total-amount-label');
    this.buttonArrowBackToSinglePayment = page
      .locator('[data-testid="arrow_back_ios"]')
      .or(page.locator('[data-testid="back-to-single-payment-button"]'));
    this.buttonAddProduct = page.locator('[data-testid="add-item-to-cart"]');
    this.buttonRemoveProduct = page.locator('[data-testid="remove-item-from-cart"]');
    this.labelAlertInfoNotification = page.locator(
      '#alert-container-notification-info, #alert-container'
    );
    this.labelCardNumber = this.iframeVault.locator('[for="card_number"]');
    this.labelSelectedCardTitle = this.iframeVault.locator('[data-testid="selected-card-title"]');
    this.labelSelectedCardLastFourDigits = this.iframeVault.locator(
      '[data-testid="selected-card-last-four"]'
    );
    this.containerSelectedCard = this.iframeVault.locator(
      '[data-testid="selected-card-container"]'
    );
    this.iconSuccessValidator = this.iframeVault.locator(
      '[data-testid="check"], [data-testid$="-check-icon"]'
    );
    this.iconErrorValidator = this.iframeVault.locator(
      '[data-testid="exclamation"], [data-testid="input-error-icon"], [data-testid$="-error-icon"]'
    );
    this.buttonAddBillingData = this.iframeVault.locator('#btn-add-billing-data');
    this.buttonUpdateBillingData = this.iframeVault.locator(
      '[data-testid="btn-update-billing-data"]'
    );
    this.stepperSplitPayments = this.iframeVault.locator('[data-testid="split-payment-stepper"]');
    this.stepperSplitPaymentProgressBar = this.iframeVault.locator('[data-baseweb="progress-bar"]');
    this.labelSplitPaymentCardDetails = this.iframeVault.locator('[data-testid="card-details"]');
    this.labelSplitPaymentSummaryCard1 = this.iframeVault.locator('[data-testid="card-info-1"]');
    this.labelSplitPaymentSummaryCard2 = this.iframeVault.locator('[data-testid="card-info-2"]');
    this.labelInvalidCardHolder = this.iframeVault.getByText(
      this.selectors.screenVaultWidgetPage.labelInvalidCardHolder
    );

    this.labelCardIdentityDocument = this.iframeVault
      .getByTestId('card_holder_dni-label')
      .or(this.iframeVault.getByTestId('dropdown-label-card_holder_dni'));
    this.captionIdentityNumberError = this.iframeVault
      .locator('[data-testid="card_holder_dni-caption"]')
      .or(this.iframeVault.locator('#card_holder_dni-error'));

    this.buttonBackToCardForm = this.iframeVault.getByText(
      this.selectors.screenVaultWidgetPage.buttonBackToCardForm
    );
    this.inputNameBillingForm = this.iframeVault.locator('#input-billing-first-name');
    this.buttonSaveBillingForm = this.iframeVault.getByRole('button', {
      name: this.selectors.screenVaultWidgetPage.buttonSaveBillingForm,
    });
  }

  async assertSecondCardLabel(
    component: Locator,
    maxRetries: number = 3,
    retryDelay: number = 4000
  ): Promise<void> {
    await retryOperation(this.page, component, maxRetries, retryDelay);
  }

  async getFrameURL() {
    const url = this.page
      .frames()
      .find((frame) => frame.url().includes('vault'))
      .url();
    return new URL(url);
  }

  async genericErrorPageIsShown() {
    const errorTitle = await this.iframeVault.locator('h1');
    await expect(errorTitle).toContainText('¡Algo salió mal!');
  }

  async genericErrorIsShown() {
    const errorModal = await this.alertsModal;
    await errorModal.waitFor({ state: 'visible', timeout: this.POLL_TIMEOUT });
    await expect(errorModal).toBeVisible();
    const errorTitle = await errorModal.locator('h3[data-baseweb="typo-headinglarge"]');
    await expect(errorTitle).toContainText('¡Algo salió mal!');
  }

  async expectExpDateIsEmpty() {
    await expect(this.inputExpDate).toHaveValue('');
  }

  async validateInputStyles() {
    await expect(this.inputsContainers).toHaveClass('validated');
  }

  async clickClearButton() {
    await this.buttonClearExpirationDate.click();
  }
  async expectClearInputIsHidden() {
    await expect(this.buttonClearInput).toBeHidden();
  }
  async expectSuccessValidatorCount(expectedCount: number) {
    await expect
      .poll(() => this.iconSuccessValidator.locator(':visible').count(), {
        timeout: this.POLL_TIMEOUT,
      })
      .toBeGreaterThanOrEqual(expectedCount);
  }

  async expectLoaderIsNotVisible() {
    await this.ensureElementLoaderIsVisibleAndHidden(this.loaderContainer);
  }

  async expectErrorValidatorCount(expectedCount: number) {
    await expect
      .poll(() => this.iconErrorValidator.locator(':visible').count(), {
        timeout: this.POLL_TIMEOUT,
      })
      .toBe(expectedCount);
  }

  async expectExpDateHasErrorState() {
    const ariaInvalid = await this.inputExpDate.getAttribute('aria-invalid');
    if (ariaInvalid !== null) {
      await expect(this.inputExpDate).toHaveAttribute('aria-invalid', 'true');
    } else {
      await this.expectErrorValidatorCount(1);
    }
  }

  async expectClearableCount() {
    await expect(this.buttonClearCardNumber).toBeVisible();
    await expect(this.buttonClearCvv).toBeVisible();
    await expect(this.buttonClearCardHolder).toBeVisible();
    await expect(this.buttonClearIdentityNumber).toBeVisible();
    await expect(this.buttonClearExpirationDate).toBeVisible();
  }
  async expectSuccessValidatorIsHidden() {
    await expect(this.iconSuccessValidator).toBeHidden();
  }

  async getSessionCredentials() {
    const cdlBaseUrl = envConfig.CDL_URL;
    await this.page.waitForTimeout(10000);
    const storageState = await this.page.context().storageState();
    const state = storageState.origins.find((e) => e.origin === cdlBaseUrl)?.localStorage;
    const sessionId = state.find((e) => e.name === 'sessionId')?.value;

    return { sessionId: sessionId, deviceId: '' };
  }

  async expectLogoCardIconIsVisible(isFranchiseCard?: boolean) {
    if (isFranchiseCard) {
      await expect(this.logoCardIcon).toBeVisible();
    } else {
      await expect(this.logoDefaultCardIcon).toBeVisible();
    }
  }

  async assertSavedCardIsVisible(expectedCardNumbers: string) {
    await expect(this.labelSelectedCardTitle).toBeVisible({ timeout: 60000 });
    await expect(this.labelSelectedCardLastFourDigits).toHaveText(expectedCardNumbers);
  }

  /**
   * The backend does not guarantee which of the user's saved cards becomes
   * the pre-selected default for the second split-payment slot, so the
   * expected last four/brand pairing is resolved against the known
   * candidates at runtime instead of being hardcoded to one of them.
   */
  async assertSelectedCardMatchesOneOf(candidates: { lastFour: string; brand: string }[]) {
    await expect(this.labelSelectedCardTitle).toBeVisible({ timeout: 60000 });
    const actualLastFour = (await this.labelSelectedCardLastFourDigits.textContent())?.trim();
    const match = candidates.find((candidate) => actualLastFour === `**** ${candidate.lastFour}`);
    expect(
      match,
      `Selected card "${actualLastFour}" did not match any expected saved card`
    ).toBeTruthy();
    await expect(this.imageCardIcon).toHaveAttribute('alt', match!.brand);
  }

  async clickOnAddNewCard() {
    await this.buttonIconAddNewCard.click();
  }

  async assertErrorViewIsVisible(errorCode: string) {
    const errorCaption = this.iframeVault.locator(`[data-testid="error-caption-${errorCode}"]`);
    await expect(this.labelErrorViewTitle).toBeVisible();
    await expect(this.labelErrorViewDescription).toBeVisible();
    await expect(errorCaption).toBeVisible();
  }

  async assertNewCardFlowRendersImmediately() {
    await expect(this.inputCardNumber).toBeVisible();
    await expect(this.buttonSeeMoreCards).not.toBeVisible();
  }

  async assertSaveCardToggleIsVisible() {
    await expect(this.checkboxSaveCard).toBeVisible();
  }
  async assertSaveCardToggleIsHidden() {
    await expect(this.checkboxSaveCard).toBeHidden();
  }

  async assertInstallmentsFieldHidden() {
    await expect(this.inputInstallments).toBeHidden();
  }
  async assertInstallmentsFieldVisible() {
    await expect(this.inputInstallments).toBeVisible();
  }
  async assertInstallmentsLoaderIsVisible() {
    await expect(this.labelLoadingInstallments).toBeVisible();
  }

  async assertInstallmentsFieldsByCardIndexIsVisible(cardIndex: number) {
    const installmentsField = this.iframeVault.locator(
      `div[data-testid="dropdown-input-installments-card-${cardIndex}"]`
    );
    await expect(installmentsField).toBeVisible();
  }

  async assertInstallmentsFieldsByCardIndexIsHidden(cardIndex: number) {
    const installmentsField = this.iframeVault.locator(
      `div[data-testid="dropdown-input-installments-card-${cardIndex}"]`
    );
    await expect(installmentsField).toBeHidden();
  }

  async assertInstallmentsLoaderIsHidden() {
    await expect(this.labelLoadingInstallments).toBeHidden();
  }

  async clickOnSaveCardToggle() {
    await this.assertSaveCardToggleIsVisible();
    await this.checkboxSaveCard.click();
  }

  async waitResponseFromCards() {
    this.responseCards = this.page.waitForResponse(
      (response) => response.url().includes('/cards') && response.request().method() === 'POST'
    );
  }

  async waitResponseFromGetCards() {
    // Bounded: when the widget never requests the saved cards (ENTP1-T2002, stuck on
    // "Procesando" after the OTP login) an unbounded wait burned the whole test timeout.
    this.responseAllCards = this.page
      .waitForResponse(
        (response) => response.url().includes('/cards') && response.request().method() === 'GET',
        { timeout: 30_000 }
      )
      .catch((error: Error) => {
        throw new Error(`The vault widget never requested the saved cards: ${error.message}`);
      });
  }

  /**
   * `bin` may be the card's 6- or 8-digit BIN. The widget sends 8 digits only where
   * the frontend flag NEXT_PUBLIC_USE_8_DIGIT_BIN is on, and that differs per
   * environment, so the request matches when both BINs are prefixes of the same card.
   */
  async waitForInstallmentsResponse(bin: string, amount?: string) {
    this.responseInstallmentsResponse = this.page
      .waitForResponse(
        (response) => {
          const url = new URL(response.url());
          const isInstallmentsEndpoint = url.pathname.includes('/installments');
          const requestedBin = url.searchParams.get('bin') ?? '';
          const isCorrectBin =
            [6, 8].includes(requestedBin.length) &&
            (requestedBin.startsWith(bin) || bin.startsWith(requestedBin));
          const isCorrectAmount = amount ? url.searchParams.get('amount') === amount : true;
          const isGetMethod = response.request().method() === 'GET';
          return isInstallmentsEndpoint && isCorrectBin && isCorrectAmount && isGetMethod;
        },
        { timeout: 60000 }
      )
      .then((res) => res.json());
  }

  expectInstallmentsNotEmitted(): { verify: () => void } {
    let installmentsCallMade = false;
    const handler = (request: { url: () => string }) => {
      if (request.url().includes('/installments')) {
        installmentsCallMade = true;
      }
    };
    this.page.on('request', handler);
    return {
      verify: () => {
        this.page.off('request', handler);
        expect(installmentsCallMade).toBe(false);
      },
    };
  }

  async assertInstallmentsData(
    installmentsAmount: number,
    totalAmount: number,
    installmentsPerOption?: number
  ) {
    const installmentsData = await this.responseInstallmentsResponse;

    if (installmentsData?.error) {
      throw new Error(
        `[BACKEND ERROR] /installments endpoint did not return installment plans.\n` +
          `Response: ${JSON.stringify(installmentsData, null, 2)}`
      );
    }

    const selectedInstallment = installmentsData.installments.find(
      (i) => i.installments === installmentsAmount
    );
    if (!totalAmount) {
      expect(selectedInstallment).toBeUndefined();
    } else {
      expect(
        selectedInstallment,
        `Expected an installment plan for ${installmentsAmount} installments, but the /installments response had none: ${JSON.stringify(installmentsData.installments)}`
      ).toBeDefined();
      expect(selectedInstallment.installment_total_amount).toBe(totalAmount);
      expect(selectedInstallment.installments_amount).toBe(installmentsPerOption);
    }
  }

  async waitResponseFromInstallments() {
    this.responseInstallments = this.page.waitForResponse(
      (response) =>
        response.url().includes('/installments') && response.request().method() === 'GET',
      { timeout: 80_000 }
    );
  }

  async doCustomRequest(url: string, httpMethod: string, customHeaders?: any) {
    let ctx = await this.page.context();
    let http = await ctx.newPage();

    return http.evaluate(
      async ({ url, httpMethod, customHeaders }) => {
        const fetchResponse = await fetch(url, { method: httpMethod, headers: customHeaders });
        return { status: fetchResponse.status, body: await fetchResponse.json() };
      },
      { url: url, customHeaders: customHeaders, httpMethod: httpMethod }
    );
  }

  async fillInput(locator: Locator, value: string) {
    await locator.focus();
    await this.page.waitForTimeout(100);

    for (const char of value) {
      await locator.press(char, { delay: 50 });
    }
  }

  async pressFormVault(creditCardData: BaseCreditCard, opts?: { country?: string }) {
    const documentNumber = opts?.country
      ? (DEFAULT_DOCUMENT_BY_COUNTRY[opts.country] ?? creditCardData.document_number)
      : creditCardData.document_number;
    await this.fillInput(this.inputCardNumber, creditCardData.number);
    await this.fillInput(this.inputExpDate, creditCardData.expiration_date);
    await this.fillInput(this.inputCVV, creditCardData.cvv_code);
    await this.fillInput(this.inputCardHolder, creditCardData.cardholder_name);
    await this.fillInput(this.inputIdentityNumber, documentNumber);
  }

  async fillCardNumber(cardNumber: string) {
    await this.inputCardNumber.fill(cardNumber);
    await this.inputCardNumber.blur();
  }

  async fillExpDate(expirationDate: string) {
    await this.inputExpDate.fill(expirationDate);
    await this.inputExpDate.blur();
  }

  async fillCVV(cvv: string) {
    await this.inputCVV.fill(cvv);
    await this.inputCVV.blur();
  }

  async fillCardHolder(cardholderName: string) {
    await this.inputCardHolder.fill(cardholderName);
    await this.inputCardHolder.blur();
  }

  async fillIdentityNumber(documentNumber: string) {
    await this.inputIdentityNumber.fill(documentNumber);
    await this.inputIdentityNumber.blur();
  }

  async fillFormVault(
    creditCardData: BaseCreditCard,
    opts?: { avoidInstallmentsCall?: boolean; type?: string; country?: string }
  ) {
    const { avoidInstallmentsCall = false, type = 'fill', country } = opts ?? {};
    if (!avoidInstallmentsCall) await this.waitResponseFromInstallments();

    if (type === 'press') {
      await this.pressFormVault(creditCardData, { country });
      return;
    }
    await this.fillCardNumber(creditCardData.number);
    await this.fillExpDate(creditCardData.expiration_date);
    await this.fillCVV(creditCardData.cvv_code);
    await this.fillCardHolder(creditCardData.cardholder_name);
    const documentNumber = country
      ? (DEFAULT_DOCUMENT_BY_COUNTRY[country] ?? creditCardData.document_number)
      : creditCardData.document_number;
    await this.fillIdentityNumber(documentNumber);
  }

  async fillCardForm(creditCardData, options: FillCardFormOptions = {}) {
    if (!options.avoidInstallmentsCall) await this.waitResponseFromInstallments();

    const resolvedDocumentNumber = options.country
      ? (DEFAULT_DOCUMENT_BY_COUNTRY[options.country] ?? creditCardData.document_number)
      : creditCardData.document_number;

    const fields = [
      { key: 'number', input: this.inputCardNumber },
      { key: 'expiration_date', input: this.inputExpDate },
      { key: 'cvv_code', input: this.inputCVV },
      { key: 'cardholder_name', input: this.inputCardHolder },
      { key: 'document_number', input: this.inputIdentityNumber, value: resolvedDocumentNumber },
    ];

    for (const { key, input, value } of fields) {
      const val = value ?? creditCardData[key];
      if (val && val.trim() !== '') {
        await input.fill(val);
        if (options.delayInMs) {
          // Add a delay during the fill to simulate human typing, this prevents
          // unexpected behavior in the split payments recalculation amounts
          await this.page.waitForTimeout(options.delayInMs);
        }
      }
    }
  }

  async fillBillingForm(billingState: string, billingCity: string) {
    await this.pressTextOnInput(this.inputAddress1, 'Santa catalina', {
      iframe: this.iframeVault,
    });

    const selectBillingStateWrapper = this.getLocator(this.selectBillingState, this.iframeVault);

    await this.ensureVisibleToClick(selectBillingStateWrapper);
    await this.ensureVisibleToClick(
      selectBillingStateWrapper
        .locator(`text=${billingState}`)
        .or(
          this.iframeVault
            .locator('#dropdown-content-dropdown-billing-state')
            .locator(`text=${billingState}`)
        )
    ); // migration-or

    const selectCitySearchWrapper = this.selectCity
      .locator('#dropdown-search-wrapper')
      .or(this.selectCity.locator('input[role="combobox"]'));

    await this.retryAction(
      () => this.ensureVisibleToClick(selectCitySearchWrapper),
      async () => {
        const svgLocator = await selectCitySearchWrapper.locator('svg[title="Down"]');

        return !(await svgLocator.isVisible());
      }
    );

    const dropdownItem = await this.iframeVault.getByTestId(`dropdown-item-${billingCity}`);
    await this.ensureVisibleToClick(dropdownItem);
  }

  async fillBillingFormWithCountry(billingState: string, billingCity: string, phone?: string) {
    await this.pressTextOnInput(this.inputAddress1, 'Santa catalina', {
      iframe: this.iframeVault,
    });

    await this.ensureVisibleToClick(this.selectDropdownCountry);
    await this.ensureVisibleToClick(this.iframeVault.locator('[data-testid="dropdown-item-CO"]'));

    await this.ensureVisibleToClick(this.selectDropdownCountry);
    await this.ensureVisibleToClick(this.iframeVault.locator('[data-testid="dropdown-item-MX"]'));

    const selectBillingStateWrapper = this.getLocator(this.selectBillingState, this.iframeVault);

    await this.ensureVisibleToClick(selectBillingStateWrapper);
    await this.ensureVisibleToClick(
      selectBillingStateWrapper
        .locator(`text=${billingState}`)
        .or(
          this.iframeVault
            .locator('#dropdown-content-dropdown-billing-state')
            .locator(`text=${billingState}`)
        )
    ); // migration-or

    const selectCitySearchWrapper = this.iframeVault
      .locator('[data-testid="dropdown-input-city"] #dropdown-search-wrapper')
      .or(this.iframeVault.locator('[data-testid="dropdown-input-city"] #city'));

    await this.retryAction(
      () => this.ensureVisibleToClick(selectCitySearchWrapper),
      async () => {
        const svgLocator = selectCitySearchWrapper
          .locator('svg[title="Down"]')
          .or(selectCitySearchWrapper.locator('svg'));

        return !(await svgLocator.first().isVisible());
      }
    );

    const dropdownItem = this.iframeVault.getByText(billingCity, { exact: true });
    await this.ensureVisibleToClick(dropdownItem);

    if (phone) {
      await this.inputPhone.clear();
      await this.fillInput(this.inputPhone, phone);
    }
  }

  async clickPayWithTwoCards() {
    await this.ensureVisibleToClick(this.buttonPayWithTwoCards, this.iframeVault);
  }

  async assertPayWithTwoCards() {
    await this.ensureVisible(this.buttonPayWithTwoCards, {
      iframe: this.iframeVault,
    });
  }

  async assertNotRequiredCvv() {
    await expect(this.inputCVV).toBeVisible();
    await expect(this.inputCVV).toBeDisabled();
    await expect(this.inputCVV).toHaveAttribute('placeholder', 'No requerido');
    await expect(this.inputCVV).toHaveAttribute('value', '');
  }

  /**
   * Asserts that a saved card is preselected (the selected-card container is
   * rendered). Used to confirm the initial state of the first split step before
   * the user opens the full-cards list.
   */
  async assertSelectedCardIsPreselected() {
    await expect(
      this.containerSelectedCard,
      'A saved card should be preselected on the first split step'
    ).toBeVisible();
  }

  /**
   * Asserts that no saved card is preselected once the full cards list is open.
   * The selected-card container only renders while a card is selected; opening
   * the list must clear the selection, so the container is hidden and the
   * selectable cards list is shown instead.
   */
  async assertNoCardPreselectedInList() {
    await expect(this.selectCards, 'The saved cards list should be visible').toBeVisible();
    await expect(
      this.containerSelectedCard,
      'No saved card should be preselected: the selected-card container must be hidden while listing all cards'
    ).toBeHidden();
  }

  /**
   * Asserts the split flow is still on the first step (card 1) and has NOT advanced
   * to the second step. Used to verify CVV validation gates the "continue" button.
   */
  async assertStillOnFirstSplitStep() {
    await this.ensureVisible(this.buttonContinueWithCard2, {
      iframe: this.iframeVault,
      errorMessage: 'The flow should remain on the first split step',
    });
    await this.ensureNotVisible(
      this.buttonContinueWithThePaymentSummary,
      this.iframeVault,
      'The flow should not have advanced to the second split step'
    );
  }

  /**
   * Asserts the split flow advanced to the second step (the summary "continue" button
   * for card 2 is now visible).
   */
  async assertAdvancedToSecondSplitStep() {
    await this.ensureVisible(this.buttonContinueWithThePaymentSummary, {
      iframe: this.iframeVault,
      errorMessage: 'The flow should have advanced to the second split step',
    });
  }

  async adjustCardAmount(ordinal: number, amountCard: string) {
    let adjustedInput;
    if (ordinal === 1) {
      adjustedInput = this.inputAdjustAmount.first();
    } else {
      adjustedInput = this.inputAdjustAmount.nth(ordinal - 1);
    }
    await adjustedInput.click({ clickCount: 2 });
    await adjustedInput.fill(amountCard);
    await this.titleAmountToPay.click();
  }

  async adjustAmountForCard1(value: string) {
    await expect(this.inputAdjustAmountCard1).toBeVisible();
    await this.inputAdjustAmountCard1.click({ clickCount: 2 });
    await this.pressTextOnInput(this.inputAdjustAmountCard1, value, {
      delayPress: 200,
    });
    await this.inputAdjustAmountCard1.blur();
    await this.page.waitForTimeout(1000);
  }

  async adjustAmmountForCard2(value: string) {
    await expect(this.inputAdjustAmountCard2).toBeVisible();
    await this.inputAdjustAmountCard2.click({ clickCount: 2 }); // select all text
    await this.pressTextOnInput(this.inputAdjustAmountCard2, value);
    await this.inputAdjustAmountCard2.blur();
    await this.page.waitForTimeout(1000);
  }

  async assertAdjustAmountForCard1(value: string) {
    await expect(this.inputAdjustAmountCard1).toBeVisible();
    await expect(this.inputAdjustAmountCard1).toHaveValue(value);
  }

  async assertAdjustAmountForCard2(value: string) {
    await expect(this.inputAdjustAmountCard2).toBeVisible();
    await expect(this.inputAdjustAmountCard2).toHaveValue(value);
  }

  async assertMinorUnits(decimals: number) {
    const currencyRegex = /^[A-Z]{2,4}\s+/;
    const decimalsRegex = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+\\.\\d{${decimals}}$`);

    const card1Amount = await this.inputAdjustAmountCard1.inputValue();
    const card2Amount = await this.inputAdjustAmountCard2.inputValue();
    const totalAmount = await this.inputTotalToPay.textContent();

    expect(card1Amount.replace(currencyRegex, '')).toMatch(decimalsRegex);
    expect(card2Amount.replace(currencyRegex, '')).toMatch(decimalsRegex);
    expect(totalAmount.replace(currencyRegex, '')).toMatch(decimalsRegex);
  }

  async assertCard1AmountError() {
    await expect(this.inputCard1AmountError).toBeVisible();
  }

  async assertCard1AmountErrorHidden() {
    await expect(this.inputCard1AmountError).toBeHidden();
  }

  async clickOnTotalToPay() {
    await this.ensureVisibleToClick(this.inputTotalToPay);
  }

  async clickContinueWithCard2() {
    await this.ensureVisibleToClick(this.buttonContinueWithCard2, this.iframeVault);
  }

  async clickContinueWithThePaymentSummary() {
    await this.ensureVisibleToClick(this.buttonContinueWithThePaymentSummary, this.iframeVault);
  }

  async clickCheckboxBillingPattern() {
    await this.ensureVisibleToClick(this.checkboxBillingPattern);
  }

  async clickArrowBackToSinglePayment() {
    await this.ensureVisibleToClick(this.buttonArrowBackToSinglePayment, this.iframeVault);
  }

  async clickAddProduct() {
    await this.ensureVisibleToClick(this.buttonAddProduct);
  }

  async clickRemoveProduct() {
    await this.ensureVisibleToClick(this.buttonRemoveProduct);
  }

  async assertAlertInfoNotification() {
    await this.ensureVisible(this.labelAlertInfoNotification, { iframe: this.iframeVault });
    //Wait for spinner to disappear if not the test become crazy
    //TODO: add a proper selector for the spinner and wait for it to disappear
    await this.page.waitForTimeout(500);
  }

  private eventCapture: EventCapture | null = null;

  private async getEventCapture(): Promise<EventCapture> {
    if (!this.eventCapture) {
      this.eventCapture = new EventCapture(this.page);
      await this.eventCapture.start();
    }
    return this.eventCapture;
  }

  async assertEventWasFired(event: string, options?: { timeout?: number }) {
    const capture = await this.getEventCapture();
    const found = await capture.waitForEvent(event, { timeout: options?.timeout ?? 15000 });
    expect(found, `Event "${event}" was not captured within ${options?.timeout ?? 15000}ms`).toBe(
      true
    );
  }

  async assertEventMetadata(event: string, options?: { timeout?: number }): Promise<any> {
    const capture = await this.getEventCapture();
    const found = await capture.waitForEvent(event, { timeout: options?.timeout ?? 15000 });
    expect(found, `Event "${event}" was not captured within ${options?.timeout ?? 15000}ms`).toBe(
      true
    );
    return capture.getEventMetadata(event);
  }

  captureCardsApiResponse(): Promise<any[]> {
    return this.page
      .waitForResponse(CARDS_URL_PATTERN, { timeout: 40000 })
      .then(async (response) => {
        const body = await response.json();
        return Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);
      });
  }

  assertVaultSaveSuccessCards(
    metadata: any,
    expectedCards: {
      firstSix?: string;
      lastFour?: string;
      cardHolder?: string;
      storedCard?: boolean;
      amount?: number;
      installmentsCount?: number;
      billingCountry?: string;
      billingCity?: string;
      billingStateName?: string;
      billingHasPhone?: boolean;
    }[],
    options?: {
      cardsApiResponse?: any[];
    }
  ) {
    const { cards } = metadata;
    expect(cards).toHaveLength(expectedCards.length);

    for (let i = 0; i < expectedCards.length; i++) {
      const card = cards[i];
      const expected = expectedCards[i];

      // Contract fields (always present)
      expect(card.id).toEqual(expect.any(String));
      expect(card.cardId).toBe(card.id);
      expect(card.userId).toEqual(expect.any(String));
      expect(card.isSingleUse).toBe(false);
      expect(card.isDefault).toEqual(expect.any(Boolean));
      expect(card.company).toBeTruthy();
      expect(card.cardHolderDni).toEqual(expect.any(String));

      // Identity fields
      if (expected.firstSix) expect(card.firstSix).toBe(expected.firstSix);
      if (expected.lastFour) expect(card.lastFour).toBe(expected.lastFour);
      if (expected.cardHolder) expect(card.cardHolder).toBe(expected.cardHolder);
      if (expected.storedCard !== undefined) expect(card.storedCard).toBe(expected.storedCard);

      // Amount (exact value when known)
      if (expected.amount !== undefined) {
        expect(card.amount).toBe(expected.amount);
      } else {
        expect(card.amount).toEqual(expect.any(Number));
      }

      // Installments (exact count when known)
      if (expected.installmentsCount !== undefined) {
        expect(card.installment).toBeTruthy();
        expect(card.installment.installments).toBe(expected.installmentsCount);
        expect(card.installment.installmentsAmount).toEqual(expect.any(Number));
        expect(card.installment.displayInstallmentsAmount).toEqual(expect.any(String));
        expect(card.installment.planOptionId).toEqual(expect.any(String));
        expect(card.installments).toEqual(card.installment);
      }

      // BillingData (exact values when known)
      expect(card.billingData).toBeTruthy();
      if (expected.billingCity) {
        expect(card.billingData.city).toBe(expected.billingCity);
      } else {
        expect(card.billingData.city).toBeTruthy();
      }
      if (expected.billingStateName) {
        expect(card.billingData.state_name).toBe(expected.billingStateName);
      } else {
        expect(card.billingData.state_name).toBeTruthy();
      }
      if (expected.billingCountry) expect(card.billingData.country).toBe(expected.billingCountry);
      if (expected.billingHasPhone) expect(card.billingData.phone).toBeTruthy();

      // Cross-reference with backend API response when available
      if (options?.cardsApiResponse) {
        const apiCard = options.cardsApiResponse.find(
          (c: any) => c.last_four === card.lastFour && c.first_six === card.firstSix
        );
        if (apiCard) {
          if (apiCard.user_id) expect(card.userId).toBe(apiCard.user_id);
          if (apiCard.card_type) expect(card.cardType).toBe(apiCard.card_type);
          if (apiCard.bank_name) expect(card.bankName).toBe(apiCard.bank_name);
        }
      }
    }

    // Amounts sum check
    const totalAmount = cards.reduce((sum: number, c: any) => sum + c.amount, 0);
    expect(totalAmount).toBeGreaterThan(0);
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
    } catch (error) {
      if (error.name === 'TimeoutError') {
        // This is the expected outcome, so the assertion passes.
        expect(true).toBe(true);
      } else {
        // For any other error, re-throw it.
        throw error;
      }
    }
  }

  async assertCardsCreated() {
    // Start both promises simultaneously
    const [_eventPromise, responsePromise] = await Promise.all([
      this.assertEventWasFired('vaultSaveSuccess'),
      this.page.waitForResponse((response) => {
        const url = response.url();
        return url.includes('/v2/users/') && url.endsWith('/cards');
      }),
    ]);

    expect(responsePromise.status()).toBe(201);
  }

  async assertSummaryTitle() {
    await this.ensureVisible(this.labelSummaryTitle, { iframe: this.iframeVault });
  }

  async clickSummaryTitle() {
    await this.ensureVisibleToClick(this.labelSummaryTitle, this.iframeVault);
  }

  async assertTextIsVisible(text: string) {
    await this.ensureVisible(this.page.getByText(text), { iframe: this.iframeVault });
  }

  /**
   * Polls the pay button's computed background-color and compares it to `expectedHex`
   * ignoring alpha: the widget renders this fill as opaque `rgb(...)` in some states
   * and alpha-blended `rgba(...)` in others, and the color-transition duration varies
   * enough across machines that a fixed sleep before reading it is flaky.
   */
  private async assertButtonBackgroundColor(expectedHex: string) {
    const expectedColor = normalizeColor(expectedHex, false);
    await expect
      .poll(
        async () =>
          normalizeColor(
            await this.btnPay.evaluate((el) => getComputedStyle(el).backgroundColor),
            false
          ),
        { timeout: 5000 }
      )
      .toBe(expectedColor);
  }

  async assertThemeConfigCustomStyles(themeConfig: any) {
    const {
      buttonPrimaryText,
      buttonPrimaryFill,
      buttonPrimaryHover,
      buttonPrimaryActive,
      primaryFontFamily,
      primaryTextColor,
    } = themeConfig;
    await this.labelCardNumber.waitFor({ state: 'visible', timeout: 50000 });
    await expect(this.labelCardNumber).toHaveCSS('color', hexToRgb(primaryTextColor));
    await expect(this.btnPay).toHaveCSS(
      'font-family',
      new RegExp(`^${primaryFontFamily.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    );
    await expect(this.btnPay).toHaveCSS('background-color', hexToRgb(buttonPrimaryFill));
    await expect(this.btnPay).toHaveCSS('color', hexToRgb(buttonPrimaryText));

    if (buttonPrimaryHover) {
      await this.btnPay.hover();
      await this.assertButtonBackgroundColor(buttonPrimaryHover);
    }

    if (buttonPrimaryActive) {
      await this.btnPay.hover();
      await this.page.mouse.down();
      await this.page.mouse.move(0, 0);

      try {
        await this.assertButtonBackgroundColor(buttonPrimaryActive);
      } finally {
        await this.page.mouse.up();
      }
    }
  }

  doRequestToPurchaseV2() {
    this.requestPurchaseV2 = this.page.waitForRequest('**/v2/merchants/orders/purchase');
    this.responsePurchaseV2 = this.page.waitForResponse('**/v2/merchants/orders/purchase', {
      timeout: 40000,
    });
  }

  async assertLinkLocatorIsVisible(legalContent: LegalContent, legalLink: string) {
    const linkLocator = legalContent[legalLink].linkLocator;
    await expect(linkLocator).toBeVisible();
  }

  async clickLinkLocator(legalContent: LegalContent, legalLink: string) {
    const linkLocator = legalContent[legalLink].linkLocator;
    await linkLocator.click();
  }

  async validateLinkTitle(legalContent: LegalContent, legalLink: string) {
    const [newPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.page.waitForTimeout(1000),
    ]);
    const newPageUrl = newPage.url();
    expect(newPageUrl).toBe(legalContent[legalLink].url);
    const titleLocator = newPage.locator('h1', { hasText: legalContent[legalLink].title });
    await expect(titleLocator).toBeVisible();

    await newPage.close();
  }

  async validateLinkContent(legalLink: string) {
    const legalContent: LegalContent = {
      [LinkLocator.privacyLink]: {
        title: 'Política de privacidad',
        url: expectedPrivacyPolicyURL,
        linkLocator: this.privacyPolicyLink,
      },
      [LinkLocator.termsAndConditionsLink]: {
        title: 'Términos y Condiciones de los Sitios de E-Commerce provistos por FORTCAR S.A.',
        url: expectedTermsConditionsURL,
        linkLocator: this.termsConditionsLink,
      },
    };

    await this.assertLinkLocatorIsVisible(legalContent, legalLink);
    await this.clickLinkLocator(legalContent, legalLink);
    await this.validateLinkTitle(legalContent, legalLink);
  }

  async clickOnChangeChannelButton() {
    await this.ensureVisibleToClick(this.buttonChangeChannel);
  }

  async clickOnSaveWaitingForCardRequestCalled() {
    this.waitResponseFromCards();
    await expect(this.btnPay, 'The pay button is not visible')
      .toBeVisible({ timeout: 15000 })
      .then(() => this.btnPay.click());
  }

  async clickOnSave() {
    await this.btnPay.click();
  }

  async clickOnSaveCards() {
    this.requestCreateCard = this.page.waitForRequest(CARDS_URL_PATTERN, { timeout: 40000 });
    this.responseCreateCard = this.page.waitForResponse(CARDS_URL_PATTERN, { timeout: 40000 });

    await this.btnPay.click();
    const request = await this.requestCreateCard;
    const response = await this.responseCreateCard;
    await expect(request.method(), 'Request method should be POST').toBe('POST');
    await expect(response.status(), 'Response status should be 201').toBe(201);
  }

  async clickOnSaveCard({ capture }: { capture?: CaptureType | CaptureType[] } = {}) {
    const captures = !capture ? [] : Array.isArray(capture) ? capture : [capture];

    const promises = Object.fromEntries(
      captures.map((type) => {
        const pattern = CAPTURE_PATTERNS[type];
        return [
          type,
          {
            request: this.page.waitForRequest(pattern, { timeout: 40000 }),
            response: this.page.waitForResponse(pattern, { timeout: 40000 }),
          },
        ];
      })
    ) as Partial<
      Record<
        CaptureType,
        {
          request: ReturnType<Page['waitForRequest']>;
          response: ReturnType<Page['waitForResponse']>;
        }
      >
    >;

    await this.buttonPaySummary.click();

    const results = {} as Partial<
      Record<
        CaptureType,
        {
          request: Awaited<ReturnType<Page['waitForRequest']>>;
          response: Awaited<ReturnType<Page['waitForResponse']>>;
        }
      >
    >;

    for (const [type, { request, response }] of Object.entries(promises)) {
      results[type as CaptureType] = {
        request: await request,
        response: await response,
      };
    }

    return results;
  }

  async capturePurchaseV2() {
    this.doRequestToPurchaseV2();
    this.responsePurchaseV2 = this.page.waitForResponse('**/v2/merchants/orders/purchase', {
      timeout: 60_000,
    });
    const response = await this.responsePurchaseV2;
    const responsePurchaseV2Body = await response.json();
    return responsePurchaseV2Body;
  }

  async clickOnPay({
    purchaseV1 = false,
    withSuccessAssertion = false,
  }: { purchaseV1?: boolean; withSuccessAssertion?: boolean } = {}) {
    if (purchaseV1) {
      this.waitResponseFromCards();
      this.requestPurchaseV1 = this.page.waitForRequest('**/merchants/transactions/purchase', {
        timeout: 60_000,
      });
      this.responsePurchaseV1 = this.page.waitForResponse('**/merchants/transactions/purchase', {
        timeout: 60_000,
      });
    } else {
      this.waitResponseFromCards();
      this.requestPurchaseV2 = this.page.waitForRequest('**/v2/merchants/orders/purchase', {
        timeout: 60_000,
      });
      this.responsePurchaseV2 = this.page.waitForResponse('**/v2/merchants/orders/purchase', {
        timeout: 60_000,
      });
    }

    await this.mockHolderNameCreditCard();
    await this.btnPay.click();
    if (withSuccessAssertion) {
      await this.assertEventWasFired('vaultSaveSuccess');
    }
    if (purchaseV1) {
      await this.requestPurchaseV1;
      await this.responsePurchaseV1;
    } else {
      await this.requestPurchaseV2;
      await this.responsePurchaseV2;
    }
  }
  async fillCvvInCardForm(cvv: string, type = 'fill', avoidInstallmentsCall = false) {
    if (!avoidInstallmentsCall) await this.waitResponseFromInstallments();

    await expect(this.cvvInput, 'The CVV input is not visible').toBeVisible({ timeout: 40000 });

    if (type !== 'fill') {
      await this.fillInput(this.cvvInput, cvv);
      return;
    }

    await this.cvvInput.fill(cvv);
    await this.page.waitForTimeout(500);
  }

  async addNewCard() {
    await this.buttonAddNewCard.click();
  }

  async seeMoreCards(customButtonText?: string) {
    const locator = customButtonText
      ? this.iframeVault.getByText(customButtonText)
      : this.buttonSeeMoreCards;

    await this.resolveSavedCardsOtpGateIfPresent(locator);

    await expect(locator, 'The button see more cards is not visible').toBeVisible({
      timeout: 35000,
    });
    await locator.click();
  }

  /**
   * Viewing saved cards is gated by its own OTP re-verification — separate from
   * login, reusing the same otp-input-0 field — even right after the user just
   * logged in via email OTP (ENTP1-T2026). Wait for whichever of the gate or the
   * cards button shows up first, and resolve the gate if it's the one that did.
   */
  private async resolveSavedCardsOtpGateIfPresent(cardsButton: Locator) {
    await this.inputCodeOtp
      .or(cardsButton)
      .first()
      .waitFor({ state: 'visible', timeout: 35000 })
      .catch(() => {});

    if (await this.inputCodeOtp.isVisible().catch(() => false)) {
      await this.enterOtpCode();
    }
  }
  async clickOnTestCard(cardNumber: string) {
    const lastFourDigits = cardNumber.slice(-4);
    await this.iframeVault.locator(`span[data-testid="card-${lastFourDigits}"]`).click();
  }

  async clickAddCard(creditCardData: BaseCreditCard) {
    await this.addCardButton.click();
    await this.fillFormVault(creditCardData);
  }

  async resendOtpCodeToChannel() {
    await this.buttonResendOtpCode.click();
  }

  async enterOtpCode(codeOTP: string = '010101') {
    await this.inputCodeOtp.fill(codeOTP);
  }

  async setDefaultCard() {
    const chosenCard = await this.selectableCards.first();
    const chosenCardNumbers = await this.getFilteredCardNumber(chosenCard);

    const lastFour = chosenCardNumbers.trim().slice(-4);
    const buttonSetCardAsDefault = this.buttonSetCardAsDefault(lastFour);

    await this.openCardActionsByLastFour(lastFour);
    await expect(buttonSetCardAsDefault).toBeVisible({ timeout: 5000 });
    await buttonSetCardAsDefault.click();
    await expect(buttonSetCardAsDefault).not.toBeVisible({ timeout: 5000 });

    return chosenCardNumbers;
  }

  async getCheckboxValue(checkboxContainer: Locator) {
    return await checkboxContainer.locator('input').isChecked();
  }

  async openCardActionsByLastFour(lastFour: string) {
    await this.buttonCardActionsTrigger(lastFour).click();
  }

  /** Deletes the card shown in the single-card view: kebab → "Eliminar" → confirm. */
  async deleteSelectedCard() {
    await this.triggerRemoveSelectedCard.click();
    await this.buttonRemoveSelectedCard.click();
    await this.confirmDeleteCard();
  }

  async confirmDeleteCard() {
    await this.buttonConfirmDeleteCard.click();
  }

  async setCheckboxValue(checkboxContainer: Locator, value: boolean) {
    const currentValue = await this.getCheckboxValue(checkboxContainer);
    if (currentValue == value) return;

    await checkboxContainer.locator('span').first().click();
  }

  async getFilteredCardNumber(cardLocator: Locator): Promise<string> {
    // Legacy accordion renders the number in `label p`; the Radio group renders
    // it in a span tagged saved-card-item-last-four. Match either.
    const cardNumber = await cardLocator
      .locator('label p')
      .or(cardLocator.locator('[data-testid="saved-card-item-last-four"]'))
      .first()
      .textContent();

    if (cardNumber === null) {
      throw new Error(
        'getFilteredCardNumber: no card number text found for the given card locator.'
      );
    }

    return cardNumber;
  }

  async clickOnInstallmentsDropdown() {
    await this.assertInstallmentsFieldVisible();
    await this.iframeVaultElement.scrollIntoViewIfNeeded();
    await this.openInstallmentsDropdown.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1000);
    await this.ensureVisibleToClick(this.openInstallmentsDropdown);
  }

  async selectInstallmentsMSI(installments: InstallmentQuantity, customInstallmentLabel?: string) {
    await this.clickOnInstallmentsDropdown();

    if (installments === '1') {
      const defaultOption = this.iframeVault.getByText(customInstallmentLabel).first();
      await expect(defaultOption).toBeVisible();
      await this.ensureVisibleToClick(this.withoutInstallments.first());
    } else {
      const locatorInstallments = this.iframeVault
        .locator('[data-testid^="dropdown-item-"]')
        .filter({
          hasText: new RegExp(
            `^${installments} ${this.selectors.screenVaultWidgetPage.labelInstallmentsMSI}`
          ),
        });
      await locatorInstallments.click();
    }
  }

  async selectInstallmentsByText(installmentsText: string) {
    await this.ensureVisibleToClick(this.iframeVault.getByText(installmentsText));
  }

  async selectInstallmentsById(planOptionId: string) {
    const installmentOption = this.iframeVault.getByTestId(`dropdown-item-${planOptionId}`);
    await this.ensureVisibleToClick(installmentOption);
  }

  async captureAndGetInstallmentPlanOptionId(
    bin: string,
    installmentsQuantity: number
  ): Promise<string> {
    const installmentsResponse = await this.page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        const responseBin = url.searchParams.get('bin');
        return (
          url.pathname.includes('/installments') &&
          (responseBin === bin ||
            (bin.length === 6 && responseBin?.length === 8 && responseBin.startsWith(bin))) &&
          response.request().method() === 'GET'
        );
      },
      { timeout: 60000 }
    );

    const installmentsData = await installmentsResponse.json();
    const selectedInstallment = installmentsData.installments.find(
      (installment: any) => installment.installments === installmentsQuantity
    );

    return selectedInstallment.plan_option_id;
  }

  async clickOnSendOtpByEmail() {
    await this.buttonSendOtpByEmail.click();
  }

  async clickOnSendOtpBySMS() {
    await this.buttonSendOtpBySMS.click();
  }

  async clickOnContinueAsGuest() {
    await this.continueAsGuestButton.click();
  }

  async clickForced(locator: Locator, timeout = 5000) {
    await locator.click({ force: true, timeout: timeout });
  }

  async mockHolderNameCreditCard() {
    await this.page.route(PURCHASE_URL_PATTERN, (route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        route.continue();
        return;
      }

      const postData = JSON.parse(request.postData());

      if (isV2PurchaseRequest(postData)) {
        // V2: card_holder en payment_source.card_info.card_holder
        // Cast a Record<string, string> para evitar el [key: string]: unknown del type guard
        const cardInfo = postData.payment_source?.card_info as Record<string, string> | undefined;
        if (cardInfo?.card_holder?.includes('CLEAR')) {
          cardInfo.card_holder = cardInfo.card_holder.replace(/CLEAR\s?/, '');
        }
      } else {
        // V1: card_holder en credit_card.card_holder
        if (postData.credit_card?.card_holder?.includes('CLEAR')) {
          postData.credit_card.card_holder = postData.credit_card.card_holder.replace(
            /CLEAR\s?/,
            ''
          );
        }
      }

      route.continue({ postData: JSON.stringify(postData) });
    });
  }

  //Assertions
  async assertElementVisibleInIframe(locator: Locator) {
    expect(this.iframeVault.locator(locator).first()).toBeVisible();
  }

  async assertUserSeeTermsAndConditions() {
    await expect(this.termsAndConditions).toBeVisible();
    await expect(this.privacyPolicy).toBeVisible();
  }

  async assertUserDoesNotSeeTermsAndConditions() {
    await expect(this.termsAndConditions).toBeHidden();
    await expect(this.privacyPolicy).toBeHidden();
  }

  async assertProperLegalLinks() {
    await expect(this.privacyPolicyLink).toBeVisible();
    await expect(this.termsConditionsLink).toBeVisible();

    const privacyRef = await this.privacyPolicyLink.getAttribute('href');
    const termsRef = await this.termsConditionsLink.getAttribute('href');

    await expect(privacyRef).toBe(expectedPrivacyPolicyURL);
    await expect(termsRef).toBe(expectedTermsConditionsURL);
  }

  async assertOrderStatusRequestPurchaseV2(
    status: OrderStatusTypes,
    statusCode: number,
    cardId?: string
  ) {
    const responsePurchaseV2 = await this.responsePurchaseV2;
    const requestPurchaseV2 = await this.requestPurchaseV2;
    expect(responsePurchaseV2.status(), 'purchase v2 request status').toBe(statusCode);
    const responsePurchaseV2Body = await responsePurchaseV2.json();
    const requestPurchaseV2Body = await requestPurchaseV2.postData();

    if (status != 'denied') {
      console.log(`[INFO] --> Order Status: ${responsePurchaseV2Body.order.payment.data.status}`);
      expect(responsePurchaseV2Body.order.payment.data.status).toBe(status);
    }
    const payloadPurchaseV2 = JSON.parse(requestPurchaseV2Body);
    if (cardId) {
      expect(payloadPurchaseV2.payment_source.card_info.card_id).toBe(cardId);
    }
    expect(payloadPurchaseV2.payment_source.card_info.card_id);

    return responsePurchaseV2Body;
  }

  async assertOrderStatusRequestPurchaseV1(
    status: OrderStatusTypes,
    statusCode: number,
    cardId?: string
  ) {
    const responsePurchaseV1 = await this.responsePurchaseV1;
    const requestPurchaseV1 = await this.requestPurchaseV1;
    expect(responsePurchaseV1.status(), 'purchase v1 request status').toBe(statusCode);
    const responsePurchaseV1Body = await responsePurchaseV1.json();
    const requestPurchaseV1Body = await requestPurchaseV1.postData();
    if (status != 'denied') {
      console.log(`[INFO] --> Order Status: ${responsePurchaseV1Body.order.payment.data.status}`);
      expect(responsePurchaseV1Body.order.payment.data.status).toBe(status);
    }
    const payloadPurchaseV1 = JSON.parse(requestPurchaseV1Body);
    expect(payloadPurchaseV1.card_id);

    return responsePurchaseV1Body;
  }

  async assertPurchaseWithTokenizedCardMercadoPago(
    externalTransactionID: string,
    mercadoPagoToken: string,
    statusCode: number = 200
  ) {
    const customHeaders = { Authorization: 'Bearer ' + mercadoPagoToken };

    const response = await this.doCustomRequest(
      'https://api.mercadopago.com/v1/payments/' + externalTransactionID,
      'GET',
      customHeaders
    );

    expect(response.status, 'review payment status').toBe(statusCode);
    expect(response.body.operation_type, 'review operation type').toBe('recurring_payment');
  }

  async assertButtonEnabled() {
    const btnSave = this.btnPay;
    expect(await btnSave).toBeVisible();
    expect(await btnSave.isEnabled()).toBe(true);
  }

  async assertCardRequestForAuth(statusCode: number = 201) {
    const { response: responseCardsFirst, body: responseCardsBody } = await this.responseCards;
    expect(responseCardsFirst.status(), 'cards request status').toBe(statusCode);
    const cardId = responseCardsBody?.data?.id;
    expect(cardId, 'cards response body').not.toBeUndefined();
    return cardId;
  }
  async assertCardRequest(statusCode: number = 201) {
    const responseCards = await this.responseCards;
    expect(responseCards.status(), 'cards request status').toBe(statusCode);
    const responseCardsBody = await responseCards.json();
    const cardId = responseCardsBody.data.id;
    expect(cardId).not.toBeUndefined();
    return cardId;
  }

  async assertCardVerifiedRequest(statusCode: number = 201, verifiedByCode = 'mercado_pago') {
    const responseCards = await this.responseCards;
    expect(responseCards.status(), 'cards request status').toBe(statusCode);
    const responseCardsBody = await responseCards.json();
    const cardId = responseCardsBody.data.id;
    const verifiedBy = responseCardsBody.data.verified_by;
    expect(verifiedBy).toContain(verifiedByCode);
    return cardId;
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

  async assertOtpPage() {
    await expect(this.otpPageTitle).toBeVisible();
  }

  async assertTextInstallmentsOptions(installmentsOptionsText: string[]) {
    for (const installmentsText of installmentsOptionsText) {
      await expect(this.iframeVault.getByText(installmentsText)).toBeVisible();
    }
  }

  async assertPaymentPage() {
    await expect(this.paymentPageTitle).toBeVisible();
    await expect(this.paymentPageSubTitle).toBeVisible();
  }
  async assertPurchaseSendInstallmentObject() {
    const requestPurchaseV2 = await this.requestPurchaseV2;
    const requestPurchaseV2Body = await requestPurchaseV2.postData();
    const payloadPurchaseV2 = JSON.parse(requestPurchaseV2Body);
    expect(payloadPurchaseV2.payment_source.installment).not.toBeUndefined();
  }

  async assertPurchaseSendProperPlanOptionId(installments: InstallmentQuantity) {
    const requestPurchaseV2 = await this.requestPurchaseV2;
    const requestPurchaseV2Body = await requestPurchaseV2.postData();
    const payloadPurchaseV2 = JSON.parse(requestPurchaseV2Body);

    const responseInstallments = await this.responseInstallments;
    const responseInstallmentsBody = await responseInstallments.json();

    const paymentInstallmentPlanOptionId =
      payloadPurchaseV2?.payment_source?.installment?.plan_option_id;

    if (installments === '1') {
      expect(paymentInstallmentPlanOptionId).toBe('00000000-0000-0000-0000-000000000000');
    } else {
      const selectedInstallment = responseInstallmentsBody.installments.find(
        (installment: any) => installment.installments === Number(installments)
      );

      if (!selectedInstallment) {
        throw new Error(`The installment plan for ${installments} installments was not found.`);
      }

      const selectedPlanOptionId = selectedInstallment.plan_option_id;
      expect(paymentInstallmentPlanOptionId).toBe(selectedPlanOptionId);
    }
  }

  async validateBinIsPresentInEndpointParams() {
    await this.page.route('**/installments', (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const bin = url.searchParams.get('bin');

      expect(bin).not.toBeNull();

      route.continue();
    });
  }

  async sendPostMessageToRefetchOrder() {
    await this.validateBinIsPresentInEndpointParams();
    await this.page.evaluate(() => {
      window.postMessage(JSON.stringify({ type: 'refetchOrder', data: null }), '*');
    });
  }

  formatOnlyNumbers(value: string) {
    const onlyNumbers = value.replace(/\D/g, '');

    return onlyNumbers;
  }

  async assertDocumentNumberHasContentOnlyNumbers(identityNumber: string) {
    const identityNumberFormatted = this.formatOnlyNumbers(identityNumber);
    const valueLocator = await this.inputIdentityNumber.inputValue();
    const valueLocatorFormatted = this.formatOnlyNumbers(valueLocator);
    expect(valueLocatorFormatted).toBe(identityNumberFormatted);
  }

  async assertTitleVisibleInMainView() {
    await expect(this.titleMainView).toBeVisible({ timeout: 50000 });
  }

  async assertDefaultCardSet(expectedCardNumbers: string) {
    await expect(
      this.selectDefaultCard,
      `Expected card ${expectedCardNumbers} to be set as default`
    ).toContainText(expectedCardNumbers, { timeout: 20000 });
  }

  async assertElementNotVisible(locator: Locator, timeout = 10000) {
    await expect(locator, 'The element is still visible').not.toBeVisible({ timeout });
  }

  async assertCheckboxValue(checkboxContainer: Locator, expectedValue: boolean) {
    const currentValue = await this.getCheckboxValue(checkboxContainer);
    expect(currentValue).toBe(expectedValue);
  }

  async assertBorderRadius(element: Locator, expectedBorderRadius: string) {
    await computedStyle.assertBorderRadius(element, expectedBorderRadius);
  }

  async assertInputsBorderRadius(expectedBorderRadius: string) {
    await this.inputsContainers.first().waitFor();
    const count = await this.inputsContainers.count();
    expect(count).toBeGreaterThan(0);

    let checkedCount = 0;
    for (let i = 0; i < count; i++) {
      const container = this.inputsContainers.nth(i);
      const borderRadius = await container.evaluate(
        (el) => window.getComputedStyle(el).borderRadius
      );
      // Skip unstyled outer layout wrappers that don't apply theme border radius (0px)
      if (borderRadius === '0px' && expectedBorderRadius !== '0px') {
        continue;
      }
      expect(borderRadius).toBe(expectedBorderRadius);
      checkedCount++;
    }
    expect(checkedCount).toBeGreaterThan(0);
  }

  /** Asserts border-radius and height on the pay button. */
  async assertButtonDimensions(controls: ThemeControls) {
    await computedStyle.assertDimensions(this.btnPay, controls);
  }

  /** Asserts border-radius and height on every input wrapper in the vault widget. */
  async assertInputsDimensions(controls: ThemeControls) {
    await computedStyle.assertDimensionsForAll(this.inputsContainers, controls);
  }

  async goToSplitPaymentsForm() {
    await expect(this.labelSelectedCardTitle).toBeVisible();
    await this.ensureVisibleToClick(this.buttonPayWithTwoCards, this.iframeVault);
    await this.assertSplitPaymentFormIsVisible();
  }

  async assertSplitPaymentFormIsVisible() {
    await expect(this.stepperSplitPayments).toBeVisible();
  }

  /**
   * Asserts that the billing button is not visible.
   */
  async assertBillingButtonAnyTypeIsNotVisible() {
    await expect(this.buttonAddBillingData).toBeHidden();
    await expect(this.buttonUpdateBillingData).toBeHidden();
  }

  async assertAlertInvalidCardInfo() {
    await expect(this.labelInvalidCardHolder).toBeVisible({ timeout: 10000 });
  }

  async assertAlertInvalidCardInfoNotVisible() {
    await expect(this.labelInvalidCardHolder).toBeHidden();
  }

  async assertCustomTitleAndSubtitle(customTitle: string, customSubTitle: string) {
    await expect(this.iframeVault.getByText(customTitle)).toBeVisible();
    await expect(this.iframeVault.getByText(customSubTitle)).toBeVisible();
  }

  async assertCardIdentityDocumentLabelIsVisible() {
    await expect(this.labelCardIdentityDocument.first()).toBeVisible();
  }

  async showBillingFormIFrame() {
    if (await this.buttonAddBillingData.isVisible()) {
      await this.ensureVisibleToClick(this.buttonAddBillingData);
    } else {
      await this.ensureVisibleToClick(this.buttonUpdateBillingData);
    }
  }

  async assertPaypalFraudnetRequests() {
    const p1RequestPromise = this.page.waitForRequest('https://c.sandbox.paypal.com/**/p1');
    const p2RequestPromise = this.page.waitForRequest('https://c.sandbox.paypal.com/**/p2');
    const p1Request = await p1RequestPromise;
    const p2Request = await p2RequestPromise;

    expect(p1Request.method()).toBe('POST');
    expect(p2Request.method()).toBe('POST');
    expect((await p1Request.response()).status()).toBe(200);
    expect((await p2Request.response()).status()).toBe(200);
  }

  async backToCardForm() {
    await this.ensureVisibleToClick(this.buttonBackToCardForm);
  }

  async fillNameBillingForm(name: string) {
    await this.fillInput(this.inputNameBillingForm, name);
  }

  async clickSaveBillingForm() {
    await this.ensureVisibleToClick(this.buttonSaveBillingForm);
  }

  async assertBillingFormTitleIsVisible() {
    await this.ensureVisible(this.labelBillingTitle, { timeout: 50000 });
  }

  async assertCustomStyleTextIsVisible(text: string) {
    await expect(this.iframeVault.getByText(text)).toBeVisible();
  }

  async assertIdentityNumberErrorIsVisible() {
    await expect(
      this.captionIdentityNumberError,
      'Identity number error message (card_holder_dni-caption) is not visible'
    ).toBeVisible();
  }

  async assertIdentityNumberErrorIsNotVisible() {
    await expect(
      this.captionIdentityNumberError,
      'Identity number error message (card_holder_dni-caption) should not be visible'
    ).toBeHidden();
  }

  async assertNewCardFormIsVisibleAfterBilling() {
    await expect(
      this.inputCardNumber,
      'New card form was lost after returning from Billing — UserCardPattern reset the selection on remount'
    ).toBeVisible({ timeout: 10000 });

    await expect(
      this.labelSelectedCardTitle,
      'Saved card view appeared instead of keeping the new card form — selectedPaymentMethod was overwritten on remount'
    ).not.toBeVisible();
  }

  async assertNonDefaultCardRemainsSelectedAfterBilling(
    expectedLastFour: string,
    defaultLastFour: string
  ) {
    await expect(
      this.labelSelectedCardLastFourDigits,
      `Selected card was reset to default (${defaultLastFour}) after returning from Billing — UserCardPattern overwrote selectedCardId on remount`
    ).toHaveText(expectedLastFour);

    await expect(
      this.labelSelectedCardLastFourDigits,
      'Selection rolled back to the default card after Billing'
    ).not.toHaveText(defaultLastFour);
  }

  /**
   * [Bug 1 regression guard]
   * After switching to "Agregar una tarjeta", the new-card input form must be shown.
   * The selected-card container must be hidden and the "Ver tarjetas guardadas" link
   * must be visible (confirming the form is in new-card-entry mode).
   *
   * If Bug 1 regresses: stale `selectedCard` in CardContext causes
   * `initializeSplitPaymentCards` to set `methodType = UserCard` for slot 0,
   * making the saved card reappear here instead of the new-card input form.
   */
  async assertNewCardFormIsActive() {
    await expect(
      this.containerSelectedCard,
      'selected-card-container must be hidden — the new card form must be shown, not the saved card'
    ).not.toBeVisible();

    await expect(
      this.buttonSeeMoreCards,
      '"Ver tarjetas guardadas" link must be visible when the new-card form is active'
    ).toBeVisible();
  }

  /**
   * Asserts the vault renders the new-card form directly for a user with
   * zero saved cards: card input visible, no selected-card container.
   */
  async assertNewCardFormShownWithoutSavedCards() {
    await expect(
      this.inputCardNumber,
      'The new-card form must be shown directly for a user with no saved cards'
    ).toBeVisible();

    await expect(
      this.containerSelectedCard,
      'No saved-card container must render for a user with zero saved cards'
    ).toBeHidden();
  }

  /**
   * Asserts the new-card form still holds the values the user typed after a
   * flow that remounts the split payment view (e.g. saving the billing form).
   * If BUGS-211 regresses, these fields come back empty.
   */
  async assertCardFormValuesPersisted(creditCardData: BaseCreditCard) {
    const lastFour = creditCardData.number.slice(-4);

    await expect(
      this.inputCardNumber,
      `Card number must still end in ${lastFour} after billing save — empty means BUGS-211 regressed`
    ).toHaveValue(new RegExp(`${lastFour}\\s*$`));

    await expect(
      this.inputExpDate,
      'Expiration date must persist after billing save'
    ).not.toHaveValue('');

    await expect(
      this.inputCardHolder,
      'Cardholder name must persist after billing save'
    ).toHaveValue(creditCardData.cardholder_name);
  }

  /**
   * Asserts that both split payment summary card labels are visible.
   */
  async assertFirstSplitSummaryCardBrand() {
    await expect(
      this.labelSplitPaymentSummaryCard1,
      'Card 1 summary label must be visible'
    ).toBeVisible();
    await expect(
      this.labelSplitPaymentSummaryCard2,
      'Card 2 summary label must be visible'
    ).toBeVisible();
  }
}
