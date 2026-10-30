import { Context, FrameworkPlugin } from '../interface';
import { AdminPaymentLinkPage } from '@pages/admin/payment_link/adminPaymentLinkPage';
import { AdminPaymentLinkFormPage } from '@pages/admin/payment_link/adminPaymentLinkFormPage';
import {
  PaymentLinksResponse,
  PaymentLink,
} from '@pages/admin/payment_link/interfaces/paymentLink';

export class PluginAdminPaymentLinks extends FrameworkPlugin {
  pluginBaseName = 'admin.paymentLinks';

  paymentLinkPage!: AdminPaymentLinkPage;
  paymentLinkFormPage!: AdminPaymentLinkFormPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.paymentLinkPage = new AdminPaymentLinkPage(context.page);
    this.paymentLinkFormPage = new AdminPaymentLinkFormPage(context.page);
  }

  /** @description Clicks the create payment link button and waits for navigation to the new payment link form page. */
  async $tf_navigateToCreatePaymentLink() {
    await this.paymentLinkPage.navigateToCreatePaymentLink();
  }

  /** @description Fills the payment link name input on the create payment link form. */
  async $tf_fillProductLinkName(params: { name: string }) {
    await this.paymentLinkFormPage.fillProductLinkName(params.name);
  }

  /** @description Fills the product name and amount fields and clicks save to add a product to the payment link. */
  async $tf_addProduct(params: { productName: string; productAmount: string }) {
    await this.paymentLinkFormPage.addProduct(params);
  }

  /** @description Types a search term into the payment links search input to filter the table. */
  async $tf_searchPaymentLink(params: { searchTerm: string }) {
    await this.paymentLinkPage.searchPaymentLink(params.searchTerm);
  }

  /** @description Clicks the clear filters button to reset all search and filter inputs on the payment links list page. */
  async $tf_clearFilters() {
    await this.paymentLinkPage.clearFilters();
  }

  /** @description Clicks the confirm button in the payment link action modal (e.g., for enabling or disabling a link). */
  async $tf_confirmAction() {
    await this.paymentLinkPage.confirmAction();
  }

  /** @description Clicks the cancel button in the payment link action modal to dismiss without applying changes. */
  async $tf_cancelAction() {
    await this.paymentLinkPage.cancelAction();
  }

  /** @description Asserts that the payment links list page is visible by checking the page title heading. */
  async $tf_assertPaymentLinkPage() {
    await this.paymentLinkPage.assertToBeInPaymentLinkPage();
  }

  /** @description Asserts that the payment links data grid is visible on the page. */
  async $tf_assertTableContainsData() {
    await this.paymentLinkPage.assertTableContainsData();
  }

  /** @description Searches through the payment links response data and returns the payment link object matching the given name, or undefined if not found. */
  async $tf_findPaymentLinkByName(params: {
    data: PaymentLinksResponse;
    name: string;
  }): Promise<PaymentLink | undefined> {
    return this.paymentLinkPage.findPaymentLinkByName(params.data, params.name);
  }

  /** @description Asserts that a payment link row with the given ID is visible in the data grid. */
  async $tf_assertPaymentLinkRowVisible(params: { paymentLinkId: string }) {
    await this.paymentLinkPage.assertPaymentLinkRowVisible(params.paymentLinkId);
  }
}
