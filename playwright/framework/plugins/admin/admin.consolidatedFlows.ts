import { Context, FrameworkPlugin } from '../interface';
import { resolveMerchantId } from '../../resolve';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import type { InstallmentsCampaign } from '@pages/admin/installments_configuration/installmentsCampaign';

export interface GoToAdminAndSetMerchantIdParams {
  merchantId?: string;
}

export interface ConfigureInstallmentCampaignParams {
  campaign: InstallmentsCampaign;
}

export class PluginAdminConsolidatedFlows extends FrameworkPlugin {
  pluginBaseName = 'admin.consolidatedFlows';

  flows!: AdminConsolidatedFlows;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.flows = new AdminConsolidatedFlows(context.page);
  }

  /** @description Navigates to the admin page and sets the merchant ID in session storage (defaults to the stored test merchant when not provided). */
  async $tf_goToAdminAndSetMerchantId({ merchantId }: GoToAdminAndSetMerchantIdParams = {}) {
    await this.flows.goToAdminAndSetMerchantId(
      resolveMerchantId(
        this.context,
        'admin.consolidatedFlows.goToAdminAndSetMerchantId',
        merchantId
      )
    );
  }

  /** @description Configures an MSI/MCI installment campaign from the admin installments page using the provided campaign definition. */
  async $tf_configureInstallmentCampaign({ campaign }: ConfigureInstallmentCampaignParams) {
    await this.flows.configureInstallmentCampaign(campaign);
  }
}
