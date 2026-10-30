import { Context, FrameworkPlugin } from '../interface';
import { AdminInstallmentsPage } from '@pages/admin/installments_configuration/adminInstallmentsPage';
import { AdminCreateInstallmentCampaignPage } from '@pages/admin/installments_configuration/adminCreateInstallmentCampaignPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

export class PluginAdminInstallments extends FrameworkPlugin {
  pluginBaseName = 'admin.installments';

  installmentsPage!: AdminInstallmentsPage;
  createCampaignPage!: AdminCreateInstallmentCampaignPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.installmentsPage = new AdminInstallmentsPage(context.page);
    this.createCampaignPage = new AdminCreateInstallmentCampaignPage(context.page);
  }

  /** @description Clicks the create campaign button on the installments configuration page to open the campaign creation form. */
  async $tf_createCampaignClick() {
    await this.installmentsPage.createCampaignClick();
  }

  /** @description Opens the campaign type dropdown and selects either MSI (meses sin intereses) or MCI (meses con intereses). */
  async $tf_selectCampaignType(params: { type: 'MSI' | 'MCI' }) {
    await this.createCampaignPage.campaignTypeSelectClick();
    await this.createCampaignPage.selectOption(params.type);
  }

  /** @description Selects one or more payment processors in the campaign creation step 3. Pass null to select the first available processor. */
  async $tf_selectPaymentProcessor(params: { processors: ConnectionsAvailable[] | null }) {
    await this.createCampaignPage.selectPaymentProcessor(params.processors);
  }

  /** @description Selects the installment month checkboxes in campaign creation step 4 for each provided month number. */
  async $tf_selectMonthCheckbox(params: { months: number[] }) {
    await this.createCampaignPage.selectMonthsToInstallment(params.months);
  }

  /** @description Clicks the edit button for a specific month to open the month configuration panel. */
  async $tf_editMonthDescription(params: { month: number }) {
    await this.createCampaignPage.clickOnEditMonth(params.month);
  }

  /** @description Toggles the franchise checkbox for the given franchise name within a month configuration panel. */
  async $tf_selectFranchise(params: { franchise: string }) {
    await this.createCampaignPage.clickOnSwitchFranchise(params.franchise);
  }

  /** @description Asserts that the created campaign appears in the plans table by its name. */
  async $tf_assertCampaignActive(params: { campaignName: string }) {
    await this.createCampaignPage.saveActiveCampaignClick();
    // Verify the campaign name appears in the installments page after saving
    const campaignLocator = this.context.page.getByText(params.campaignName);
    await campaignLocator.waitFor({ state: 'visible', timeout: 15000 });
  }

  /** @description Finds a campaign by name and clicks the delete action from its context menu. */
  async $tf_deleteCampaign(params: { campaignName: string }) {
    const deleteButton = this.context.page.getByTestId(
      `installments-campaign-delete-${params.campaignName}`
    );
    await deleteButton.click();
  }
}
