import { Locator, Page } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { DEFAULT_DOCUMENT_BY_COUNTRY } from '@support/constants/identityDocuments';

type ClearableField = 'cardNumber' | 'expDate' | 'documentNumber' | 'holderName' | 'cvv';

// BillingPattern renders Country/State/City as the same Dropdown component
// (@deuna/components-v3) — see the locator comments in deunaNowPage.ts for
// why the border color lives on `*DropdownBorder`, not on the `id`-based
// input locator itself.
type BillingDropdownField = 'country' | 'state' | 'city';

export interface FillBillingAddress1Params {
  value: string;
}

export interface SelectBillingDropdownOptionParams {
  field: BillingDropdownField;
  timeout?: number;
}

export interface AssertBillingDropdownBorderColorParams {
  field: BillingDropdownField;
  expectedHex: string;
  timeout?: number;
}

export interface AssertAddress1BorderColorParams {
  expectedHex: string;
  timeout?: number;
}

export interface FillCreditCardParams {
  creditCardData: BaseCreditCard;
  opts?: { waitForInstallments?: boolean; country?: string };
}

export interface FillCardNumberParams {
  number: string;
}

export interface ClickClosestClearButtonParams {
  fieldName: ClearableField;
}

export interface AssertOrderStatusParams {
  status: OrderStatusTypes;
  statusCode: number;
  options?: { disableBodyVerification: boolean };
}

export interface ClickPayParams {
  withResponse?: boolean;
}

export class PluginCheckoutPaymentWidget extends FrameworkPlugin {
  pluginBaseName = 'checkout.paymentWidget';

  payment!: PaymentDeunaNowPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.payment = new PaymentDeunaNowPage(context.page);
  }

  private billingDropdownLocators(field: BillingDropdownField): {
    dropdown: Locator;
    option: Locator;
    border: Locator;
    searchInput: Locator;
  } {
    switch (field) {
      case 'country':
        return {
          dropdown: this.payment.dropdownBillingCountry,
          option: this.payment.optionBillingCountryMexico,
          border: this.payment.countryDropdownBorder,
          searchInput: this.payment.countrySearchInput,
        };
      case 'state':
        return {
          dropdown: this.payment.dropdownBillingState,
          option: this.payment.optionBillingState,
          border: this.payment.stateDropdownBorder,
          searchInput: this.payment.stateSearchInput,
        };
      case 'city':
        return {
          dropdown: this.payment.dropdownCity,
          option: this.payment.optionCity,
          border: this.payment.cityDropdownBorder,
          searchInput: this.payment.citySearchInput,
        };
    }
  }

  /** @description Fills the credit card data in the payment widget. Optionally waits for installments to load before filling the data. */
  async $tf_fillCreditCardData({ creditCardData, opts }: FillCreditCardParams) {
    await this.payment.waitCardNumberInputIsVisible();

    if (opts?.waitForInstallments) {
      this.payment.waitResponseFromInstallments();
    }

    await this.payment.clearInputsCreditCard();
    await this.payment.fillInputCreditCardNumber(creditCardData.number);
    await this.payment.fillInputExpirationDate(creditCardData.expiration_date);

    if (opts?.waitForInstallments) {
      await this.payment.waitForInstallmentsResponse();
    }

    await this.payment.fillInputCvv(creditCardData.cvv_code);
    await this.payment.fillInputHolderName(creditCardData.cardholder_name);

    const documentNumber =
      opts?.country !== undefined
        ? (DEFAULT_DOCUMENT_BY_COUNTRY[opts.country] ?? creditCardData.document_number)
        : creditCardData.document_number;
    await this.payment.fillInputDocumentNumber(documentNumber);
  }

  /** @description Clicks the pay button and BLOCKS until the purchase response and card creation complete. This is the default for straight-through payments. For flows that must act on the page before the response arrives (3DS popup or iframe), use clickOnPayButton instead. */
  async $tf_clickPay() {
    await this.payment.clickPay();
  }

  /** @description Clicks the pay button and returns immediately WITHOUT blocking on the purchase response. With withResponse=true (default) the response listener is armed before the click so a later action can await it; use withResponse=false for 3DS redirect and iframe flows where the challenge must be handled first. To block until the payment finishes, use clickPay instead. */
  async $tf_clickOnPayButton({ withResponse = true }: ClickPayParams = {}) {
    await this.payment.clickOnPayButton(withResponse);
  }

  /** @description Fills only the credit card number input in the payment widget, leaving other fields empty. */
  async $tf_fillCardNumber({ number }: FillCardNumberParams) {
    await this.payment.fillCreditCard(number);
  }

  /** @description Clicks the clear (X) button next to the given card form field (cardNumber, expDate, documentNumber, holderName or cvv). */
  async $tf_clickClosestClearButton({ fieldName }: ClickClosestClearButtonParams) {
    await this.payment.clickClosestClearButton(fieldName);
  }

  /** @description Asserts the authenticated user saved card is preselected on widget load (selected-card-last-four is visible). */
  async $tf_assertSavedCardIsPreselected() {
    await this.payment.waitForSelectedCardLastFour();
  }

  /** @description Clicks "Agregar una tarjeta" to leave the saved-card (UserCard) flow and show the new-card form. */
  async $tf_clickAddNewCard() {
    await this.payment.selectOptionAddNewCreditCard();
  }

  /** @description Asserts that the installments dropdown is not visible in the payment widget. */
  async $tf_userDoesNotSeeInstallmentsDropdown() {
    await this.payment.userDoesNotSeeInstallmentsDropdown();
  }

  /** @description Asserts that the installments dropdown is visible in the payment widget. */
  async $tf_userSeesInstallmentsDropdown() {
    await this.payment.userSeesInstallmentsDropdown();
  }

  /** @description Opens the installments dropdown and selects the "no installments" option to deselect a previously chosen plan. */
  async $tf_selectInstallmentDeselected() {
    await this.payment.selectInstallmentDeselected();
  }

  /** @description Asserts that no card form validation errors (card number, expiration date, cvv, holder name, document number) are visible. */
  async $tf_userDoesNotSeeErrors() {
    await this.payment.userDoesNotSeeErrors();
  }

  /** @description Asserts that the card payment form (label) is visible in the payment widget iframe. */
  async $tf_assertUserSeePaymentForm() {
    await this.payment.assertUserSeePaymentForm();
  }

  /** @description Asserts that the iframe-based 3DS challenge container is visible inside the payment widget. Use for 3DS flows configured with render_3ds_strategy=iframe. */
  async $tf_assertIframe3dsVisible() {
    await this.payment.assertIframe3dsVisible();
  }

  /** @description Completes the Unlimit 3DS challenge rendered inside the payment widget iframe and asserts the card creation response. Use for Unlimit/Payconnect flows configured with render_3ds_strategy=iframe. */
  async $tf_completeUnlimit3DSInIframe() {
    await this.payment.assertIframe3dsVisible();
    const challengePage = new Challenge3dsPage(this.payment.iframe3ds as unknown as Page);
    const cardResponsePromise = this.payment.waitResponseFromSaveCard();
    await challengePage.selectSuccessChallengeUnlimit();
    await this.payment.assertCreateCardResponse(await cardResponsePromise);
  }

  /** @description Asserts that the purchase request payload contains a base64-encoded device_id and that the decoded value includes the uppercased provider name(s) (e.g. ["kount"] → searches for "KOUNT" in the decoded device_id). Reads device_id from anti_fraud_info.device.id (V2) or device_id (V1). */
  async $tf_assertDeviceIdInPurchaseRequest({
    antiFraudProvider,
  }: {
    antiFraudProvider: string[];
  }) {
    await this.payment.assertDeviceIdInPurchaseRequest({ antiFraudProvider });
  }

  /** @description Asserts that the purchase request payload contains processor_name (V1) or payment_source.processor (V2) equal to the expected value. */
  async $tf_assertProcessorNameInPurchaseRequest({
    expectedProcessorName,
  }: {
    expectedProcessorName: string;
  }) {
    await this.payment.assertProcessorNameInPurchaseRequest(expectedProcessorName);
  }

  /** @description Closes the Payment Widget via the back-action arrow and reopens it through the experience type modal. Workaround for an external bug where the first widget open does not include device_id in the purchase request payload — the reopen makes the SDK emit device_id on the next purchase. */
  async $tf_closeAndReopenPaymentWidget() {
    await this.payment.closeAndReopenPaymentWidget();
  }

  /** @description Waits for the OTP screen to appear inside the payment widget and enters the OTP code. Defaults to 010101 if no code is provided. */
  async $tf_enterOtpCode({ code }: { code?: string } = {}) {
    await this.payment.waitAndEnterOtpCode(code);
  }

  /** @description Asserts that the saved-cards view is visible inside the payment widget (selected-card-last-four element is shown), confirming the user session is active and saved cards are displayed. */
  async $tf_assertSavedCardsVisible() {
    await this.payment.waitForSelectedCardLastFour(30000);
  }

  /** @description Logs out the current user inside the payment widget iframe: clicks the "Cerrar sesión" button and then confirms by clicking "Confirmar" in the confirmation modal. */
  async $tf_logout() {
    await this.payment.logout();
  }

  /** @description Asserts the order status in the purchase request. Waits for the purchase response and checks the status code and order status in the request body. Optionally disables body verification. */
  async $tf_assertOrderStatusRequestPurchase({
    status,
    statusCode,
    options,
  }: AssertOrderStatusParams) {
    return await this.payment.assertOrderStatusRequestPurchase(status, statusCode, options);
  }

  /** @description Clicks whichever billing button variant ("Agregar datos" or "Cambiar") is currently visible, opening the billing form. */
  async $tf_showBillingForm() {
    await this.payment.assertBillingButtonAnyTypeIsVisibleToClick();
  }

  /** @description Fills the Address (address1) input in the billing form. */
  async $tf_fillBillingAddress1({ value }: FillBillingAddress1Params) {
    await this.payment.fillInputField(
      this.payment.inputAddress1,
      value,
      this.payment.iframeZoidVisible
    );
  }

  /** @description Selects the given billing dropdown's option (country: Mexico; state/city: the mocked Bogotá D.C. option) and blurs the search input afterward. The blur is required — the design system keeps focus on the search input after a click (onMouseDown: preventDefault), and a focused dropdown reads as "focused" (blue) instead of "selectedValid" (green) regardless of the underlying value. */
  async $tf_selectBillingDropdownOption({ field, timeout }: SelectBillingDropdownOptionParams) {
    const { dropdown, option, searchInput } = this.billingDropdownLocators(field);
    await this.payment.ensureVisibleToClick(dropdown, this.payment.iframeZoidVisible, undefined, {
      timeout,
    });
    await this.payment.ensureVisibleToClick(option, this.payment.iframeZoidVisible, undefined, {
      timeout,
    });
    await searchInput.evaluate((el) => (el as HTMLElement).blur());
  }

  /** @description Asserts the given billing dropdown's (country/state/city) trigger border resolves to the expected hex color. */
  async $tf_assertBillingDropdownBorderColor({
    field,
    expectedHex,
    timeout,
  }: AssertBillingDropdownBorderColorParams) {
    const { border } = this.billingDropdownLocators(field);
    await this.payment.assertDropdownBorderColor(border, expectedHex, timeout);
  }

  /** @description Asserts the billing Address (address1) input's border resolves to the expected hex color. */
  async $tf_assertAddress1BorderColor({ expectedHex, timeout }: AssertAddress1BorderColorParams) {
    await this.payment.assertInputBorderColor(this.payment.address1Border, expectedHex, timeout);
  }
}
