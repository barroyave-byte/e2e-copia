import { Page } from '@support/fixtures';
import { Context, FrameworkPlugin } from '../interface';
import { PaypalPayLaterFormPage } from '@pages/explore/forms/paypalPayLaterFormPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { PaypalPayLaterPage } from '@pages/bnpl/paypalPayLaterPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { resolveMerchantId, resolveOrderToken } from '../../resolve';

export class PluginCheckoutBnplPaypalPayLater extends FrameworkPlugin {
  pluginBaseName = 'checkout.bnpl.paypalPayLater';

  private formPage!: PaypalPayLaterFormPage;
  private paymentPage!: PaymentPage;
  private adminOrderDetailsPage!: AdminOrderDetailsPage;
  private popupPromise: Promise<Page> | undefined;
  private paypalPage: PaypalPayLaterPage | undefined;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.formPage = new PaypalPayLaterFormPage(context.page);
    this.paymentPage = new PaymentPage(context.page, 'EN');
    this.adminOrderDetailsPage = new AdminOrderDetailsPage(context.page, 'EN');
    this.popupPromise = undefined;
    this.paypalPage = undefined;
  }

  private async getPaypalPage(): Promise<PaypalPayLaterPage> {
    if (this.paypalPage) return this.paypalPage;
    if (!this.popupPromise) {
      throw new Error('PayPal popup was not registered. Call clickPayButtonAndOpenPaypal first.');
    }
    const popup = await this.popupPromise;
    this.paypalPage = new PaypalPayLaterPage(popup);
    return this.paypalPage;
  }

  /** @description Selects PayPal Pay Later as payment method and clicks the pay button on the checkout form. */
  async $tf_selectPaypalPayLaterForm() {
    await this.formPage.selectPaypalPayLaterForm();
    await this.formPage.clickOnPayButton();
  }

  /** @description Clicks on the PayPal SPB pay button and waits for the PayPal Pay Later popup to open. */
  async $tf_clickPayButtonAndOpenPaypal() {
    this.popupPromise = this.context.page.waitForEvent('popup');
    await this.paymentPage.clickOnPaypalSpbButton();
  }

  /** @description Awaits the PayPal popup and logs in with sandbox credentials. */
  async $tf_loginInPaypal() {
    const page = await this.getPaypalPage();
    await page.login();
  }

  /** @description Selects the card to process the payment inside the PayPal popup. */
  async $tf_selectCardInPaypal() {
    const page = await this.getPaypalPage();
    await page.selectCard();
  }

  /** @description Clicks on the pay button inside the PayPal popup. */
  async $tf_clickPayInPaypal() {
    const page = await this.getPaypalPage();
    await page.pay();
  }

  /** @description Asserts that the processing view is displayed in the checkout payment page. */
  async $tf_assertProcessingView() {
    await this.paymentPage.assertProcessingView();
  }

  /** @description Asserts that the thank you page with the expected text is displayed. */
  async $tf_assertThankyouPage(params: { text: string }) {
    await this.formPage.assertThankyouPage(params.text);
  }

  /** @description Navigates to the admin order details page and asserts the payment status, processor name, installments number, and payment method. */
  async $tf_assertOrderDetails(params: {
    installments: number;
    expectedStatus?: OrderStatusTypes;
    expectedPaymentMethod?:
      | 'debit'
      | 'credit'
      | 'debit_card'
      | 'bnpl'
      | 'credit_card'
      | 'voucher'
      | 'wallet'
      | 'bank_transfer';
    orderToken?: string;
    merchantId?: string;
  }) {
    await this.adminOrderDetailsPage.goToOrderDetails(
      resolveMerchantId(
        this.context,
        'checkout.bnpl.paypalPayLater.assertOrderDetails',
        params.merchantId
      ),
      resolveOrderToken(
        this.context,
        'checkout.bnpl.paypalPayLater.assertOrderDetails',
        params.orderToken
      )
    );
    await this.adminOrderDetailsPage.assertPaymentStatus(params.expectedStatus ?? 'processed');
    await this.adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.paypalPayLater);
    await this.adminOrderDetailsPage.assertNumberOfInstallments(params.installments);
    await this.adminOrderDetailsPage.assertPaymentMethod(params.expectedPaymentMethod ?? 'bnpl');
  }
}
