import { Context, FrameworkPlugin } from '../interface';
import {
  AdminPspErrorsPage,
  type CheckoutMessageLanguage,
  type ErrorAction,
} from '@pages/admin/adminPspErrorsPage';

export class PluginAdminErrorManagement extends FrameworkPlugin {
  pluginBaseName = 'admin.errorManagement';

  pspErrorsPage!: AdminPspErrorsPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pspErrorsPage = new AdminPspErrorsPage(context.page);
  }

  /** @description Selects N PSP error rows by their checkboxes, starting at an optional offset, and returns their row ids. */
  async $tf_selectFirstRows({
    count,
    offset,
  }: {
    count: number;
    offset?: number;
  }): Promise<string[]> {
    return this.pspErrorsPage.selectFirstRows(count, offset);
  }

  /** @description Asserts the ActionHeader (bulk action select + apply button) is visible and shows the given selected-row count. */
  async $tf_assertActionHeaderVisibleWithCount({ count }: { count: number }) {
    await this.pspErrorsPage.assertActionHeaderVisibleWithCount(count);
  }

  /** @description Opens the ActionHeader's action select and chooses "retry" or "decline". */
  async $tf_chooseBulkAction({ action }: { action: ErrorAction }) {
    await this.pspErrorsPage.chooseBulkAction(action);
  }

  /** @description Clicks the ActionHeader's Apply button, opening the bulk-apply confirmation modal. */
  async $tf_clickApplyBulkAction() {
    await this.pspErrorsPage.clickApplyBulkAction();
  }

  /** @description Confirms the bulk-apply modal and waits for it to close. */
  async $tf_confirmBulkApply() {
    await this.pspErrorsPage.confirmBulkApply();
  }

  /** @description Asserts each of the given rows' individual action dropdown shows the given action. */
  async $tf_assertRowsShowAction({ rowIds, action }: { rowIds: string[]; action: ErrorAction }) {
    await this.pspErrorsPage.assertRowsShowAction(rowIds, action);
  }

  /** @description Asserts the ActionHeader disappears (no rows selected). */
  async $tf_assertActionHeaderHidden() {
    await this.pspErrorsPage.assertActionHeaderHidden();
  }

  /** @description Asserts the given rows' checkboxes are unchecked. */
  async $tf_assertRowCheckboxesUnchecked({ rowIds }: { rowIds: string[] }) {
    await this.pspErrorsPage.assertRowCheckboxesUnchecked(rowIds);
  }

  /** @description Finds and returns the id of the first PSP error row with no existing merchant override. */
  async $tf_pickRowWithoutOverride(): Promise<string> {
    return this.pspErrorsPage.pickRowWithoutOverride();
  }

  /** @description Asserts the given row shows no reset button or default-override controls. */
  async $tf_assertRowHasNoOverrideControls({ rowId }: { rowId: string }) {
    await this.pspErrorsPage.assertRowHasNoOverrideControls(rowId);
  }

  /** @description Returns the row's current action ("retry" or "decline") as shown by its dropdown. */
  async $tf_getRowAction({ rowId }: { rowId: string }): Promise<ErrorAction> {
    return this.pspErrorsPage.getRowAction(rowId);
  }

  /** @description Opens the row's action dropdown and selects the option opposite to its current value; returns the newly chosen action. */
  async $tf_changeRowActionToOpposite({ rowId }: { rowId: string }): Promise<ErrorAction> {
    return this.pspErrorsPage.changeRowActionToOpposite(rowId);
  }

  /** @description Asserts the non-destructive change-confirmation dialog (role="dialog") is visible. */
  async $tf_assertChangeConfirmDialogVisible() {
    await this.pspErrorsPage.assertChangeConfirmDialogVisible();
  }

  /** @description Asserts the destructive reset-confirmation dialog (role="alertdialog") is visible. */
  async $tf_assertResetConfirmDialogVisible() {
    await this.pspErrorsPage.assertResetConfirmDialogVisible();
  }

  /** @description Confirms the currently open single-row action modal (change or reset) and waits for it to close. */
  async $tf_confirmActionModal() {
    await this.pspErrorsPage.confirmActionModal();
  }

  /** @description Asserts the given row's action dropdown shows the given action. */
  async $tf_assertRowShowsAction({ rowId, action }: { rowId: string; action: ErrorAction }) {
    await this.pspErrorsPage.assertRowShowsAction(rowId, action);
  }

  /** @description Clicks the reset-to-default button on the given row. */
  async $tf_resetRowToDefault({ rowId }: { rowId: string }) {
    await this.pspErrorsPage.resetRowToDefault(rowId);
  }

  /** @description Asserts the given row's reset button and override controls are hidden. */
  async $tf_assertRowResetControlsHidden({ rowId }: { rowId: string }) {
    await this.pspErrorsPage.assertRowResetControlsHidden(rowId);
  }

  /** @description Asserts a success toast is visible. */
  async $tf_assertSuccessToastVisible() {
    await this.pspErrorsPage.assertSuccessToastVisible();
  }

  /** @description Reads the current "N total" error count from the page. */
  async $tf_getTotalCount(): Promise<number> {
    return this.pspErrorsPage.getTotalCount();
  }

  /** @description Asserts the current "N total" error count equals the given value. */
  async $tf_assertTotalCountEquals({ expected }: { expected: number }) {
    await this.pspErrorsPage.assertTotalCountEquals(expected);
  }

  /** @description Asserts the current "N total" error count is less than the given value. */
  async $tf_assertTotalCountLessThan({ max }: { max: number }) {
    await this.pspErrorsPage.assertTotalCountLessThan(max);
  }

  /** @description Asserts the paginator's "previous page" button is disabled. */
  async $tf_assertPreviousPageDisabled() {
    await this.pspErrorsPage.assertPreviousPageDisabled();
  }

  /** @description Asserts the paginator's "previous page" button is enabled. */
  async $tf_assertPreviousPageEnabled() {
    await this.pspErrorsPage.assertPreviousPageEnabled();
  }

  /** @description Clicks the paginator's "next page" button and waits for the page info to change. */
  async $tf_clickNextPage() {
    await this.pspErrorsPage.clickNextPage();
  }

  /** @description Selects a page size (10, 25, 50 or 100) from the paginator. */
  async $tf_selectPageSize({ size }: { size: 10 | 25 | 50 | 100 }) {
    await this.pspErrorsPage.selectPageSize(size);
  }

  /** @description Asserts the visible row count is at most the given number. */
  async $tf_assertRowCountAtMost({ max }: { max: number }) {
    await this.pspErrorsPage.assertRowCountAtMost(max);
  }

  /** @description Asserts the visible row count is at least the given number. */
  async $tf_assertRowCountAtLeast({ min }: { min: number }) {
    await this.pspErrorsPage.assertRowCountAtLeast(min);
  }

  /** @description Asserts the row count exactly equals min(pageSize, total), proving a page-size change actually took effect. */
  async $tf_assertRowCountMatchesPageSize({
    pageSize,
    total,
  }: {
    pageSize: number;
    total: number;
  }) {
    await this.pspErrorsPage.assertRowCountMatchesPageSize(pageSize, total);
  }

  /** @description Clicks the table's refresh button. */
  async $tf_clickRefresh() {
    await this.pspErrorsPage.clickRefresh();
  }

  /** @description Opens the processor filter and selects the option matching the given processor name. */
  async $tf_selectProcessorFilterByName({ name }: { name: string }) {
    await this.pspErrorsPage.selectProcessorFilterByName(name);
  }

  /** @description Reads a short substring from the first visible row's processor error message, for use as a live search term. */
  async $tf_getFirstRowMessageSubstring(): Promise<string> {
    return this.pspErrorsPage.getFirstRowMessageSubstring();
  }

  /** @description Types the given term into the search input and waits for the debounce. */
  async $tf_searchByText({ term }: { term: string }) {
    await this.pspErrorsPage.searchByText(term);
  }

  /** @description Clears the search input. */
  async $tf_clearSearch() {
    await this.pspErrorsPage.clearSearch();
  }

  /** @description Opens the actionable filter and selects "all", "retry" or "decline". */
  async $tf_selectActionableFilter({ value }: { value: 'all' | ErrorAction }) {
    await this.pspErrorsPage.selectActionableFilter(value);
  }

  /** @description Asserts every currently visible row's action dropdown shows the given action. */
  async $tf_assertAllVisibleRowsHaveAction({ action }: { action: ErrorAction }) {
    await this.pspErrorsPage.assertAllVisibleRowsHaveAction(action);
  }

  /** @description Asserts the "Mensaje de Checkout" column and its edit buttons are visible (requires the merchant to be allowlisted for CHECKOUT_MESSAGE_VISIBILITY_MERCHANTS). */
  async $tf_assertCheckoutMessageColumnVisible() {
    await this.pspErrorsPage.assertCheckoutMessageColumnVisible();
  }

  /** @description Returns the row id of the first row that has a checkout-message edit button (requires the allowlisted merchant). */
  async $tf_pickFirstCheckoutMessageRow(): Promise<string> {
    return this.pspErrorsPage.pickFirstCheckoutMessageRow();
  }

  /** @description Clicks the checkout-message edit button for the given row. */
  async $tf_clickEditCheckoutMessage({ rowId }: { rowId: string }) {
    await this.pspErrorsPage.clickEditCheckoutMessage(rowId);
  }

  /** @description Selects a language tab (es/en/pt) in the individual checkout-message modal. */
  async $tf_selectCheckoutMessageLanguageTab({ code }: { code: CheckoutMessageLanguage }) {
    await this.pspErrorsPage.selectCheckoutMessageLanguageTab(code);
  }

  /** @description Asserts the reset-to-default button for the given language is disabled. */
  async $tf_assertCheckoutMessageResetDisabled({ code }: { code: CheckoutMessageLanguage }) {
    await this.pspErrorsPage.assertCheckoutMessageResetDisabled(code);
  }

  /** @description Asserts the reset-to-default button for the given language is enabled. */
  async $tf_assertCheckoutMessageResetEnabled({ code }: { code: CheckoutMessageLanguage }) {
    await this.pspErrorsPage.assertCheckoutMessageResetEnabled(code);
  }

  /** @description Types a checkout message into the given language's textarea. */
  async $tf_typeCheckoutMessage({ code, text }: { code: CheckoutMessageLanguage; text: string }) {
    await this.pspErrorsPage.typeCheckoutMessage(code, text);
  }

  /** @description Asserts the checkout-message modal's Save button is enabled. */
  async $tf_assertCheckoutMessageSaveEnabled() {
    await this.pspErrorsPage.assertCheckoutMessageSaveEnabled();
  }

  /** @description Saves the checkout-message modal and waits for it to close. */
  async $tf_saveCheckoutMessage() {
    await this.pspErrorsPage.saveCheckoutMessage();
  }

  /** @description Asserts the given language's textarea shows the expected value. */
  async $tf_assertCheckoutMessageTextareaValue({
    code,
    expected,
  }: {
    code: CheckoutMessageLanguage;
    expected: string;
  }) {
    await this.pspErrorsPage.assertCheckoutMessageTextareaValue(code, expected);
  }

  /** @description Cancels the individual checkout-message modal without saving. */
  async $tf_cancelCheckoutMessage() {
    await this.pspErrorsPage.cancelCheckoutMessage();
  }

  /** @description Clicks the reset-to-default button for the given language. */
  async $tf_clickResetCheckoutMessage({ code }: { code: CheckoutMessageLanguage }) {
    await this.pspErrorsPage.clickResetCheckoutMessage(code);
  }

  /** @description Asserts the given language's textarea is empty. */
  async $tf_assertCheckoutMessageTextareaEmpty({ code }: { code: CheckoutMessageLanguage }) {
    await this.pspErrorsPage.assertCheckoutMessageTextareaEmpty(code);
  }

  /** @description Clicks the ActionHeader's "edit message" button, opening the bulk checkout-message modal. */
  async $tf_clickBulkEditMessage() {
    await this.pspErrorsPage.clickBulkEditMessage();
  }

  /** @description Selects a language tab (es/en/pt) in the bulk checkout-message modal. */
  async $tf_selectBulkCheckoutMessageLanguageTab({ code }: { code: CheckoutMessageLanguage }) {
    await this.pspErrorsPage.selectBulkCheckoutMessageLanguageTab(code);
  }

  /** @description Types a checkout message into the bulk modal's given language textarea. */
  async $tf_typeBulkCheckoutMessage({
    code,
    text,
  }: {
    code: CheckoutMessageLanguage;
    text: string;
  }) {
    await this.pspErrorsPage.typeBulkCheckoutMessage(code, text);
  }

  /** @description Applies the bulk checkout-message modal and waits for it to close. */
  async $tf_applyBulkCheckoutMessage() {
    await this.pspErrorsPage.applyBulkCheckoutMessage();
  }
}
