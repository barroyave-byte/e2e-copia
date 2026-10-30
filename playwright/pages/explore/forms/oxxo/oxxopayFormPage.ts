import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';

export class OxxopayFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormOxxo: Locator;
  readonly buttonPay: Locator;
  responsePromise: any;

  //Locators
  constructor(page: Page) {
    super(page);
    this.page = page;
    this.optionFormOxxo = page.locator('#payment_method_payu_oxxo_cash');
    this.buttonPay = page.getByRole('button', { name: 'Pagar' });
  }

  //Actions
  async selectOxxoForm() {
    await expect(this.optionFormOxxo)
      .toBeVisible()
      .then(() => this.optionFormOxxo.scrollIntoViewIfNeeded());
    await this.optionFormOxxo.click();
  }

  async clickPay() {
    this.waitingPurchaseResponse();
    await this.ensureVisibleToClick(this.buttonPay);
  }

  async assertOrderStatusRequestPurchase(status: OrderStatusTypes, statusCode: number) {
    const responsePurchase = await this.purchaseResponse;
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
