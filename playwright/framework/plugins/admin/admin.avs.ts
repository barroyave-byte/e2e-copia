import { Context, FrameworkPlugin } from '../interface';
import { AdminAvsPage } from '@pages/admin/adminAvsPage';

export class PluginAdminAvs extends FrameworkPlugin {
  pluginBaseName = 'admin.avs';

  avsPage!: AdminAvsPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.avsPage = new AdminAvsPage(context.page);
  }

  /** @description Clicks the AVS tab in the error management page to display the AVS configuration form. */
  async $tf_clickAvsTab() {
    await this.avsPage.clickAvsTab();
  }

  /** @description Activates the AVS toggle switch if it is not already checked. */
  async $tf_activateAvsToggle() {
    await this.avsPage.activateAvsToggle();
  }

  /** @description Deactivates the AVS toggle switch if it is currently active. */
  async $tf_deactivateAvsToggle() {
    await this.avsPage.deactivateAvsToggleIfActive();
  }

  /** @description Asserts that the AVS toggle switch is visible and unchecked. */
  async $tf_verifyAvsToggleDeactivated() {
    await this.avsPage.verifyAvsToggleIsDeactivated();
  }

  /** @description Randomly selects a subset of AVS code checkboxes and tracks the selected test IDs for later verification. */
  async $tf_selectAvsCodeCheckboxes() {
    await this.avsPage.selectRandomAvsCodeCheckboxes();
  }

  /** @description Randomly deselects a subset of the previously selected AVS code checkboxes. */
  async $tf_deselectAvsCodeCheckboxes() {
    await this.avsPage.deselectRandomAvsCodeCheckboxes();
  }

  /** @description Selects all three AVS configuration checkboxes (unknown, empty, unsupported) and verifies each is checked. */
  async $tf_selectConfigurationCheckboxes() {
    await this.avsPage.selectConfigurationCheckboxes();
  }

  /** @description Saves the current AVS configuration form. */
  async $tf_saveConfiguration() {
    await this.avsPage.saveConfiguration();
  }

  /** @description Asserts a success toast is visible after saving the AVS configuration. */
  async $tf_verifySuccessToast() {
    await this.avsPage.verifySuccessToast();
  }

  /** @description Opens the AVS configuration changelog dialog via the history button. */
  async $tf_openHistory() {
    await this.avsPage.openHistory();
  }

  /** @description Asserts the AVS history dialog is visible with at least one changelog entry. */
  async $tf_assertHistoryDialogVisible() {
    await this.avsPage.assertHistoryDialogVisible();
  }

  /** @description Asserts the first changelog entry has a non-empty title, description and timestamp. */
  async $tf_assertFirstHistoryEntryHasContent() {
    await this.avsPage.assertFirstHistoryEntryHasContent();
  }

  /** @description Closes the AVS history dialog. */
  async $tf_closeHistory() {
    await this.avsPage.closeHistory();
  }
}
