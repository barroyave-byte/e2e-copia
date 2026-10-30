import { expect } from '@playwright/test';
import { FrameworkPlugin } from '../interface';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';

interface FillCreditCardParams {
  creditCardData: BaseCreditCard;
  opts?: { country?: string };
}

interface AssertOrderStatusParams {
  status: OrderStatusTypes;
  statusCode: number;
  options?: { disableBodyVerification: boolean };
}

export interface SelectAndFillCvvParams {
  cardNumber: string;
  cvv: string;
}

export interface AssertThankyouPageParams {
  text: string;
}

export interface SelectInstallmentsParams {
  installments: InstallmentQuantity;
}

export interface RedeemCouponParams {
  coupon: string;
}

export interface AssertRedirectStatusParams {
  status: string;
}

interface SelectSavedCardParams {
  cardNumber: string;
}

export class PluginCheckoutPaymentLink extends FrameworkPlugin {
  pluginBaseName = 'checkout.paymentLink';

  private _pageObject?: PaymentPage;

  get pageObject(): PaymentPage {
    if (!this._pageObject) {
      this._pageObject = new PaymentPage(this.context.page);
    }
    return this._pageObject;
  }

  /** @description Fills the credit card form fields directly on the payment link page (no iframe). Optionally resolves the document number by country code. */
  async $tf_fillCreditCardData({ creditCardData, opts }: FillCreditCardParams) {
    await this.pageObject.fillCreditCardDataWithBase(creditCardData, opts);
  }

  /** @description Clicks the pay button on the payment link page and waits for the purchase response. */
  async $tf_clickPay() {
    await this.pageObject.clickOnPayWaitResponse();
  }

  /** @description Asserts the purchase response HTTP status code and the order payment status in the response body. */
  async $tf_assertOrderStatusRequestPurchase({
    status,
    statusCode,
    options,
  }: AssertOrderStatusParams) {
    await this.pageObject.assertOrderStatusRequestPurchase(status, statusCode, options);
  }

  /** @description Asserts that the saved-cards view is visible on the payment link page (selected-card-last-four element is shown). Unlike the payment widget, payment link renders directly on the page without an iframe. */
  async $tf_assertSavedCardsVisible() {
    const savedCardEl = this.context.page.getByTestId('selected-card-last-four');
    await expect(savedCardEl).toBeVisible({ timeout: 30000 });
  }

  /** @description Selects a saved card from the payment link saved-cards list by matching on the last four digits of the provided card number. */
  async $tf_selectSavedCard({ cardNumber }: SelectSavedCardParams) {
    await this.pageObject.clickOnTestCard(cardNumber);
  }

  /** @description Asserts that the CVV input for a registered (saved) card is visible on the payment link page. */
  async $tf_assertCvvInputVisible() {
    await this.pageObject.assertCvvCodeToBeVisible();
  }

  /** @description Selects a saved card by last four digits and fills the CVV input on the payment link page. */
  async $tf_selectAndFillCvvSavedCard({ cardNumber, cvv }: SelectAndFillCvvParams) {
    await this.pageObject.selectAndFillCvvCreditCard(cardNumber, cvv);
  }

  /** @description Fills the CVV input for a pre-selected saved card on the payment link page. */
  async $tf_fillCvvCode({ cvv }: { cvv: string }) {
    await this.pageObject.fillCvvCode(cvv);
  }

  /** @description Clicks the sign-out button and confirms the logout on the payment link page. */
  async $tf_logout() {
    await this.pageObject.clickOnSignOut();
    await this.pageObject.confirmSignOut();
  }

  /** @description Clicks the see-all-cards button to display the full list of saved cards on the payment link page. */
  async $tf_seeAllCards() {
    await this.pageObject.clickOnSeeAllMyCards();
  }

  /** @description Opens the MSI installments dropdown and selects the given installment quantity on the payment link page. */
  async $tf_selectInstallmentsMSI({ installments }: SelectInstallmentsParams) {
    await this.pageObject.selectInstallmentsMSI(installments);
  }

  /** @description Fills the coupon input and submits it on the payment link page. */
  async $tf_redeemCoupon({ coupon }: RedeemCouponParams) {
    await this.pageObject.redeemCoupon(coupon);
  }

  /** @description Asserts the thank-you page title text after a successful payment on the payment link page. */
  async $tf_assertThankyouPage({ text }: AssertThankyouPageParams) {
    await this.pageObject.assertThankyouPage(text);
  }

  /** @description Asserts that the current page URL matches the redirect URL for the given status (close, success, pending, error, fallback). */
  async $tf_assertCurrentPageIsRedirectStatusUrl({ status }: AssertRedirectStatusParams) {
    await this.pageObject.assertCurrentPageIsRedirectStatusUrl(status);
  }
}
