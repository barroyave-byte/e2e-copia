import { expect, type Locator, type Page } from '@playwright/test';

export class AdminErrorManagementPage {
  readonly page: Page;
  readonly errorsDropdown: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.errorsDropdown = page.getByTestId(/^error-management-table-actionable-dropdown-/);
    this.confirmButton = page.getByTestId('error-management-modal-button-confirm-action');
  }

  async clickFirstDeclineButtonIfVisible() {
    const dropdownTestId = await this.openDropdownWithDifferentValue('false');
    const declineActionOption = this.getActionOption(dropdownTestId, 'false');
    await expect(declineActionOption).toBeVisible();
    await declineActionOption.click();
  }

  async updateProcessorErrorOfDeclineToRetryStatus() {
    const dropdownTestId = await this.openDropdownWithDifferentValue('true');
    const retryActionOption = this.getActionOption(dropdownTestId, 'true');
    await expect(retryActionOption).toBeVisible();
    await retryActionOption.click();
  }

  /**
   * Confirming saves the change and reloads the table, which shows a skeleton while
   * `processors/errors/search` is in flight. A row scan started before the reload ends finds no
   * rows (ADM-T418, run regression-stg-41ba24a8), so wait for the reload and its rows.
   */
  async clickConfirmAction() {
    const tableReloaded = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/processors/errors/search'),
      { timeout: 40000 }
    );
    await this.confirmButton.click();
    await tableReloaded;
    await expect(
      this.errorsDropdown.first(),
      'The error management table did not reload after the change'
    ).toBeVisible({ timeout: 40000 });
  }

  private getActionOption(dropdownTestId: string, action: 'false' | 'true'): Locator {
    return this.page.getByTestId(`${dropdownTestId}-dropdown-option-${action}`);
  }

  /**
   * The actionable dropdown is a Radix Select, which only fires onValueChange when the
   * picked option differs from the current one. Picking whatever row happens to be first
   * risks landing on one already set to `action` (e.g. a processor error whose default is
   * "Declinar"): the select would then close silently with no confirm dialog, and the
   * caller's follow-up clickConfirmAction() would wait forever for a button that never
   * renders (confirmed live against ADM-T418: Stripe's default "expired_card" row is
   * already "Declinar", so re-picking "Declinar" is a no-op). Scan rows for one whose
   * current value differs from `action` so a real change — and its confirm dialog — is
   * guaranteed.
   */
  private async openDropdownWithDifferentValue(action: 'false' | 'true'): Promise<string> {
    await expect(
      this.errorsDropdown.first(),
      'The first actionable error dropdown is not visible'
    ).toBeVisible({ timeout: 40000 });
    const dropdowns = await this.errorsDropdown.all();

    for (const dropdown of dropdowns) {
      const dropdownTestId = await dropdown.getAttribute('data-testid');
      if (!dropdownTestId) {
        continue;
      }

      await expect(
        dropdown,
        `The actionable dropdown ${dropdownTestId} is not visible`
      ).toBeVisible({ timeout: 40000 });
      await dropdown.click();
      const option = this.getActionOption(dropdownTestId, action);
      await expect(
        option,
        `The ${action} action option is not visible for dropdown ${dropdownTestId}`
      ).toBeVisible({ timeout: 40000 });

      const isAlreadySelected = (await option.getAttribute('data-state')) === 'checked';
      if (!isAlreadySelected) {
        return dropdownTestId;
      }

      await this.page.keyboard.press('Escape');
    }

    throw new Error(
      `No error management row found whose actionable value differs from "${action}"`
    );
  }
}
