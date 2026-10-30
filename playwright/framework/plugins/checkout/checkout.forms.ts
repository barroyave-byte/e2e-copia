import { Context, FrameworkPlugin } from '../interface';
import { CheckoutPage } from '@pages/explore/checkoutPage';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';

export class PluginCheckoutForms extends FrameworkPlugin {
  pluginBaseName = 'checkout.forms';

  checkoutPage!: CheckoutPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.checkoutPage = new CheckoutPage(context.page);
  }

  /** @description Fills the credit card data in the Formularios experience using direct DOM selectors (card number, expiration date, CVV). Use this action instead of checkout.paymentWidget.fillCreditCardData when experienceType is Formularios. */
  async $tf_fillCreditCardData({ creditCardData }: { creditCardData: BaseCreditCard }) {
    await this.checkoutPage.fillCreditCardData(creditCardData);
  }

  /** @description Clicks the Pagar button and sets up a response listener for the purchase transaction. Pass isPurchaseV1=true for V1 purchase flow, or omit/false for V2 flow. Use this action instead of checkout.paymentWidget.clickPay when experienceType is Formularios. */
  async $tf_clickFinalizePurchase({ isPurchaseV1 }: { isPurchaseV1?: boolean } = {}) {
    await this.checkoutPage.clickOnButtonFinalizePurchase(isPurchaseV1 ?? false);
  }
}
