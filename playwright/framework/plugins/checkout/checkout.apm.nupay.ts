import { Context, FrameworkPlugin } from '../interface';
import { resolveOrderId, resolveOrderToken } from '../../resolve';
import { NupayFormPage } from '@pages/explore/forms/nupayFormPage';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { Page } from '@playwright/test';

/** The order the consent response must belong to, when not taken from a setup.order action. */
export interface ExpectedOrderParams {
  /** Defaults to the order from a previous setup.order action. */
  orderToken?: string;
  /** Defaults to the order from a previous setup.order action. */
  orderId?: string;
}

export interface FillIdentityDocumentParams {
  identityDocument: string;
}

export interface FillDocumentAndConsentParams
  extends FillIdentityDocumentParams, ExpectedOrderParams {}

export interface SelectPaymentMethodOptionParams {
  paymentMethod: 'NuPay Credit' | 'NuPay Debit';
}

interface ClickPayParams {
  planOptionId: string;
}

export interface AddInstallmentsParams {
  installmentPlanId: string;
}

export interface GetPlanOptionIdParams {
  installmentsCount: number;
  paymentMethodType: 'nupay_debit' | 'nupay_credit';
}

interface AssertOrderStatusParams {
  status: OrderStatusTypes;
  statusCode: number;
}

export interface ValidateConsentCPFParams {
  orderToken: string;
  orderId: string;
}

export class PluginCheckoutApmNupay extends FrameworkPlugin {
  pluginBaseName = 'checkout.apm.nupay';

  nupayForm!: NupayFormPage;
  private consentSuccessResponse?: ReturnType<Page['waitForResponse']>;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.nupayForm = new NupayFormPage(context.page);
    this.consentSuccessResponse = undefined;
  }

  /** @description Scrolls to and selects the NuPay credit payment method option in the checkout form. */
  async $tf_selectNupayForm() {
    await this.nupayForm.selectNupayForm();
  }

  /** @description Fills in the identity document (CPF) field in the NuPay form. */
  async $tf_fillIdentityDocument({ identityDocument }: FillIdentityDocumentParams) {
    await this.nupayForm.fillIdentityDocument(identityDocument);
  }

  /**
   * The consent listener asserts the response belongs to the expected order, so it needs the
   * order token and id up front. Resolved here instead of inside the page object's predicate,
   * which used to read them straight off the globals.
   */
  private listenForConsent(action: string, params: ExpectedOrderParams) {
    return this.nupayForm.listenForConsentSuccessResponse(
      resolveOrderToken(this.context, action, params.orderToken),
      resolveOrderId(this.context, action, params.orderId)
    );
  }

  /** @description Registers the consent success listener and clicks the Assign Consent button on the NuPay form to trigger the consent request. The listener only matches a consent response belonging to the expected order; orderToken and orderId default to the order from a previous setup.order action. */
  async $tf_clickAssignConsent(params: ExpectedOrderParams = {}) {
    this.consentSuccessResponse = this.listenForConsent(
      'checkout.apm.nupay.clickAssignConsent',
      params
    );
    await this.nupayForm.clickOnButtonAssignConsent();
  }

  /** @description Waits for a successful consent response and then clicks the Select Payment Method button on the NuPay form. */
  async $tf_clickSelectPaymentMethod() {
    // The listener has to exist before the Assign Consent click that triggers the response.
    // Registering it here, after the fact, was the old fallback and could miss the response.
    if (!this.consentSuccessResponse) {
      throw new Error(
        'checkout.apm.nupay.clickSelectPaymentMethod: no consent listener registered. Run ' +
          'checkout.apm.nupay.clickAssignConsent or fillDocumentAndClickAssignConsent first.'
      );
    }
    await this.nupayForm.clickOnSelectPaymentMethod(this.consentSuccessResponse);
    this.consentSuccessResponse = undefined;
  }

  /** @description Selects a specific NuPay payment method option (NuPay Credit or NuPay Debit) from the dropdown. */
  async $tf_selectPaymentMethodOption({ paymentMethod }: SelectPaymentMethodOptionParams) {
    await this.nupayForm.selectPaymentMethodOption(paymentMethod);
  }

  /** @description Performs the full sequence of selecting the NuPay form, filling the identity document, and clicking Assign Consent. Registers the consent success listener before the click so a later clickSelectPaymentMethod can await it. orderToken and orderId default to the order from a previous setup.order action. */
  async $tf_fillDocumentAndClickAssignConsent({
    identityDocument,
    ...expectedOrder
  }: FillDocumentAndConsentParams) {
    this.consentSuccessResponse = this.listenForConsent(
      'checkout.apm.nupay.fillDocumentAndClickAssignConsent',
      expectedOrder
    );
    await this.nupayForm.fillDocumentAndClickOnAssignConsent(identityDocument);
  }

  /** @description Adds installments to the purchase request and clicks the Pay button on the NuPay form. */
  async $tf_clickPay({ planOptionId }: ClickPayParams) {
    await this.nupayForm.clickPay(planOptionId);
  }

  /** @description Intercepts the purchase request and injects the installment plan option ID into the payment source payload. */
  async $tf_addInstallmentsToPurchaseRequest({ installmentPlanId }: AddInstallmentsParams) {
    await this.nupayForm.addInstallmentsToPurchaseRequest(installmentPlanId);
  }

  /** @description Waits for the payment methods response and extracts the plan option ID for the given installment count and payment method type. */
  async $tf_getPlanOptionIdForInstallments({
    installmentsCount,
    paymentMethodType,
  }: GetPlanOptionIdParams): Promise<string> {
    return await this.nupayForm.getPlanOptionIdForInstallments(
      installmentsCount,
      paymentMethodType
    );
  }

  /** @description Waits for the NuPay payment methods response and validates that both nupay_credit and nupay_debit methods are present with the expected installment options. */
  async $tf_validateGetPaymentMethodsResponse() {
    await this.nupayForm.validateGetPaymentMethodsResponse();
  }

  /** @description Waits for the consent failure response and validates that the error code corresponds to a missing document (DP-4030). */
  async $tf_validateErrorWithoutCPF() {
    await this.nupayForm.validateErrorWithoutCPF();
  }

  /** @description Waits for the consent failure response and validates that the error code corresponds to an invalid CPF (DP-4025). */
  async $tf_validateErrorInvalidCPF() {
    await this.nupayForm.validateErrorInvalidCPF();
  }

  /** @description Waits for a pending consent response and validates that the consent is pending, with the correct order token and transaction ID, indicating the user has no NuPay account. */
  async $tf_validateConsentCPFWithoutNupayAccount({
    orderToken,
    orderId,
  }: ValidateConsentCPFParams) {
    await this.nupayForm.validateConsentCPFWitoutNupayAccount(orderToken, orderId);
  }

  /** @description Waits for a POST consent response where the consent status is failed and returns the response object. */
  async $tf_waitForConsentFailureResponse() {
    return await this.nupayForm.waitForConsentFailureResponse();
  }

  /** @description Waits for a GET consent response where the consent status is pending and returns the response object. */
  async $tf_waitForConsentPendingResponse() {
    return await this.nupayForm.waitForConsentPendingResponse();
  }

  /** @description Asserts the order status returned in the NuPay purchase response, checking the HTTP status code and the order payment status. Returns the payment token from the request. */
  async $tf_assertOrderStatusRequestPurchase({ status, statusCode }: AssertOrderStatusParams) {
    return await this.nupayForm.assertOrderStatusRequestPurchase(status, statusCode);
  }
}
