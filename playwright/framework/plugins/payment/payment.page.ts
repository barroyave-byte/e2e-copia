import { Context, FrameworkPlugin } from '../interface';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { TextPaymentMethods } from '@support/interfaces/textsPaymentsMethodsUITypes';

export interface SelectPaymentMethodParams {
  method: TextPaymentMethods;
}

export class PluginPaymentPage extends FrameworkPlugin {
  pluginBaseName = 'payment.page';

  page!: PaymentPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.page = new PaymentPage(context.page);
  }

  /** @description Selects a payment method in the payment selection screen by its visible text (e.g. "Payment Vault (Web SDK)", "Tarjeta de crédito"). */
  async $tf_selectPaymentMethod({ method }: SelectPaymentMethodParams) {
    await this.page.selectPaymentMethod(method);
  }

  /** @description Clicks the embedded pay button to confirm the selected payment method and open the embedded widget. */
  async $tf_clickOnPayButtonEmbedded() {
    await this.page.clickOnPayButtonEmbedded();
  }

  /** @description Clicks the summary pay button without waiting for the purchase transaction response. */
  async $tf_clickOnPayButtonSummaryWithOutTransaction() {
    await this.page.clickOnPayButtonSummaryWithOutTransaction();
  }
}
