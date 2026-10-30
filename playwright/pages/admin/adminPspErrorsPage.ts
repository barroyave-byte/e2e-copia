import { expect, type Locator, type Page } from '@playwright/test';

export type ErrorAction = 'retry' | 'decline';

const ACTION_VALUE: Record<ErrorAction, 'true' | 'false'> = {
  retry: 'true',
  decline: 'false',
};

// Spanish labels rendered by the current admin locale — confirmed live against the
// deployed PSP Errors table, not guessed (see ADM-T418's legacy POM for the same pair).
const ACTION_LABEL: Record<ErrorAction, string> = {
  retry: 'Reintentar',
  decline: 'Declinar',
};

export type CheckoutMessageLanguage = 'es' | 'en' | 'pt';

export class AdminPspErrorsPage {
  readonly rowCheckboxes: Locator;
  readonly headerCheckbox: Locator;
  readonly actionableDropdowns: Locator;
  readonly actionHeaderSelectTrigger: Locator;
  readonly actionHeaderApplyButton: Locator;
  readonly actionHeaderApplyConfirmButton: Locator;
  readonly actionHeaderSelectedChip: Locator;
  readonly actionHeaderEditMessageButton: Locator;
  readonly confirmActionButton: Locator;
  readonly changeConfirmDialog: Locator;
  readonly resetConfirmDialog: Locator;
  // Bridge selector: the design-system Toaster (Sonner) renders success toasts
  // without a data-testid — confirmed live against the deployed page, not guessed.
  // Replace with a testid if/when frontend adds one.
  readonly successToast: Locator;
  readonly paginatorPreviousButton: Locator;
  readonly paginatorNextButton: Locator;
  readonly paginatorInfoPage: Locator;
  readonly paginatorPageSizeSelect: Locator;
  readonly refreshButton: Locator;
  readonly searchInput: Locator;
  readonly processorFilterTrigger: Locator;
  readonly actionableFilterTrigger: Locator;
  readonly bulkCheckoutMessageModal: Locator;
  readonly bulkCheckoutMessageApplyButton: Locator;
  readonly checkoutMessageModal: Locator;
  readonly checkoutMessageModalSaveButton: Locator;
  readonly checkoutMessageModalCancelButton: Locator;
  // Bridge selector: this column has no dedicated per-row or per-column
  // data-testid in the design-system table — confirmed against admin-ff source,
  // not guessed. Replace with testids if/when frontend adds them.
  readonly checkoutMessageEditButtons: Locator;
  readonly tableHeaderCells: Locator;
  readonly tableBodyRows: Locator;
  readonly tableBodyCellAt: (rowIndex: number, cellIndex: number) => Locator;

  // Parameterized locators — declared here as constructor-assigned factory
  // functions (rather than built inline in a method) so every selector still
  // lives in one auditable place, matching the pattern in
  // adminPaymentStrategyByPercentagePage.ts / adminPaymentStrategyApmsPage.ts.
  readonly checkboxFor: (rowId: string) => Locator;
  readonly dropdownFor: (rowId: string) => Locator;
  readonly dropdownOptionFor: (rowId: string, action: ErrorAction) => Locator;
  readonly resetButtonFor: (rowId: string) => Locator;
  readonly actionHeaderActionableOptionFor: (action: ErrorAction) => Locator;
  readonly actionableFilterOptionFor: (value: 'all' | ErrorAction) => Locator;
  readonly processorFilterOptionByName: (name: string) => Locator;
  readonly checkoutMessageEditButtonFor: (rowId: string) => Locator;
  readonly checkoutMessageLanguageTabFor: (code: CheckoutMessageLanguage) => Locator;
  readonly checkoutMessageTextareaFor: (code: CheckoutMessageLanguage) => Locator;
  readonly checkoutMessageResetButtonFor: (code: CheckoutMessageLanguage) => Locator;
  readonly bulkCheckoutMessageLanguageTabFor: (code: CheckoutMessageLanguage) => Locator;
  readonly bulkCheckoutMessageTextareaFor: (code: CheckoutMessageLanguage) => Locator;

  constructor(private readonly page: Page) {
    this.rowCheckboxes = page.locator(
      '[data-testid^="error-management-table-checkbox-"]:not([data-testid="error-management-table-checkbox-header"])'
    );
    this.headerCheckbox = page.getByTestId('error-management-table-checkbox-header');
    this.actionableDropdowns = page.locator(
      '[data-testid^="error-management-table-actionable-dropdown-"]:not([data-testid*="-dropdown-option-"])'
    );
    this.actionHeaderSelectTrigger = page.getByTestId(
      'error-management-table-action-header-select-actionable'
    );
    this.actionHeaderApplyButton = page.getByTestId(
      'error-management-table-action-header-button-apply'
    );
    this.actionHeaderApplyConfirmButton = page.getByTestId(
      'error-management-table-action-header-modal-button-confirm-apply'
    );
    this.actionHeaderSelectedChip = page.getByTestId(
      'error-management-table-chip-action-header-selected'
    );
    this.actionHeaderEditMessageButton = page.getByTestId(
      'error-management-table-action-header-button-edit-message'
    );
    // Same testid as adminErrorManagementPage.ts's confirmButton (legacy POM used
    // only by ADM-T418, kept untouched by design). Both target the single global
    // confirm/reset modal on this table; true de-duplication would mean merging
    // the two POMs, out of scope for this change.
    this.confirmActionButton = page.getByTestId('error-management-modal-button-confirm-action');
    this.changeConfirmDialog = page.getByRole('dialog');
    this.resetConfirmDialog = page.getByRole('alertdialog');
    this.successToast = page.locator('li[data-sonner-toast][data-type="success"]');
    this.paginatorPreviousButton = page.getByTestId(
      'error-management-table-paginator-button-previous'
    );
    this.paginatorNextButton = page.getByTestId('error-management-table-paginator-button-next');
    this.paginatorInfoPage = page.getByTestId('error-management-table-paginator-info-page');
    this.paginatorPageSizeSelect = page.getByTestId(
      'error-management-table-paginator-select-page-size'
    );
    this.refreshButton = page.getByTestId('error-management-table-button-refresh');
    this.searchInput = page.getByTestId('error-management-filters-input-search');
    this.processorFilterTrigger = page.getByTestId(
      'error-management-filters-processor-combobox-container-trigger'
    );
    this.actionableFilterTrigger = page.getByTestId('error-management-filters-actionable');
    this.bulkCheckoutMessageModal = page.getByTestId(
      'error-management-table-bulk-checkout-message-modal'
    );
    this.bulkCheckoutMessageApplyButton = page.getByTestId(
      'error-management-table-bulk-checkout-message-modal-apply'
    );
    this.checkoutMessageModal = page.getByTestId('error-management-table-checkout-message-modal');
    this.checkoutMessageModalSaveButton = page.getByTestId(
      'error-management-table-checkout-message-modal-save'
    );
    this.checkoutMessageModalCancelButton = page.getByTestId(
      'error-management-table-checkout-message-modal-cancel'
    );
    this.checkoutMessageEditButtons = page.locator(
      '[data-testid^="error-management-table-checkout-message-edit-button-"]'
    );
    this.tableHeaderCells = page.locator('table thead th');
    // Same generic selector as adminReportsPage.ts's tableRows — there's no
    // shared base class for "the single table on this page" across POMs, and
    // this table has no dedicated container testid to scope it further.
    this.tableBodyRows = page.locator('table tbody tr');
    this.tableBodyCellAt = (rowIndex, cellIndex) =>
      this.tableBodyRows.nth(rowIndex).locator('td').nth(cellIndex);

    this.checkboxFor = (rowId) => page.getByTestId(`error-management-table-checkbox-${rowId}`);
    this.dropdownFor = (rowId) =>
      page.getByTestId(`error-management-table-actionable-dropdown-${rowId}`);
    this.dropdownOptionFor = (rowId, action) =>
      page.getByTestId(
        `error-management-table-actionable-dropdown-${rowId}-dropdown-option-${ACTION_VALUE[action]}`
      );
    this.resetButtonFor = (rowId) =>
      page.getByTestId(`error-management-table-actionable-button-reset-${rowId}`);
    this.actionHeaderActionableOptionFor = (action) =>
      page.getByTestId(
        `error-management-table-action-header-select-actionable-option-${ACTION_VALUE[action]}`
      );
    this.actionableFilterOptionFor = (value) =>
      page.getByTestId(
        `error-management-filters-actionable-option-${value === 'all' ? 'all' : ACTION_VALUE[value]}`
      );
    this.processorFilterOptionByName = (name) =>
      page.locator('[data-testid*="error-management-filters-processor-option-"]', {
        hasText: name,
      });
    this.checkoutMessageEditButtonFor = (rowId) =>
      page.getByTestId(`error-management-table-checkout-message-edit-button-${rowId}`);
    this.checkoutMessageLanguageTabFor = (code) =>
      page.getByTestId(`error-management-table-checkout-message-modal-filter-tab-${code}`);
    this.checkoutMessageTextareaFor = (code) =>
      page.getByTestId(`error-management-table-checkout-message-modal-textarea-${code}`);
    this.checkoutMessageResetButtonFor = (code) =>
      page.getByTestId(`error-management-table-checkout-message-modal-reset-${code}`);
    this.bulkCheckoutMessageLanguageTabFor = (code) =>
      page.getByTestId(`error-management-table-bulk-checkout-message-modal-filter-tab-${code}`);
    this.bulkCheckoutMessageTextareaFor = (code) =>
      page.getByTestId(`error-management-table-bulk-checkout-message-modal-textarea-${code}`);
  }

  /**
   * Selects `count` PSP error rows starting at `offset` (excluding the header
   * "select all" checkbox) and returns their row ids, extracted from each
   * checkbox's testid, so later assertions can target the same rows without
   * re-deriving them. `offset` lets specs sharing a fixed merchant (the
   * checkout-message allowlisted one) pick disjoint rows instead of colliding on
   * row 0 when run concurrently.
   */
  async selectFirstRows(count: number, offset = 0): Promise<string[]> {
    await expect(this.rowCheckboxes.first(), 'No PSP error row checkboxes are visible').toBeVisible(
      { timeout: 40000 }
    );
    const available = await this.rowCheckboxes.count();
    if (available < offset + count) {
      throw new Error(
        `Requested rows [${offset}, ${offset + count}) but only ${available} row checkboxes are visible`
      );
    }

    const rowIds: string[] = [];
    for (let i = offset; i < offset + count; i++) {
      const checkbox = this.rowCheckboxes.nth(i);
      await expect(checkbox, `Row checkbox at index ${i} is not visible`).toBeVisible({
        timeout: 10000,
      });
      const testId = await checkbox.getAttribute('data-testid');
      if (!testId) {
        throw new Error(`Row checkbox at index ${i} has no data-testid`);
      }
      await checkbox.click();
      rowIds.push(testId.replace('error-management-table-checkbox-', ''));
    }
    return rowIds;
  }

  async assertActionHeaderVisibleWithCount(count: number) {
    await expect(
      this.actionHeaderSelectTrigger,
      'The ActionHeader action select is not visible after selecting rows'
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.actionHeaderApplyButton,
      'The ActionHeader Apply button is not visible'
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.actionHeaderSelectedChip,
      `The ActionHeader selected-count chip does not show ${count}`
    ).toHaveText(new RegExp(String(count)));
  }

  async chooseBulkAction(action: ErrorAction) {
    await expect(
      this.actionHeaderSelectTrigger,
      'The ActionHeader action select is not visible'
    ).toBeVisible({ timeout: 10000 });
    await this.actionHeaderSelectTrigger.click();
    const option = this.actionHeaderActionableOptionFor(action);
    await expect(option, `The ActionHeader "${action}" option is not visible`).toBeVisible({
      timeout: 10000,
    });
    await option.click();
  }

  async clickApplyBulkAction() {
    await expect(
      this.actionHeaderApplyButton,
      'The ActionHeader Apply button is not visible'
    ).toBeVisible({ timeout: 10000 });
    await this.actionHeaderApplyButton.click();
  }

  async confirmBulkApply() {
    await expect(
      this.actionHeaderApplyConfirmButton,
      'The bulk-apply confirmation button is not visible'
    ).toBeVisible({ timeout: 10000 });
    await this.actionHeaderApplyConfirmButton.click();
    // The modal closes only after the bulk retry/decline API call resolves, so this
    // waits on backend latency, not just client-side render — give it more room than
    // the local checks in this file.
    await expect(
      this.actionHeaderApplyConfirmButton,
      'The bulk-apply modal did not close'
    ).toBeHidden({ timeout: 20000 });
  }

  async assertRowsShowAction(rowIds: string[], action: ErrorAction) {
    for (const rowId of rowIds) {
      await expect(
        this.dropdownFor(rowId),
        `Row ${rowId} does not show the expected action "${action}"`
      ).toHaveText(ACTION_LABEL[action]);
    }
  }

  async assertActionHeaderHidden() {
    await expect(
      this.actionHeaderSelectTrigger,
      'The ActionHeader is still visible after the selection should have cleared'
    ).toBeHidden({ timeout: 10000 });
  }

  async assertRowCheckboxesUnchecked(rowIds: string[]) {
    for (const rowId of rowIds) {
      await expect(
        this.checkboxFor(rowId),
        `Row ${rowId}'s checkbox is still checked`
      ).not.toBeChecked();
    }
  }

  /** Finds the first PSP error row that has no merchant override yet (no reset button). */
  async pickRowWithoutOverride(): Promise<string> {
    await expect(
      this.actionableDropdowns.first(),
      'No PSP error row action dropdowns are visible'
    ).toBeVisible({ timeout: 40000 });
    const dropdowns = await this.actionableDropdowns.all();

    for (const dropdown of dropdowns) {
      const testId = await dropdown.getAttribute('data-testid');
      if (!testId) continue;
      const rowId = testId.replace('error-management-table-actionable-dropdown-', '');
      const isOverridden = await this.resetButtonFor(rowId).isVisible();
      if (!isOverridden) {
        return rowId;
      }
    }

    throw new Error('No PSP error row without an existing override was found');
  }

  async assertRowHasNoOverrideControls(rowId: string) {
    await expect(
      this.resetButtonFor(rowId),
      `Row ${rowId} unexpectedly shows a reset button before any override`
    ).toBeHidden({ timeout: 10000 });
  }

  async getRowAction(rowId: string): Promise<ErrorAction> {
    const text = (await this.dropdownFor(rowId).innerText()).trim();
    const match = (Object.keys(ACTION_LABEL) as ErrorAction[]).find(
      (action) => ACTION_LABEL[action] === text
    );
    if (!match) {
      throw new Error(`Row ${rowId} dropdown shows unrecognized action text "${text}"`);
    }
    return match;
  }

  /** Opens the row's dropdown and picks the option opposite to its current value. */
  async changeRowActionToOpposite(rowId: string): Promise<ErrorAction> {
    const current = await this.getRowAction(rowId);
    const target: ErrorAction = current === 'retry' ? 'decline' : 'retry';

    await expect(this.dropdownFor(rowId), `Row ${rowId}'s dropdown is not visible`).toBeVisible({
      timeout: 10000,
    });
    await this.dropdownFor(rowId).click();
    const option = this.dropdownOptionFor(rowId, target);
    await expect(option, `Row ${rowId}'s "${target}" option is not visible`).toBeVisible({
      timeout: 10000,
    });
    await option.click();
    return target;
  }

  async assertChangeConfirmDialogVisible() {
    await expect(
      this.changeConfirmDialog,
      'The non-destructive change confirmation dialog is not visible'
    ).toBeVisible({ timeout: 10000 });
  }

  async assertResetConfirmDialogVisible() {
    await expect(
      this.resetConfirmDialog,
      'The destructive reset confirmation dialog is not visible'
    ).toBeVisible({ timeout: 10000 });
  }

  async confirmActionModal() {
    await expect(
      this.confirmActionButton,
      'The action confirmation button is not visible'
    ).toBeVisible({ timeout: 10000 });
    await this.confirmActionButton.click();
    // The modal closes only after the change/reset API call resolves — backend-bound,
    // not just a local render.
    await expect(
      this.confirmActionButton,
      'The action confirmation modal did not close'
    ).toBeHidden({ timeout: 20000 });
  }

  async assertRowShowsAction(rowId: string, action: ErrorAction) {
    await expect(
      this.dropdownFor(rowId),
      `Row ${rowId} does not show the expected action "${action}"`
    ).toHaveText(ACTION_LABEL[action]);
  }

  async resetRowToDefault(rowId: string) {
    const resetButton = this.resetButtonFor(rowId);
    await expect(resetButton, `Row ${rowId}'s reset button is not visible`).toBeVisible({
      timeout: 10000,
    });
    await resetButton.click();
  }

  async assertRowResetControlsHidden(rowId: string) {
    await expect(
      this.resetButtonFor(rowId),
      `Row ${rowId}'s reset button is unexpectedly still visible`
    ).toBeHidden({ timeout: 10000 });
  }

  async assertSuccessToastVisible() {
    await expect(this.successToast.first(), 'No success toast appeared').toBeVisible({
      timeout: 10000,
    });
  }

  //#region Pagination and refresh

  async getTotalCount(): Promise<number> {
    await expect(this.rowCheckboxes.first(), 'No PSP error rows are visible').toBeVisible({
      timeout: 20000,
    });
    const text = await this.page.evaluate(() => {
      const match = document.body.innerText.match(/(\d+)\s*total/i);
      return match ? match[1] : null;
    });
    if (!text) {
      throw new Error('Could not find the "N total" count text on the page');
    }
    return Number(text);
  }

  async assertTotalCountLessThan(max: number) {
    // getTotalCount() itself waits up to 20000ms for the first row to render, so the
    // poll's own budget must exceed that or a single slow attempt could exhaust it
    // before the matcher ever runs.
    await expect
      .poll(() => this.getTotalCount(), { timeout: 30000, message: `Expected total < ${max}` })
      .toBeLessThan(max);
  }

  async assertTotalCountEquals(expected: number) {
    await expect
      .poll(() => this.getTotalCount(), {
        timeout: 30000,
        message: `Expected total to equal ${expected}`,
      })
      .toBe(expected);
  }

  async assertPreviousPageDisabled() {
    await expect(
      this.paginatorPreviousButton,
      'The paginator "previous page" button is not disabled'
    ).toBeDisabled({ timeout: 10000 });
  }

  async assertPreviousPageEnabled() {
    await expect(
      this.paginatorPreviousButton,
      'The paginator "previous page" button is not enabled'
    ).toBeEnabled({ timeout: 10000 });
  }

  async clickNextPage() {
    const beforeText = await this.paginatorInfoPage.innerText();
    await this.paginatorNextButton.click();
    await expect(
      this.paginatorInfoPage,
      'The paginator page info did not change after clicking next'
    ).not.toHaveText(beforeText, { timeout: 20000 });
  }

  async selectPageSize(size: 10 | 25 | 50 | 100) {
    await this.paginatorPageSizeSelect.selectOption(String(size));
  }

  async assertRowCountAtMost(max: number) {
    await expect
      .poll(() => this.rowCheckboxes.count(), {
        timeout: 20000,
        message: `Expected at most ${max} rows`,
      })
      .toBeLessThanOrEqual(max);
  }

  async assertRowCountAtLeast(min: number) {
    await expect
      .poll(() => this.rowCheckboxes.count(), {
        timeout: 20000,
        message: `Expected at least ${min} rows`,
      })
      .toBeGreaterThanOrEqual(min);
  }

  /** Asserts the row count exactly matches min(pageSize, total) — a precise check
   * that a page-size change actually took effect, rather than just an upper bound
   * that a no-op could also satisfy. Polls instead of reading once, so a brief
   * empty/loading flash while the table re-renders doesn't fail the assertion. */
  async assertRowCountMatchesPageSize(pageSize: number, total: number) {
    const expected = Math.min(pageSize, total);
    await expect
      .poll(() => this.rowCheckboxes.count(), {
        timeout: 20000,
        message: `Expected ${expected} rows for page size ${pageSize} (total ${total})`,
      })
      .toBe(expected);
  }

  async clickRefresh() {
    await this.refreshButton.click();
  }

  //#endregion

  //#region Filters and search

  async selectProcessorFilterByName(name: string) {
    const before = await this.getVisibleRowIdsSignature();
    await this.processorFilterTrigger.click();
    const option = this.processorFilterOptionByName(name);
    await expect(option, `The "${name}" processor filter option is not visible`).toBeVisible({
      timeout: 10000,
    });
    await option.click();
    await this.page.keyboard.press('Escape');
    // The total count text and the row list can settle at slightly different
    // times; wait for the rows themselves to change before returning, so callers
    // reading row content right after don't race a still-transitioning table.
    // Backend-bound (the filter triggers a re-fetch), so give it more room than a
    // purely local UI check.
    await expect.poll(() => this.getVisibleRowIdsSignature(), { timeout: 20000 }).not.toBe(before);
  }

  /**
   * Locates the "Mensaje de error" column by its header text (rather than a fixed
   * index) because the checkout-message column only exists for allowlisted
   * merchants, which shifts every column's position after it. Scans rows instead
   * of assuming the first one has a message: Stripe's default "expired_card" row
   * (always first) renders with an empty message cell, confirmed live. Also skips
   * messages containing a digit or "$" — some (e.g. invalid_amount's "Amount must
   * be at least $10.00 mxn") interpolate a client-formatted amount that isn't part
   * of the indexed/searchable text, confirmed live: searching the exact rendered
   * message for that row returns zero results even though shorter, non-interpolated
   * substrings from other rows match correctly.
   */
  async getFirstRowMessageSubstring(): Promise<string> {
    const headerTexts = await this.tableHeaderCells.allInnerTexts();
    const messageColumnIndex = headerTexts.findIndex((text) =>
      text.toLowerCase().includes('mensaje de error')
    );
    if (messageColumnIndex === -1) {
      throw new Error('Could not find the "Mensaje de error" column header');
    }
    const rowCount = await this.tableBodyRows.count();
    for (let i = 0; i < rowCount; i++) {
      const text = (await this.tableBodyCellAt(i, messageColumnIndex).innerText()).trim();
      if (text && !/[\d$]/.test(text)) {
        return text.slice(0, Math.min(15, text.length));
      }
    }
    throw new Error('No visible row has a searchable (non-empty, non-interpolated) message cell');
  }

  async searchByText(term: string) {
    const before = await this.getVisibleRowIdsSignature();
    await this.searchInput.fill(term);
    // Backend-bound (search triggers a re-fetch), so give it more room than a
    // purely local UI check.
    await expect.poll(() => this.getVisibleRowIdsSignature(), { timeout: 20000 }).not.toBe(before);
  }

  async clearSearch() {
    const before = await this.getVisibleRowIdsSignature();
    await this.searchInput.fill('');
    await expect.poll(() => this.getVisibleRowIdsSignature(), { timeout: 20000 }).not.toBe(before);
  }

  async selectActionableFilter(value: 'all' | ErrorAction) {
    await this.actionableFilterTrigger.click();
    const option = this.actionableFilterOptionFor(value);
    await expect(option, `The actionable filter option "${value}" is not visible`).toBeVisible({
      timeout: 10000,
    });
    await option.click();
  }

  async assertAllVisibleRowsHaveAction(action: ErrorAction) {
    const dropdowns = await this.actionableDropdowns.all();
    for (const dropdown of dropdowns) {
      await expect(
        dropdown,
        `A visible row does not show the expected action "${action}"`
      ).toHaveText(ACTION_LABEL[action]);
    }
  }

  //#endregion

  //#region Checkout message (individual)

  async assertCheckoutMessageColumnVisible() {
    await expect(
      this.checkoutMessageEditButtons.first(),
      'The checkout-message column / edit button is not visible'
    ).toBeVisible({ timeout: 20000 });
  }

  async pickFirstCheckoutMessageRow(): Promise<string> {
    const firstButton = this.checkoutMessageEditButtons.first();
    await expect(firstButton, 'No checkout-message edit button is visible').toBeVisible({
      timeout: 20000,
    });
    const testId = await firstButton.getAttribute('data-testid');
    if (!testId) {
      throw new Error('The first checkout-message edit button has no data-testid');
    }
    return testId.replace('error-management-table-checkout-message-edit-button-', '');
  }

  async clickEditCheckoutMessage(rowId: string) {
    const button = this.checkoutMessageEditButtonFor(rowId);
    await expect(button, `Row ${rowId}'s checkout-message edit button is not visible`).toBeVisible({
      timeout: 10000,
    });
    await button.click();
  }

  async selectCheckoutMessageLanguageTab(code: CheckoutMessageLanguage) {
    const tab = this.checkoutMessageLanguageTabFor(code);
    await expect(tab, `The "${code}" language tab is not visible`).toBeVisible({ timeout: 10000 });
    await tab.click();
  }

  async assertCheckoutMessageResetDisabled(code: CheckoutMessageLanguage) {
    await expect(
      this.checkoutMessageResetButtonFor(code),
      `The "${code}" reset button is unexpectedly enabled`
    ).toBeDisabled({ timeout: 10000 });
  }

  async assertCheckoutMessageResetEnabled(code: CheckoutMessageLanguage) {
    await expect(
      this.checkoutMessageResetButtonFor(code),
      `The "${code}" reset button is unexpectedly disabled`
    ).toBeEnabled({ timeout: 10000 });
  }

  async typeCheckoutMessage(code: CheckoutMessageLanguage, text: string) {
    await this.checkoutMessageTextareaFor(code).fill(text);
  }

  async assertCheckoutMessageSaveEnabled() {
    await expect(
      this.checkoutMessageModalSaveButton,
      'The checkout-message Save button is unexpectedly disabled'
    ).toBeEnabled({ timeout: 10000 });
  }

  async saveCheckoutMessage() {
    await expect(
      this.checkoutMessageModalSaveButton,
      'The checkout-message Save button is not visible'
    ).toBeVisible({ timeout: 10000 });
    await this.checkoutMessageModalSaveButton.click();
    // The modal closes only after the save API call resolves — backend-bound.
    await expect(this.checkoutMessageModal, 'The checkout-message modal did not close').toBeHidden({
      timeout: 20000,
    });
  }

  async assertCheckoutMessageTextareaValue(code: CheckoutMessageLanguage, expected: string) {
    await expect(
      this.checkoutMessageTextareaFor(code),
      `The "${code}" textarea does not show the expected value`
    ).toHaveValue(expected);
  }

  async cancelCheckoutMessage() {
    await expect(
      this.checkoutMessageModalCancelButton,
      'The checkout-message Cancel button is not visible'
    ).toBeVisible({ timeout: 10000 });
    await this.checkoutMessageModalCancelButton.click();
    await expect(this.checkoutMessageModal, 'The checkout-message modal did not close').toBeHidden({
      timeout: 10000,
    });
  }

  async clickResetCheckoutMessage(code: CheckoutMessageLanguage) {
    const resetButton = this.checkoutMessageResetButtonFor(code);
    await expect(resetButton, `The "${code}" reset button is not visible`).toBeVisible({
      timeout: 10000,
    });
    await resetButton.click();
  }

  async assertCheckoutMessageTextareaEmpty(code: CheckoutMessageLanguage) {
    await expect(
      this.checkoutMessageTextareaFor(code),
      `The "${code}" textarea is unexpectedly non-empty`
    ).toHaveValue('');
  }

  //#endregion

  //#region Checkout message (bulk)

  async clickBulkEditMessage() {
    await expect(
      this.actionHeaderEditMessageButton,
      'The ActionHeader "edit message" button is not visible'
    ).toBeVisible({ timeout: 10000 });
    await this.actionHeaderEditMessageButton.click();
    await expect(
      this.bulkCheckoutMessageModal,
      'The bulk checkout-message modal did not open'
    ).toBeVisible({ timeout: 10000 });
  }

  async selectBulkCheckoutMessageLanguageTab(code: CheckoutMessageLanguage) {
    const tab = this.bulkCheckoutMessageLanguageTabFor(code);
    await expect(tab, `The bulk modal's "${code}" language tab is not visible`).toBeVisible({
      timeout: 10000,
    });
    await tab.click();
  }

  async typeBulkCheckoutMessage(code: CheckoutMessageLanguage, text: string) {
    await this.bulkCheckoutMessageTextareaFor(code).fill(text);
  }

  async applyBulkCheckoutMessage() {
    await expect(
      this.bulkCheckoutMessageApplyButton,
      'The bulk checkout-message Apply button is unexpectedly disabled'
    ).toBeEnabled({ timeout: 10000 });
    await this.bulkCheckoutMessageApplyButton.click();
    // The modal closes only after the bulk-save API call resolves — backend-bound.
    await expect(
      this.bulkCheckoutMessageModal,
      'The bulk checkout-message modal did not close'
    ).toBeHidden({ timeout: 20000 });
  }

  //#endregion

  /** A cheap snapshot of which rows are currently rendered, used to wait for the
   * table to actually re-render after an action (search, filter, page size) instead
   * of a fixed timeout. */
  private async getVisibleRowIdsSignature(): Promise<string> {
    return this.rowCheckboxes.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('data-testid')).join(',')
    );
  }
}
