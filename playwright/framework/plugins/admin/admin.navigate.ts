import { Context, FrameworkPlugin } from '../interface';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import envConfig from '@support/envConfig';

export class PluginAdminNavigate extends FrameworkPlugin {
  pluginBaseName = 'admin.navigate';

  homePage!: AdminHomePage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.homePage = new AdminHomePage(context.page);
  }

  /** @description Navigates to the admin page root URL. */
  async $tf_goToAdminPage() {
    await this.context.page.goto(envConfig.ADMIN_URL);
  }

  /** @description Clicks the merchant combobox in the sidebar, types the merchant name in the search field, and selects the matching option. */
  async $tf_selectMerchant({
    merchantName,
    merchantId,
  }: {
    merchantName: string;
    merchantId: string;
  }) {
    await this.homePage.selectMerchant(merchantName, merchantId);
  }

  /** @description Clicks the Orders navigation button and verifies the orders section is displayed. */
  async $tf_goToOrders() {
    await this.homePage.goToOrders();
  }

  /** @description Clicks the Connections navigation button and verifies the connections section is displayed. */
  async $tf_goToConnections() {
    await this.homePage.goToConnections();
  }

  /** @description Clicks the Error Management navigation button and verifies the error management section is displayed. */
  async $tf_goToErrorManagement() {
    await this.homePage.goToErrorManagement();
  }

  /** @description Clicks the Metrics navigation button and verifies the metrics section is displayed. */
  async $tf_goToMetrics() {
    await this.homePage.goToMetrics();
  }

  /** @description Clicks the Payment Strategy (routing) navigation button and verifies the payment strategy section is displayed. */
  async $tf_goToRouting() {
    await this.homePage.goToPaymentStrategy();
  }

  /** @description Clicks the Roles and Permissions navigation button and verifies the roles and permissions section is displayed. */
  async $tf_goToRoles() {
    await this.homePage.goToRolesAndPermissions();
  }

  /** @description Clicks the Payment Link navigation button and verifies the payment links section is displayed. */
  async $tf_goToPaymentLinks() {
    await this.homePage.goToPaymentLink();
  }

  /** @description Clicks the Subscriptions navigation link and waits for the subscriptions URL to load. */
  async $tf_goToSubscriptions() {
    await this.homePage.goToSubscriptions();
  }

  /** @description Clicks the Installments navigation button and verifies the installments section is displayed. */
  async $tf_goToInstallments() {
    await this.homePage.goToInstallments();
  }

  /** @description Clicks the Batch Processing navigation button to navigate to the batch processing section. */
  async $tf_goToBatchProcessing() {
    await this.homePage.goToBatchProcessing();
  }
}
