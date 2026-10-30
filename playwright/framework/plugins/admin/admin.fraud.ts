import { Context, FrameworkPlugin } from '../interface';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { FraudProviderPage } from '@pages/explore/fraud_providers/fraudProvidersPage';
import { Providers } from '@pages/explore/fraud_providers/interfaces';
import type { BaseProcessor } from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

export class PluginAdminFraud extends FrameworkPlugin {
  pluginBaseName = 'admin.fraud';

  connectionsPage!: AdminConnectionsPage;
  fraudProviderPage!: FraudProviderPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.connectionsPage = new AdminConnectionsPage(context.page);
    this.fraudProviderPage = new FraudProviderPage(context.page);
  }

  /** @description Searches, selects, and configures the Cybersource fraud processor connection in the admin connections page. */
  async $tf_configureCybersource(params: { processorData: BaseProcessor }) {
    await this.connectionsPage.configureConnection(
      ConnectionsAvailable.cybersourceFraud,
      params.processorData,
      'fraud'
    );
  }

  /** @description Fills the fraud provider configuration form in the explore/checkout iframe using the provider field configuration map. */
  async $tf_fillFraudForm(params: { provider: Providers; data: Record<string, string | boolean> }) {
    await this.fraudProviderPage.fillForm(params.provider, params.data);
  }

  /** @description Clicks the fraud processor type option in the admin connections processor type selector. */
  async $tf_clickFraudProcessorOption() {
    await this.connectionsPage.clickOnFraudProcessorOption();
  }
}
