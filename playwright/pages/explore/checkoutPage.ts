import { expect, Locator, Page } from '@playwright/test';
import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';

export class CheckoutPage {
  readonly page: Page;
  readonly cardMethodElm: Locator;
  readonly buttonFinalizePurchase: Locator;
  readonly inputCreditCardNumber: Locator;
  readonly inputExpirationDate: Locator;
  readonly inputCardCVV: Locator;

  responsePromise: any;

  //Locators
  constructor(page: Page) {
    this.page = page;
    this.inputCreditCardNumber = page.locator('#card-number-undefined');
    this.inputExpirationDate = page.locator('#card-exp-date-undefined');
    this.inputCardCVV = page.locator('#cvv-undefined');
    this.cardMethodElm = page.locator('#payment_method_credit_card');
    this.buttonFinalizePurchase = page.getByRole('button', {
      name: 'Pagar',
    });
  }

  //Actions
  async clickOnCreditCard() {
    await this.cardMethodElm.click();
  }

  async waitForPurchaseCompleteV2() {
    await this.page.waitForRequest('**/v2/merchants/orders/purchase');
  }

  async waitForPurchaseV2Response() {
    this.responsePromise = this.page.waitForResponse('**/v2/merchants/orders/purchase');
  }

  async clickOnButtonFinalizePurchase(isPurchaseV1 = false) {
    if (!isPurchaseV1) {
      this.waitForPurchaseV2Response();
    } else {
      this.responsePromise = this.page.waitForResponse('**/merchants/transactions/purchase');
    }
    await this.buttonFinalizePurchase.click();
  }

  async fillCreditCardData(creditCardData: BaseCreditCard) {
    await this.page.waitForTimeout(1000);
    expect(this.inputCreditCardNumber, 'Credit card input is not visible').toBeVisible();
    await this.inputCreditCardNumber.fill(creditCardData.number);
    await this.inputExpirationDate.fill(creditCardData.expiration_date);
    await this.inputCardCVV.fill(creditCardData.cvv_code);
    await this.page.waitForTimeout(1000);
  }

  //Assertions:
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
}
