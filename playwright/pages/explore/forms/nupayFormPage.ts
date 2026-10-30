import { expect, Locator, Page } from '@playwright/test';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { waitForConsentResponse } from '@support/utils/consent';

let responsePromise;
export class NupayFormPage {
  readonly page: Page;
  readonly optionFormNupay: Locator;
  readonly inputIdentityDocument: Locator;
  readonly buttonAssignConsent: Locator;
  readonly selectPaymentMethod: Locator;
  readonly buttonPay: Locator;

  //Locators
  constructor(page: Page) {
    this.page = page;
    this.optionFormNupay = page.locator('#payment_method_nupay_credit');
    this.inputIdentityDocument = page.getByLabel('Documento de identidade');
    this.buttonAssignConsent = page.getByRole('button', { name: 'Assinar consentimento' });
    this.selectPaymentMethod = page
      .locator('div[data-baseweb="block"]')
      .filter({ hasText: 'Forma de pagamento', hasNotText: 'Installments' })
      .locator('#custom-select-dropdown [role="button"]');
    this.buttonPay = page.getByRole('button', { name: 'Pagar' });
  }

  //Actions
  async selectNupayForm() {
    await this.optionFormNupay.scrollIntoViewIfNeeded();
    await this.optionFormNupay.click();
  }

  async fillIdentityDocument(identityDocument: string) {
    await this.inputIdentityDocument.fill(identityDocument);
  }

  async clickOnButtonAssignConsent() {
    await this.buttonAssignConsent.click();
  }

  /** Matches the consent GET whose payload belongs to the expected order. */
  listenForConsentSuccessResponse(orderToken: string, orderId: string) {
    return waitForConsentResponse(this.page, {
      orderToken,
      orderId,
      status: 'success',
    });
  }

  async clickOnSelectPaymentMethod(consentResponse: ReturnType<Page['waitForResponse']>) {
    await consentResponse;
    await this.selectPaymentMethod.click();
  }

  async selectPaymentMethodOption(paymentMethod: 'NuPay Credit' | 'NuPay Debit') {
    const optionPaymentMethod = this.page.getByText(`${paymentMethod}`);
    await optionPaymentMethod.click({ force: true });
  }

  async fillNupayFormAndSelectPaymentMethod(
    identityDocument: string,
    paymentMethod: 'NuPay Credit' | 'NuPay Debit',
    consentResponse: ReturnType<Page['waitForResponse']>
  ) {
    await this.selectNupayForm();
    await this.fillIdentityDocument(identityDocument);
    await this.clickOnButtonAssignConsent();
    await this.clickOnSelectPaymentMethod(consentResponse);
    await this.selectPaymentMethodOption(paymentMethod);
  }

  listenForPaymentMethodsResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('payments-methods') && response.request().method() === 'GET'
    );
  }

  async assertPaymentMethodsResponse(paymentMethodsResponse: ReturnType<Page['waitForResponse']>) {
    const response = await paymentMethodsResponse;
    const responseBody = await response.json();
    expect(response.status(), 'payment-methods response status should be 200').toBe(200);
    expect(
      responseBody.data.length,
      'payment-methods request data should not be empty'
    ).toBeGreaterThan(0);
  }

  async fillDocumentAndClickOnAssignConsent(identityDocument: string) {
    await this.selectNupayForm();
    await this.fillIdentityDocument(identityDocument);
    await this.clickOnButtonAssignConsent();
  }

  async clickPay(planOptionId: string) {
    await this.addInstallmentsToPurchaseRequest(planOptionId);
    responsePromise = this.page.waitForResponse('**/v2/merchants/orders/purchase', {
      timeout: 60000,
    });
    await this.buttonPay.click();
  }

  async addInstallmentsToPurchaseRequest(installmentPlanId: string) {
    await this.page.route('**/v2/merchants/orders/purchase', (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        let postData = JSON.parse(request.postData());
        postData.payment_source.installment = {
          plan_option_id: `${installmentPlanId}`,
        };
        route.continue({
          postData: JSON.stringify(postData),
        });
      } else {
        route.continue();
      }
    });
  }

  //Assertions:

  async validateErrorWithoutCPF() {
    const prepareConsentResponse = this.waitForConsentFailureResponse();
    const consentResponse = await prepareConsentResponse;
    await this.validateConsentMissingDocument(consentResponse);
  }

  async validateConsentCPFWitoutNupayAccount(orderToken: string, orderId: string) {
    const prepareConsentResponse = this.waitForConsentPendingResponse();
    const consentResponse = await prepareConsentResponse;
    await this.validateConsentPendingWithoutNupayAccount(consentResponse, orderToken, orderId);
  }

  async validateErrorInvalidCPF() {
    const prepareConsentResponse = this.waitForConsentFailureResponse();
    const consentResponse = await prepareConsentResponse;
    await this.validateConsentInvalidCPFStatus(consentResponse);
  }

  waitForConsentFailureResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/consent') &&
        response.request().method() === 'POST' &&
        response.json().then((json) => json.data.consent.status === 'failed')
    );
  }

  waitForConsentPendingResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/consent') &&
        response.request().method() === 'GET' &&
        response.json().then((json) => json.data.consent.status === 'pending')
    );
  }

  async getPlanOptionIdForInstallments(
    installmentsCount: number,
    paymentMethodType: 'nupay_debit' | 'nupay_credit',
    paymentMethodsResponse?: ReturnType<Page['waitForResponse']>
  ): Promise<string> {
    const response = await (paymentMethodsResponse ??
      this.page.waitForResponse((response) => this.isTargetPaymentMethodsResponse(response)));
    const responseBody = await response.json();
    if (paymentMethodType === 'nupay_credit' && installmentsCount === 3) {
      this.validateNupayCredit(responseBody);
    }
    if (paymentMethodType === 'nupay_debit') {
      this.validateNupayDebit(responseBody);
    }

    const planOptionId = await this.extractPlanOptionIdFromResponse(
      response,
      installmentsCount,
      paymentMethodType
    );
    console.log(`[INFO] ----> The plan option id is ${planOptionId}`);
    return planOptionId;
  }

  private isTargetPaymentMethodsResponse(response): boolean {
    const isPaymentMethodsEndpoint = response
      .url()
      .includes('payments-methods?restrict_to_payment_methods=NUPAY');
    const isGetMethod = response.request().method() === 'GET';
    return isPaymentMethodsEndpoint && isGetMethod;
  }

  private async extractPlanOptionIdFromResponse(
    response,
    installmentsCount: number,
    paymentMethodType: string
  ): Promise<string> {
    const responseBody = await response.json();
    const paymentMethod = responseBody.data.find(
      (method) => method.method_type === `${paymentMethodType}`
    );
    if (!paymentMethod) return '';

    const installmentOption = paymentMethod.installments.find(
      (installment) => installment.installments === installmentsCount
    );
    return installmentOption ? installmentOption.plan_option_id : '';
  }

  async validateConsentInvalidCPFStatus(response) {
    const responseBody = await response.json();
    console.log(`[INFO] ----> The response body is ${JSON.stringify(responseBody)}`);
    expect(responseBody.data.error.code).toBe('DP-4025');
  }

  async validateConsentMissingDocument(response) {
    const responseBody = await response.json();
    console.log(`[INFO] ----> The response body is ${JSON.stringify(responseBody)}`);
    expect(responseBody.data.error.code).toBe('DP-4030');
    expect(responseBody.data.error.message).toBe('missing document or document type');
  }

  async validateConsentPendingWithoutNupayAccount(response, orderToken: string, orderId: string) {
    const responseBody = await response.json();
    console.log(`[INFO] ----> The response body is ${JSON.stringify(responseBody)}`);
    expect(responseBody.data.consent.status).toBe('pending');
    expect(responseBody.data.consent.expires_at).not.toBeNull();
    expect(responseBody.data.order.order_token).toEqual(orderToken);
    expect(responseBody.data.order.transaction_id).toEqual(orderId);
  }

  async assertOrderStatusRequestPurchase(status: OrderStatusTypes, statusCode: number) {
    const responsePurchaseV2 = await responsePromise;
    expect(responsePurchaseV2.status(), 'purchase status').toBe(statusCode);
    const responsePurchaseBody = await responsePurchaseV2.json();
    if (status != 'denied') {
      console.log(
        `[INFO] --> Order Status in request purchase: ${responsePurchaseBody.order.payment.data.status}`
      );
      expect(responsePurchaseBody.order.payment.data.status).toBe(status);
    }
    const token = responsePurchaseV2.request().postDataJSON().token;
    return token;
  }

  async validateGetPaymentMethodsResponse() {
    const response = await this.page.waitForResponse(async (response) => {
      return this.isTargetPaymentMethodsResponse(response);
    });
    const responseBody = await response.json();
    this.validateNupayCredit(responseBody);
    this.validateNupayDebit(responseBody);
  }

  validateNupayCredit(responseBody) {
    const nupayCredit = this.findPaymentMethod(responseBody, 'nupay_credit');
    if (!nupayCredit) {
      throw new Error(`Payment method nupay_credit not found.`);
    }

    this.validateInstallmentOptions(nupayCredit, [1, 2, 3]);
    this.validateTaxForInstallments(nupayCredit, 3);
  }

  validateNupayDebit(responseBody) {
    const nupayDebit = this.findPaymentMethod(responseBody, 'nupay_debit');
    if (!nupayDebit) {
      throw new Error(`Payment method nupay_debit not found.`);
    }

    this.validateSingleInstallmentOption(nupayDebit);
    this.validateNoTaxForSingleInstallment(nupayDebit);
  }

  findPaymentMethod(responseBody, methodType) {
    return responseBody.data.find((method) => method.method_type === methodType);
  }

  validateInstallmentOptions(paymentMethod, expectedInstallments) {
    const installments = paymentMethod.installments.map((installment) => installment.installments);
    expect(installments).toEqual(expectedInstallments);
  }

  validateTaxForInstallments(paymentMethod, installmentCount) {
    const option = paymentMethod.installments.find(
      (installment) => installment.installments === installmentCount
    );
    expect(option).toBeDefined();
    expect(option.installment_tax.length).toBeGreaterThan(0);
  }

  validateSingleInstallmentOption(paymentMethod) {
    expect(paymentMethod.installments.length).toEqual(1);
    expect(paymentMethod.installments[0].installments).toEqual(1);
  }

  validateNoTaxForSingleInstallment(paymentMethod) {
    expect(paymentMethod.installments[0].installment_tax.length).toEqual(0);
  }
}
