import { expect, Locator, Page, Request, Response } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';

export class PayPalFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormPayPalExpress: Locator;
  readonly optionFormPayPalNonExpress: Locator;
  readonly optionFormPayPalTwoSteps: Locator;
  readonly buttonPay: Locator;
  readonly buttonEmbedPay: Locator;
  readonly alertPaymentCanceled: Locator;

  readonly deunanowTranslations: DeunanowTranslations;

  // Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.optionFormPayPalExpress = this.page.locator('#payment_method_paypal_wallet_express');
    this.optionFormPayPalNonExpress = this.page.locator(
      '#payment_method_paypal_wallet_non_express'
    );
    this.optionFormPayPalTwoSteps = this.page.locator('#payment_method_paypal_wallet_two_steps');
    this.buttonPay = this.page.getByRole('button', { name: 'Pagar' });
    this.buttonEmbedPay = this.page.getByRole('button', { name: 'Embedir Pago' });
    this.alertPaymentCanceled = this.page.locator(
      '#paypal_wallet-userAction-notification-negative'
    );

    this.deunanowTranslations = getTranslations('deunanow', languageCode);
  }

  // Actions
  async selectPayPalExpressForm() {
    await expect(this.optionFormPayPalExpress).toBeVisible();
    await this.optionFormPayPalExpress.scrollIntoViewIfNeeded();
    await this.ensureVisibleToClick(this.optionFormPayPalExpress);
  }

  async selectPayPalNonExpressForm() {
    await expect(this.optionFormPayPalNonExpress).toBeVisible();
    await this.optionFormPayPalNonExpress.scrollIntoViewIfNeeded();
    await this.ensureVisibleToClick(this.optionFormPayPalNonExpress);
  }

  async selectPayPalTwoStepsForm() {
    await expect(this.optionFormPayPalTwoSteps).toBeVisible();
    await this.optionFormPayPalTwoSteps.scrollIntoViewIfNeeded();
    await this.ensureVisibleToClick(this.optionFormPayPalTwoSteps);
  }

  async clickOnPayButton(verifyAirlineInformation = false) {
    let orderRequestPromise: Promise<Request>;
    let orderResponsePromise: Promise<Response>;
    let orderRequestPayload: any;
    let orderResponseData: any;

    if (verifyAirlineInformation) {
      orderRequestPromise = this.page.waitForRequest('**/merchants/orders');
      orderResponsePromise = this.page.waitForResponse('**/merchants/orders');
    }
    const p1RequestPromise = this.page.waitForRequest('https://c.sandbox.paypal.com/**/p1');
    const p2RequestPromise = this.page.waitForRequest('https://c.sandbox.paypal.com/**/p2');

    await this.ensureVisibleToClick(this.buttonPay);
    if (verifyAirlineInformation) {
      const orderRequest = await orderRequestPromise;
      const orderResponse = await orderResponsePromise;
      orderRequestPayload = JSON.parse(orderRequest.postData());
      orderResponseData = await orderResponse.json();
    }
    const p1Request = await p1RequestPromise;
    const p2Request = await p2RequestPromise;

    if (verifyAirlineInformation) {
      expect(orderRequestPayload.order.airline_information).toBeTruthy();
      expect(orderResponseData.order.airline_information).toBeTruthy();
    }
    expect(p1Request.method()).toBe('POST');
    expect(p2Request.method()).toBe('POST');
  }

  async clickOnEmbedPayButton() {
    await this.ensureVisibleToClick(this.buttonEmbedPay);
  }

  // Assertions
  async assertAlertPaymentCanceled() {
    await this.ensureVisible(this.alertPaymentCanceled, {});
  }
}
