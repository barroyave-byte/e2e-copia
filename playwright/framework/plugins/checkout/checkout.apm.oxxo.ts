import { Context, FrameworkPlugin } from '../interface';
import { OxxopayFormPage } from '@pages/explore/forms/oxxo/oxxopayFormPage';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';

interface AssertOrderStatusParams {
  status: OrderStatusTypes;
  statusCode: number;
}

export class PluginCheckoutApmOxxo extends FrameworkPlugin {
  pluginBaseName = 'checkout.apm.oxxo';

  oxxoForm!: OxxopayFormPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.oxxoForm = new OxxopayFormPage(context.page);
  }

  /** @description Selects the OXXO payment method option in the checkout form. */
  async $tf_selectOxxoForm() {
    await this.oxxoForm.selectOxxoForm();
  }

  /** @description Clicks the Pay button on the OXXO form and waits for the purchase response. */
  async $tf_clickPay() {
    await this.oxxoForm.clickPay();
  }

  /** @description Asserts the order status returned in the OXXO purchase response, checking the HTTP status code and the order payment status. */
  async $tf_assertOrderStatus({ status, statusCode }: AssertOrderStatusParams) {
    await this.oxxoForm.assertOrderStatusRequestPurchase(status, statusCode);
  }
}
