import { CommonsActions } from '@pages/commonActions';
import { AdminDatePicker } from '@pages/admin/components/atoms/adminDatePicker';
import { AdminPaginator } from '@pages/admin/components/atoms/adminPaginator';
import { expect, type Locator, type Page } from '@playwright/test';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import type { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { retryOperation, retryOperationWithAction } from '@support/utils/retries';
import { ORDER_DETAILS_DATA_TEST_IDS, ORDERS_DATA_TEST_IDS } from './constants';

const urlOrders = `${envConfig.ADMIN_URL}/orders`;

// NOTE: Currently the counts are based on the environment
//       This is a temporary solution until the counts are fixed in both environments.
const FILTER_COUNTS_BY_ENV = {
  [allowedEnvironments.DEVELOPMENT]: {
    paymentStatus: 19,
    paymentMethod: 1,
    fraudStatus: 8,
  },
  [allowedEnvironments.PRE_PRODUCTION]: {
    paymentStatus: 19,
    paymentMethod: 1,
    fraudStatus: 8,
  },
  [allowedEnvironments.STAGING]: {
    paymentStatus: 20,
    paymentMethod: 1,
    fraudStatus: 8,
  },
};

FILTER_COUNTS_BY_ENV[allowedEnvironments.PRE_PRODUCTION] =
  FILTER_COUNTS_BY_ENV[allowedEnvironments.STAGING];
FILTER_COUNTS_BY_ENV[allowedEnvironments.PRODUCTION] =
  FILTER_COUNTS_BY_ENV[allowedEnvironments.STAGING];

export class AdminOrdersPage extends CommonsActions {
  private readonly paginatorRangeRegex = /(\d+)\s*[–-]\s*(\d+)\s+\S+\s+([\d.,]+)/;

  readonly page: Page;

  readonly labelOrdersPageTitle: Locator;

  // order exports
  readonly labelExportDrawerTitle: Locator;
  readonly buttonExport: Locator;
  readonly buttonExportDrawer: Locator;
  readonly buttonDatePickerPrevMonth: Locator;
  readonly buttonApplyDateRange: Locator;
  readonly buttonOrdersColumn: Locator;
  readonly checkboxOrderCreation: Locator;
  readonly inputFileName: Locator;
  readonly inputDatePicker: Locator;
  readonly inputDatePickerContainerFloatingContent: Locator;
  readonly checkboxSelectAllColumns: Locator;
  readonly columnsErrorState: Locator;
  readonly checkboxIncludeAbandonedCartOrders: Locator;
  readonly exportFiltersAccordion: Locator;
  readonly advancedExportFilters: Locator;
  readonly advancedExportFilterAddTrigger: Locator;
  readonly selectTypeReport: Locator;
  readonly selectOrderTypeReport: Locator;
  readonly selectAuthVsCatchTypeReport: Locator;
  readonly selectExportMerchant: Locator;
  readonly optionsExportMerchant: Locator;

  // orders table
  readonly labelAllOrdersIds: Locator;
  readonly labelAllOrdersEmail: Locator;
  readonly rowAllOrders: Locator;
  readonly labelNotAvailableInfo: Locator;
  readonly buttonViewOrderDetails: Locator;

  // orders filters
  readonly inputSearchByOrderId: Locator;
  readonly inputSearchByEmail: Locator;
  readonly filterPaymentStatus: Locator;
  readonly optionAdvancedFiltersPaymentStatus: Locator;
  readonly optionAdvancedFiltersPaymentMethod: Locator;
  readonly optionAdvancedFiltersFraudStatus: Locator;
  readonly optionAdvancedFiltersStoreId: Locator;
  readonly filterFraudStatus: Locator;
  readonly filterPaymentMethod: Locator;
  readonly filterStoreId: Locator;
  readonly filterPaymentMethodTrigger: Locator;
  readonly filterPaymentStatusTrigger: Locator;
  readonly filterFraudStatusTrigger: Locator;
  readonly filterStoreIdTrigger: Locator;
  readonly buttonClearFilters: Locator;
  readonly buttonMoreFilters: Locator;
  readonly selectDatePicker: Locator;
  readonly optionsStoreCode: Locator;
  readonly optionsPaymentStatus: Locator;
  readonly optionsPaymentMethod: Locator;
  readonly optionsFraudStatus: Locator;

  // paginator
  readonly labelDisplayedRows: Locator;
  readonly adminOrderPaginator: AdminPaginator;
  private readonly adminDatePicker: AdminDatePicker;
  readonly advancedExportFilterOptionStoreCode: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.adminDatePicker = new AdminDatePicker(page);

    this.labelOrdersPageTitle = page.getByTestId(ORDERS_DATA_TEST_IDS.pageTitle);

    // order exports
    this.buttonExport = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersDrawerButtonExport);
    this.buttonExportDrawer = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDrawerButtonExportFile
    );
    this.labelExportDrawerTitle = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersDrawerTitle);
    this.inputFileName = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersDrawerInputName);
    this.inputDatePicker = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDatePickerInputDateRange
    );
    this.buttonDatePickerPrevMonth = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDatePickerButtonPrevMonth
    );
    this.inputDatePickerContainerFloatingContent = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDatePickerContainerFloatingContent
    );
    this.buttonViewOrderDetails = page
      .locator(`tr[data-testid^="${ORDERS_DATA_TEST_IDS.ordersTableRowPrefix}"]`)
      .first();
    this.buttonOrdersColumn = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDrawerAccordionOrden
    );
    this.checkboxOrderCreation = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDrawerCheckboxOrderCreatedDate
    );
    this.buttonApplyDateRange = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDatePickerButtonApply
    );
    this.checkboxSelectAllColumns = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersSelectAll);
    this.columnsErrorState = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersColumnsErrorState);
    this.checkboxIncludeAbandonedCartOrders = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersIncludeAbandonedCartOrders
    );
    this.exportFiltersAccordion = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersFilterAccordion
    );
    this.advancedExportFilters = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersAdvancedFilters);
    this.advancedExportFilterAddTrigger = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersAdvancedFilterAddTrigger
    );
    this.selectTypeReport = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersDrawerReportType);
    this.advancedExportFilterOptionStoreCode = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersAdvancedFilterOption('store_code')
    );

    // orders filters
    this.inputSearchByOrderId = page.getByTestId(ORDERS_DATA_TEST_IDS.inputSearchByOrderId);
    this.inputSearchByEmail = page.getByTestId(ORDERS_DATA_TEST_IDS.inputSearchByEmail);
    this.filterPaymentMethod = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterPaymentMethodInputSearch
    );
    this.filterPaymentStatus = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterPaymentStatusInputSearch
    );
    this.filterPaymentMethodTrigger = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterPaymentMethodTrigger
    );
    this.filterPaymentStatusTrigger = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterPaymentStatusTrigger
    );
    this.filterFraudStatusTrigger = page.getByTestId(ORDERS_DATA_TEST_IDS.filterFraudStatusTrigger);
    this.filterStoreIdTrigger = page.getByTestId(ORDERS_DATA_TEST_IDS.filterStoreIdTrigger);
    this.optionAdvancedFiltersPaymentMethod = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterBarChooserOption('payment_method')
    );
    this.optionAdvancedFiltersPaymentStatus = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterBarChooserOption('payment_status')
    );
    this.optionAdvancedFiltersFraudStatus = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterBarChooserOption('fraud_decision')
    );
    this.optionAdvancedFiltersStoreId = page.getByTestId(
      ORDERS_DATA_TEST_IDS.filterBarChooserOption('store_code')
    );
    this.filterFraudStatus = page.getByTestId(ORDERS_DATA_TEST_IDS.filterFraudStatusInputSearch);
    this.filterStoreId = page.getByTestId(ORDERS_DATA_TEST_IDS.filterStoreIdInputSearch);
    this.selectDatePicker = page.getByTestId(ORDERS_DATA_TEST_IDS.ordersTableInputDateRange);
    this.buttonClearFilters = page.getByTestId(ORDERS_DATA_TEST_IDS.clearFiltersButton);
    this.buttonMoreFilters = page.getByTestId(ORDERS_DATA_TEST_IDS.toggleFiltersButton);
    this.selectOrderTypeReport = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDrawerReportTypeOrders
    );
    this.selectAuthVsCatchTypeReport = page.getByTestId(
      ORDERS_DATA_TEST_IDS.exportOrdersDrawerReportTypeAuthVsCaptures
    );

    this.selectExportMerchant = page.getByTestId(ORDERS_DATA_TEST_IDS.exportOrdersMerchantTrigger);
    this.optionsExportMerchant = page.locator('[data-testid^="export-orders-merchant-option-"]');
    this.optionsStoreCode = page.locator('[data-testid^="store_code-option-"]');
    this.optionsPaymentStatus = page.locator('[data-testid^="payment_status-option-"]');
    this.optionsPaymentMethod = page.locator('[data-testid^="payment_method-option-"]');
    this.optionsFraudStatus = page.locator('[data-testid^="fraud_decision-option-"]');

    // orders table
    this.rowAllOrders = this.page.locator(
      `tr[data-testid^="${ORDERS_DATA_TEST_IDS.ordersTableRowPrefix}"]`
    );
    this.labelAllOrdersIds = this.page.locator(
      `[data-testid^="${ORDERS_DATA_TEST_IDS.ordersTableCellOrderIdPrefix}"]`
    );
    this.labelAllOrdersEmail = this.page.locator(
      `[data-testid^="${ORDERS_DATA_TEST_IDS.ordersTableCellEmailPrefix}"]`
    );
    this.labelNotAvailableInfo = page.getByTestId(ORDERS_DATA_TEST_IDS.labelNotAvailableInfo);

    // paginator
    this.labelDisplayedRows = page.getByTestId(ORDERS_DATA_TEST_IDS.ordersTablePaginatorInfoPage);
    this.adminOrderPaginator = new AdminPaginator(page, {
      buttonPrevious: ORDERS_DATA_TEST_IDS.ordersTablePaginatorButtonPrevious,
      buttonNext: ORDERS_DATA_TEST_IDS.ordersTablePaginatorButtonNext,
      infoPage: ORDERS_DATA_TEST_IDS.ordersTablePaginatorInfoPage,
      selectPageSize: ORDERS_DATA_TEST_IDS.ordersTablePaginatorSelectPageSize,
    });
  }

  //Actions
  // Export orders
  async clickExportButton(): Promise<void> {
    await expect(this.buttonExport, 'The export button is not visible')
      .toBeVisible()
      .then(() => this.buttonExport.click());
    await this.assertExportOrdersDrawer();
  }

  async clickInOrdersColumn(): Promise<void> {
    await this.buttonOrdersColumn.click();
  }
  async assertCreationDateIsSelected(): Promise<void> {
    const ariaChecked = await this.checkboxOrderCreation.getAttribute('aria-checked');
    const dataState = await this.checkboxOrderCreation.getAttribute('data-state');
    expect(ariaChecked).toBe('true');
    expect(dataState).toBe('checked');
  }

  async setFileName(fileName: string): Promise<void> {
    await expect(this.inputFileName, 'The file name input is not visible').toBeVisible();
    await this.inputFileName.fill(fileName);
  }

  async setRangeDatesLast15Days(): Promise<void> {
    // Calculate dates for last 15 days range
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 14); // 15 days ago (including today)

    await this.setRangeDates(startDate, today);
  }

  async setRangeDates(startDate: Date, endDate: Date): Promise<void> {
    await expect(this.inputDatePicker).toBeVisible();
    await this.click(this.inputDatePicker, { force: true });

    // Retry click if calendar doesn't open (handles race conditions in parallel execution)
    await retryOperationWithAction(
      this.page,
      this.inputDatePickerContainerFloatingContent,
      3,
      500,
      async () => await this.click(this.inputDatePicker, { force: true })
    );

    await this.selectCalendarDay(endDate);
    await this.selectCalendarDay(startDate);

    await this.click(this.buttonApplyDateRange, { dispatchEvent: true });
    await expect(this.buttonApplyDateRange).not.toBeVisible();
  }

  private async selectCalendarDay(date: Date): Promise<void> {
    const dayButton = this.adminDatePicker.getButtonByDate(
      date,
      this.inputDatePickerContainerFloatingContent
    );
    const maxMonthsBack = 24;

    for (let i = 0; i < maxMonthsBack; i++) {
      if (await dayButton.isVisible()) {
        await this.click(dayButton, { dispatchEvent: true });
        return;
      }
      await this.click(this.buttonDatePickerPrevMonth, { dispatchEvent: true });
    }

    await expect(
      dayButton,
      `Calendar day ${date.toISOString()} is not visible after navigating ${maxMonthsBack} months back`
    ).toBeVisible();
    await this.click(dayButton, { dispatchEvent: true });
  }

  /** Waits until the export columns stop loading: either the column list or its error state is shown. */
  async assertExportColumnsSettled(): Promise<void> {
    await expect(
      this.checkboxSelectAllColumns.or(this.columnsErrorState),
      'The export columns are still loading'
    ).toBeVisible({ timeout: 30000 });
  }

  async selectAllColumns(): Promise<void> {
    await expect(this.checkboxSelectAllColumns, 'The select all columns checkbox is not visible')
      .toBeVisible()
      .then(() => this.checkboxSelectAllColumns.click());
  }

  async includeAbandonedCartOrders(): Promise<void> {
    await expect(this.checkboxIncludeAbandonedCartOrders).toBeVisible();
    await this.checkboxIncludeAbandonedCartOrders.click();
    await expect(this.checkboxIncludeAbandonedCartOrders).toBeChecked();
  }

  async selectFirstStoreForExport(): Promise<void> {
    await this.exportFiltersAccordion.click();
    await this.advancedExportFilterAddTrigger.click();
    await this.advancedExportFilterOptionStoreCode.click();
    await this.filterStoreIdTrigger.click();
    await expect(this.optionsStoreCode.first()).toBeVisible();
    await this.optionsStoreCode.first().click();
  }

  async selectFirstRegistryAvailableFromTable(): Promise<void> {
    await expect(
      this.buttonViewOrderDetails,
      'The view registry icon is not visible'
    ).toBeVisible();
    await this.buttonViewOrderDetails.click();
    await this.page.waitForTimeout(2000);
  }

  async assertAllMerchantsSelectedForExport(expectedMerchants: number): Promise<void> {
    await expect(this.selectExportMerchant).toBeVisible();
    await this.selectExportMerchant.click();
    const count = await this.optionsExportMerchant.count();
    expect(count, `Expected ${expectedMerchants} merchants option in the export drawer`).toBe(
      expectedMerchants
    );
    for (let i = 0; i < count; i++) {
      const merchantOption = this.optionsExportMerchant.nth(i);
      await expect(merchantOption).toHaveAttribute('aria-selected', 'true');
    }
    await this.labelExportDrawerTitle.click();
    await this.selectExportMerchant.blur();
  }

  async clickExportFileButton(): Promise<void> {
    await expect(this.buttonExportDrawer, 'The export button is not in the DOM').toBeAttached();
    await this.buttonExportDrawer.click();
  }

  async selectOrderTypeReportToExport(): Promise<void> {
    console.log(`Selecting Order Type Report ...`);
    await expect(this.selectTypeReport, 'The type report filter is not visible').toBeVisible();
    await this.selectTypeReport.click();
    await expect(
      this.selectOrderTypeReport,
      'The order type report filter is not visible'
    ).toBeVisible();
    await this.selectOrderTypeReport.click();
  }

  async selectAuthVsCatchTypeReportToExport(): Promise<void> {
    console.log(`Selecting Auth & Capt Type Report ...`);
    await expect(this.selectTypeReport, 'The type report filter is not visible').toBeVisible();
    await this.selectTypeReport.click({ force: true });
    await expect(
      this.selectAuthVsCatchTypeReport,
      'The auth & capt type report filter is not visible'
    ).toBeVisible();
    await this.selectAuthVsCatchTypeReport.click({ force: true });
  }

  // Filters
  async clickMoreFilters(): Promise<void> {
    await expect(this.buttonMoreFilters, 'The add filter button is not visible')
      .toBeVisible()
      .then(() => this.buttonMoreFilters.click());
  }

  async applyAdvancedFilterChooser(): Promise<void> {
    const applyButton = this.page.getByTestId(ORDERS_DATA_TEST_IDS.filterBarChooserApply);
    await expect(applyButton, 'The filter chooser apply button is not visible').toBeVisible({
      timeout: 40000,
    });
    await applyButton.click();
  }

  // Row click may open details in a new tab (window.open) or in the same tab
  // (row-actions "view detail" / client-side navigate). Listen for both before
  // the click and return whichever page actually lands on /orders/{id}.
  async clickOnFirstOrder(): Promise<Page> {
    await expect(
      this.buttonViewOrderDetails,
      'View registry icon for the first order is not visible'
    ).toBeVisible({ timeout: 40000 });

    // The orders list itself can live at `/orders/` (trailing slash), so a bare prefix
    // check would resolve the same-tab branch before the details tab even opens.
    const isOrderDetailsUrl = (url: URL) =>
      url.href.startsWith(`${urlOrders}/`) && /^\/orders\/[^/]+/.test(url.pathname);
    const newTabPromise = this.page.context().waitForEvent('page', { timeout: 40000 });
    const sameTabPromise = this.page.waitForURL(isOrderDetailsUrl, { timeout: 40000 });

    newTabPromise.catch(() => undefined);
    sameTabPromise.catch(() => undefined);

    await this.buttonViewOrderDetails.click();

    try {
      const orderDetailsPage = await Promise.race([
        newTabPromise,
        sameTabPromise.then(() => this.page),
      ]);
      await orderDetailsPage.waitForURL(isOrderDetailsUrl, { timeout: 40000 });
      return orderDetailsPage;
    } catch (error) {
      throw new Error(
        `Order details did not open in the current tab or a new tab (expected URL ${urlOrders}/<orderToken>). ${error}`
      );
    }
  }

  async searchARandomOrder(): Promise<string> {
    await expect(this.inputSearchByOrderId, 'The search input is not visible').toBeVisible();
    await expect(this.rowAllOrders.first()).toBeVisible();
    const orderIds = await this.labelAllOrdersIds.allTextContents();
    console.log('order ids:', orderIds);
    expect(
      orderIds.length,
      `Expected at least one order id in the table, got: ${JSON.stringify(orderIds)}`
    ).toBeGreaterThan(0);
    const randomOrderId = orderIds[Math.floor(Math.random() * orderIds.length)];

    console.log('Order to be found:', randomOrderId);
    await this.inputSearchByOrderId.fill(randomOrderId);
    await expect(this.inputSearchByOrderId).toHaveValue(randomOrderId);

    return randomOrderId;
  }

  async searchOrderById(orderId: string): Promise<void> {
    await this.page.reload();
    await expect(
      this.inputSearchByOrderId,
      'The search order id input is not visible'
    ).toBeVisible();
    await this.inputSearchByOrderId.fill(orderId);

    await expect(this.inputSearchByOrderId).toHaveValue(orderId);
    await this.page.waitForTimeout(2000);
    const foundOrderId = await this.labelAllOrdersIds.first().textContent();
    expect(foundOrderId).toBe(orderId.toLowerCase());
  }

  async searchOrderByIdCaseSensitive(orderId: string) {
    await this.page.reload();
    await expect(
      this.inputSearchByOrderId,
      'The search order id input is not visible'
    ).toBeVisible();
    await this.inputSearchByOrderId.fill(orderId);

    await expect(this.inputSearchByOrderId).toHaveValue(orderId);
    await this.page.waitForTimeout(2000);
    const foundOrderId = await this.labelAllOrdersIds.first().textContent();
    expect(foundOrderId).toBe(orderId);
  }

  async selectStoreId(store: string, totalStore: number): Promise<void> {
    await this.clickMoreFilters();
    await expect(this.optionAdvancedFiltersStoreId).toBeVisible();
    await this.optionAdvancedFiltersStoreId.click();
    await this.applyAdvancedFilterChooser();

    await expect(this.filterStoreIdTrigger, 'The store id filter is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.filterStoreIdTrigger.click();

    const storeOption = this.optionsStoreCode.filter({ hasText: store }).first();
    await expect(storeOption, 'The store id option is not visible').toBeVisible({
      timeout: 40000,
    });
    await storeOption.click();
  }

  async searchOrderByEmail(email: string): Promise<void> {
    await expect(this.inputSearchByEmail, 'The search email input is not visible').toBeVisible();
    await this.inputSearchByEmail.fill(email);

    await expect(this.inputSearchByEmail).toHaveValue(email);
    await this.page.waitForTimeout(2000);
    const elementEmail = await this.labelAllOrdersEmail.first();
    expect(elementEmail).toBeVisible({ timeout: 4000 });
    const foundEmail = await elementEmail.textContent();
    expect(foundEmail).toBe(email);
  }

  async searchOrderByEmailWithRandomCase(emailRandomCase: string, email: string) {
    await expect(this.inputSearchByEmail, 'The search email input is not visible').toBeVisible();
    await this.inputSearchByEmail.fill(emailRandomCase);
    await expect(this.inputSearchByEmail).toHaveValue(emailRandomCase);
    await this.page.waitForTimeout(2000);

    const elementEmail = await this.labelAllOrdersEmail.first();
    expect(elementEmail).toBeVisible({ timeout: 4000 });

    const foundEmail = await elementEmail.textContent();
    expect(foundEmail).toBe(email);
  }

  async selectPaymentStatus(status: string): Promise<void> {
    await this.clickMoreFilters();
    await expect(this.optionAdvancedFiltersPaymentStatus).toBeVisible();
    await this.optionAdvancedFiltersPaymentStatus.click();
    await this.applyAdvancedFilterChooser();
    await expect(
      this.filterPaymentStatusTrigger,
      'The payment status filter is not visible'
    ).toBeVisible({ timeout: 40000 });
    await this.filterPaymentStatusTrigger.click();

    const statusOption = this.optionsPaymentStatus.filter({ hasText: status }).first();
    await expect(statusOption, 'The payment status option is not visible').toBeVisible({
      timeout: 40000,
    });
    await statusOption.click();
    const popover = this.page.getByTestId('payment_status-content');
    await this.page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
  }

  async selectPaymentMethod(method: string): Promise<void> {
    await this.clickMoreFilters();
    await expect(this.optionAdvancedFiltersPaymentMethod).toBeVisible();
    await this.optionAdvancedFiltersPaymentMethod.click();
    await this.applyAdvancedFilterChooser();
    await expect(
      this.filterPaymentMethodTrigger,
      'The payment method filter is not visible'
    ).toBeVisible({ timeout: 40000 });
    await this.filterPaymentMethodTrigger.click();

    const methodOption = this.optionsPaymentMethod.filter({ hasText: method }).first();
    await expect(methodOption, 'The payment method option is not visible').toBeVisible({
      timeout: 40000,
    });
    await methodOption.click();
  }

  async selectFraudStatus(status: string): Promise<void> {
    await this.clickMoreFilters();
    await expect(this.optionAdvancedFiltersFraudStatus).toBeVisible();
    await this.optionAdvancedFiltersFraudStatus.click();
    await this.applyAdvancedFilterChooser();
    await expect(
      this.filterFraudStatusTrigger,
      'The fraud status filter is not visible'
    ).toBeVisible({ timeout: 40000 });
    await this.filterFraudStatusTrigger.click();

    const fraudStatusOption = this.page.getByTestId(
      status === 'Todos'
        ? ORDERS_DATA_TEST_IDS.filterFraudStatusSelectAll
        : ORDERS_DATA_TEST_IDS.fraudDecisionOption(status)
    );
    await expect(fraudStatusOption).toBeVisible();
    await fraudStatusOption.click();
  }

  async clickClearFilters(): Promise<void> {
    await expect(this.buttonClearFilters, 'The clear filters button is not visible').toBeVisible();
    await this.buttonClearFilters.click();
    await this.page.waitForTimeout(1000);
  }

  // Paginator
  async goToPaginatorNextPage(): Promise<void> {
    await this.adminOrderPaginator.goToNextPage();
  }

  async goToPaginatorPrevPage(): Promise<void> {
    await this.adminOrderPaginator.goToPrevPage();
  }

  async selectPaginationOption(option: string): Promise<void> {
    await this.adminOrderPaginator.selectPageSizeOption(option);
  }

  //Assertions:
  async assertPresenceInOrdersView() {
    console.log('Validating orders view');
    await this.page.waitForURL((url) => url.href.startsWith(urlOrders));
    expect(this.page.url()).toContain(`${urlOrders}`);
    expect(this.labelOrdersPageTitle).toBeVisible();
  }

  async assertExportOrdersDrawer(): Promise<void> {
    await expect(this.labelExportDrawerTitle, 'The export drawer is not visible').toBeVisible();
  }

  async assertOrderFound(orderId: string): Promise<void> {
    const orderFound = this.labelAllOrdersIds.filter({ hasText: orderId });
    await expect(orderFound).toBeVisible({ timeout: 4000 });
    await expect(this.rowAllOrders).toHaveCount(1);
    console.log('Order found:', orderId);
  }

  async getTokenFromOrderFound(orderId: string): Promise<string> {
    // Find the row containing the Order ID
    const orderRow = this.page.locator(
      `tr[data-testid^="${ORDERS_DATA_TEST_IDS.ordersTableRowPrefix}"]`,
      {
        hasText: orderId,
      }
    );

    // Extract token from the row data-testid: orders-table-row-{uuid}
    const dataTestId = await orderRow.getAttribute('data-testid');
    if (!dataTestId) throw new Error('Order row data-testid not found');

    // Extract UUID from data-testid
    const token = dataTestId.replace(ORDERS_DATA_TEST_IDS.ordersTableRowPrefix, '');
    return token;
  }

  async assertOrderFoundByEmail(userEmail: string): Promise<void> {
    const orderFoundByEmail = this.labelAllOrdersEmail.filter({ hasText: userEmail });
    await expect(orderFoundByEmail).toBeVisible({ timeout: 4000 });
    await expect(this.rowAllOrders).toHaveCount(1);
    console.log('Order found with email:', userEmail);
  }

  async assertOrdersLoaded(ordersQuantity: number): Promise<void> {
    await expect(this.rowAllOrders).toHaveCount(ordersQuantity);
  }

  async assertCurrentPage(expectedPage: number): Promise<void> {
    await this.adminOrderPaginator.assertCurrentPage(expectedPage);
  }

  async assertTotalPages(expectedPages: number): Promise<void> {
    await this.adminOrderPaginator.assertTotalPages(expectedPages);
  }

  async assertFiltersLoaded(): Promise<void> {
    await expect(this.inputSearchByOrderId).toBeVisible();
    await expect(this.selectDatePicker).toBeVisible();
  }

  async assertPageNavigationBasedOnOrdersPerPage(
    direction: 'next' | 'prev' = 'next'
  ): Promise<void> {
    await expect(this.labelDisplayedRows, 'The paginator page info is not visible').toBeVisible();

    const displayedRowsText = await this.labelDisplayedRows.textContent();
    const currentRange = this.parseOrdersPaginatorRange(displayedRowsText);
    const pageSize = currentRange.to - currentRange.from + 1;
    let expectedFrom: number;
    let expectedTo: number;

    if (direction === 'next') {
      expectedFrom = currentRange.from + pageSize;
      if (expectedFrom > currentRange.total) {
        throw new Error(
          `Cannot navigate to the next page. Already showing the last rows: "${displayedRowsText}"`
        );
      }
      expectedTo = Math.min(currentRange.to + pageSize, currentRange.total);
    } else if (direction === 'prev') {
      expectedFrom = currentRange.from - pageSize;
      expectedTo = currentRange.from - 1;
      if (expectedFrom < 1) {
        throw new Error(
          `Cannot navigate to the previous page. Already on the first page: "${displayedRowsText}"`
        );
      }
    } else {
      throw new Error(`Invalid direction: ${direction}. Use "next" or "prev".`);
    }

    await (direction === 'next' ? this.goToPaginatorNextPage() : this.goToPaginatorPrevPage());

    await expect(this.labelDisplayedRows).toHaveText(
      new RegExp(`${expectedFrom}[\\u2013\\-]${expectedTo}`)
    );
    console.log(
      `Navigated paginator from ${currentRange.from}-${currentRange.to} to ${expectedFrom}-${expectedTo}`
    );
  }

  private parseOrdersPaginatorRange(text: string | null): {
    from: number;
    to: number;
    total: number;
  } {
    const match = text?.match(this.paginatorRangeRegex);
    if (!match) {
      throw new Error(`Could not parse paginator range from: "${text}"`);
    }

    return {
      from: parseInt(match[1], 10),
      to: parseInt(match[2], 10),
      total: parseInt(match[3].replace(/[.,]/g, ''), 10),
    };
  }

  async assertFilterNotDisplayLabelNotAvailableInfo() {
    await this.page.waitForTimeout(2000);
    await expect(this.labelNotAvailableInfo).not.toBeVisible();
  }
  async assertFirstPage() {
    const previousButton = this.page.getByTestId(
      ORDERS_DATA_TEST_IDS.ordersTablePaginatorButtonPrevious
    );
    await expect(
      previousButton,
      'Paginator previous should be disabled on the first page'
    ).toBeDisabled();
  }

  async assertProcessorLogoIsVisible(
    processor: string,
    maxRetries: number = 3,
    retryDelay: number = 4000
  ): Promise<void> {
    const safeProcessor = processor.replace(/"/g, '\\"');
    const processorLogo = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.ssotImage(safeProcessor)
    );
    await retryOperation(this.page, processorLogo, maxRetries, retryDelay);
  }
}
