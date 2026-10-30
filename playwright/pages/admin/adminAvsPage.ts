import { expect, Locator, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

export const AVS_CONFIG_CHECKBOXES = {
  UNKNOWN: 'unknown',
  EMPTY: 'empty',
  UNSUPPORTED: 'unsupported',
} as const;

type AvsConfigCheckboxName = (typeof AVS_CONFIG_CHECKBOXES)[keyof typeof AVS_CONFIG_CHECKBOXES];

export class AdminAvsPage {
  readonly avsTabLocator: Locator;
  readonly avsToggleSwitchLocator: Locator;
  readonly saveButtonLocator: Locator;
  readonly allowUnknownCheckboxLocator: Locator;
  readonly allowEmptyCheckboxLocator: Locator;
  readonly allowUnsupportedCheckboxLocator: Locator;
  readonly successToastLocator: Locator;
  readonly historyButtonLocator: Locator;
  readonly historyDialogLocator: Locator;
  readonly historyEntries: Locator;
  readonly firstHistoryEntryTitle: Locator;
  readonly firstHistoryEntryDescription: Locator;
  readonly firstHistoryEntryTimestamp: Locator;

  /**
   * Set to store the test IDs of the selected AVS code checkboxes
   */
  private readonly selectedAvsCodeTestIds: Set<string> = new Set();

  /**
   * Object to track the state of configuration checkboxes
   */
  private readonly configCheckboxesState: Record<AvsConfigCheckboxName, boolean> = {
    unknown: false,
    empty: false,
    unsupported: false,
  };

  constructor(private readonly page: Page) {
    // Initialize tab locators
    this.avsTabLocator = page.getByTestId('error-management-tabs-filter-tab-avs');

    // Initialize form locators
    this.avsToggleSwitchLocator = page.getByTestId('avs-form-toggle-switch');
    this.saveButtonLocator = page.getByTestId('avs-form-button-save');

    // Initialize configuration checkboxes
    this.allowUnknownCheckboxLocator = page.getByTestId('avs-form-checkbox-allow-unknown');
    this.allowEmptyCheckboxLocator = page.getByTestId('avs-form-checkbox-allow-empty');
    this.allowUnsupportedCheckboxLocator = page.getByTestId('avs-form-checkbox-allow-unsupported');

    // Initialize toast locators
    this.successToastLocator = page.getByTestId('avs-toast-success').first();

    // Initialize history locators
    this.historyButtonLocator = page.getByTestId('avs-history-button');
    this.historyDialogLocator = page.getByTestId('avs-history-dialog');
    this.historyEntries = page.locator(
      '[data-testid^="avs-history-changelog-entry-"]:not([data-testid*="-title-"]):not([data-testid*="-description-"]):not([data-testid*="-timestamp-"])'
    );
    this.firstHistoryEntryTitle = page.getByTestId('avs-history-changelog-entry-title-0');
    this.firstHistoryEntryDescription = page.getByTestId(
      'avs-history-changelog-entry-description-0'
    );
    this.firstHistoryEntryTimestamp = page.getByTestId('avs-history-changelog-entry-timestamp-0');
  }

  async clickAvsTab() {
    await expect(this.avsTabLocator).toBeVisible();
    await this.avsTabLocator.click();
  }

  async activateAvsToggle() {
    await expect(this.avsToggleSwitchLocator).toBeVisible();

    // Verify the switch is off by default
    const isChecked = await this.avsToggleSwitchLocator.isChecked();
    if (!isChecked) {
      await this.avsToggleSwitchLocator.click();
    }

    // Verify the switch is now on
    await expect(this.avsToggleSwitchLocator).toBeChecked();
  }

  async deactivateAvsToggleIfActive() {
    await expect(this.avsToggleSwitchLocator).toBeVisible();

    // Check if the switch is currently on
    const isChecked = await this.avsToggleSwitchLocator.isChecked();
    if (isChecked) {
      await this.avsToggleSwitchLocator.click();
      // Verify the switch is now off
      await expect(this.avsToggleSwitchLocator).not.toBeChecked();
    }
  }

  async verifyAvsToggleIsDeactivated() {
    await expect(this.avsToggleSwitchLocator).toBeVisible();
    await expect(this.avsToggleSwitchLocator).not.toBeChecked();
  }

  async selectRandomAvsCodeCheckboxes() {
    const allCheckboxes = await this.page.locator('[data-testid^="avs-form-checkbox-"]').all();
    expect(allCheckboxes.length).toBeGreaterThan(0);

    const avsCodeCheckboxes = (
      await Promise.all(
        allCheckboxes.map(async (checkboxLocator, index) => {
          const testId: string | null = await checkboxLocator.getAttribute('data-testid');

          // Skip configuration checkboxes
          if (this.isConfigurationCheckbox(testId) || !testId) {
            return null;
          }

          return { checkboxLocator, testId, index };
        })
      )
    ).filter((item) => item !== null);

    expect(avsCodeCheckboxes.length).toBeGreaterThan(0);
    expect(avsCodeCheckboxes.length).toBeLessThan(allCheckboxes.length);

    const randomCount = faker.number.int({ min: 1, max: avsCodeCheckboxes.length });
    const shuffledCheckboxes = faker.helpers.shuffle([...avsCodeCheckboxes]);
    const checkboxesToSelect = shuffledCheckboxes.slice(0, randomCount);

    // Reset tracking set
    this.selectedAvsCodeTestIds.clear();

    for await (const { checkboxLocator, testId } of checkboxesToSelect) {
      const isChecked = await checkboxLocator.isChecked();

      if (!isChecked) {
        await expect(checkboxLocator).toBeVisible();
        await checkboxLocator.click();
        await expect(checkboxLocator).toHaveAttribute('aria-checked', 'true');
      }

      this.selectedAvsCodeTestIds.add(testId);
    }
  }

  async deselectRandomAvsCodeCheckboxes() {
    expect(this.selectedAvsCodeTestIds.size).toBeGreaterThan(0);

    const randomCount = faker.number.int({ min: 1, max: this.selectedAvsCodeTestIds.size });
    const shuffledSelectedIds = faker.helpers.shuffle(Array.from(this.selectedAvsCodeTestIds));
    const testIdsToDeselect = shuffledSelectedIds.slice(0, randomCount);

    for await (const testId of testIdsToDeselect) {
      const checkboxLocator = this.page.getByTestId(testId);
      await expect(checkboxLocator).toBeVisible();
      await expect(checkboxLocator).toHaveAttribute('aria-checked', 'true');
      await checkboxLocator.click();
      await expect(checkboxLocator).toHaveAttribute('aria-checked', 'false');
    }

    this.removeSelectedAvsCodeTestIds(testIdsToDeselect);
  }

  async selectConfigurationCheckboxes() {
    const configCheckboxNames: AvsConfigCheckboxName[] = [
      AVS_CONFIG_CHECKBOXES.UNKNOWN,
      AVS_CONFIG_CHECKBOXES.EMPTY,
      AVS_CONFIG_CHECKBOXES.UNSUPPORTED,
    ];

    for await (const checkboxName of configCheckboxNames) {
      await this.selectAndVerifyConfigCheckbox(checkboxName);
    }
  }

  async saveConfiguration() {
    await expect(this.saveButtonLocator).toBeVisible();
    await expect(this.saveButtonLocator).toBeEnabled();
    await this.saveButtonLocator.click();
  }

  async verifySuccessToast() {
    await expect(this.successToastLocator).toBeVisible({ timeout: 10_000 });
  }

  async openHistory() {
    await expect(this.historyButtonLocator, 'The AVS history button is not visible').toBeVisible({
      timeout: 10000,
    });
    await this.historyButtonLocator.click();
  }

  async assertHistoryDialogVisible() {
    await expect(this.historyDialogLocator, 'The AVS history dialog did not open').toBeVisible({
      timeout: 10000,
    });
    await expect(
      this.historyEntries.first(),
      'The AVS history changelog has no visible entries'
    ).toBeVisible({ timeout: 10000 });
  }

  async assertFirstHistoryEntryHasContent() {
    await expect(this.firstHistoryEntryTitle, 'The first history entry has no title').not.toBeEmpty(
      {
        timeout: 10000,
      }
    );
    await expect(
      this.firstHistoryEntryDescription,
      'The first history entry has no description'
    ).not.toBeEmpty({ timeout: 10000 });
    await expect(
      this.firstHistoryEntryTimestamp,
      'The first history entry has no timestamp'
    ).not.toBeEmpty({ timeout: 10000 });
  }

  async closeHistory() {
    await this.page.keyboard.press('Escape');
    await expect(this.historyDialogLocator, 'The AVS history dialog did not close').toBeHidden({
      timeout: 10000,
    });
  }

  async verifyAllSelectedCheckboxesRemainChecked() {
    // Verify AVS toggle switch remains checked
    await expect(this.avsToggleSwitchLocator).toHaveAttribute('aria-checked', 'true');

    // Verify all selected AVS code checkboxes remain checked
    for await (const testId of this.selectedAvsCodeTestIds) {
      const checkboxLocator = this.page.getByTestId(testId);
      await expect(checkboxLocator).toBeVisible();
      await expect(checkboxLocator).toHaveAttribute('aria-checked', 'true');
    }

    // Verify configuration checkboxes based on their tracked state
    await this.verifyConfigCheckboxState(AVS_CONFIG_CHECKBOXES.UNKNOWN);
    await this.verifyConfigCheckboxState(AVS_CONFIG_CHECKBOXES.EMPTY);
    await this.verifyConfigCheckboxState(AVS_CONFIG_CHECKBOXES.UNSUPPORTED);
  }

  async toggleConfigurationCheckbox(checkboxName: AvsConfigCheckboxName) {
    const checkbox = this.getConfigCheckboxLocator(checkboxName);
    await expect(checkbox).toBeVisible();
    await checkbox.click();

    // Update the tracked state
    this.configCheckboxesState[checkboxName] = !this.configCheckboxesState[checkboxName];
  }

  //#region Private methods
  private getConfigCheckboxLocator(checkboxName: AvsConfigCheckboxName): Locator {
    const checkboxMap: Record<AvsConfigCheckboxName, Locator> = {
      unknown: this.allowUnknownCheckboxLocator,
      empty: this.allowEmptyCheckboxLocator,
      unsupported: this.allowUnsupportedCheckboxLocator,
    };
    return checkboxMap[checkboxName];
  }

  private async selectAndVerifyConfigCheckbox(checkboxName: AvsConfigCheckboxName) {
    const checkboxLocator = this.getConfigCheckboxLocator(checkboxName);
    await expect(checkboxLocator).toBeVisible();
    await checkboxLocator.click();
    await expect(checkboxLocator).toHaveAttribute('aria-checked', 'true');
    this.configCheckboxesState[checkboxName] = true;
  }

  private async verifyConfigCheckboxState(checkboxName: AvsConfigCheckboxName) {
    const checkboxLocator = this.getConfigCheckboxLocator(checkboxName);
    const expectedState = this.configCheckboxesState[checkboxName];

    if (expectedState) {
      await expect(checkboxLocator).toHaveAttribute('aria-checked', 'true');
    } else {
      await expect(checkboxLocator).toHaveAttribute('aria-checked', 'false');
    }
  }

  private removeSelectedAvsCodeTestIds(testIds: string[]): void {
    testIds.forEach((id) => this.selectedAvsCodeTestIds.delete(id));
  }

  /**
   * Helper method to check if a test ID belongs to a configuration checkbox
   */
  private isConfigurationCheckbox(testId: string | null): boolean {
    if (!testId) return false;

    return (
      testId.includes('allow-unknown') ||
      testId.includes('allow-empty') ||
      testId.includes('allow-unsupported')
    );
  }

  //#endregion
}
