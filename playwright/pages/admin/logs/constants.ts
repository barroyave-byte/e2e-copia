/**
 * Data test ids for the admin 2.0 Logs module (/logs).
 * Source of truth: admin-ff src/components/views/Logs/constants/dataTestIds.ts
 * Table-derived ids follow the shared FilterTable scope convention, same as
 * the orders table (`{scope}-row-`, `{scope}-paginator-*`).
 */
export const LOGS_DATA_TEST_IDS = {
  header: 'logs-header',
  title: 'logs-text-title',
  subtitle: 'logs-text-subtitle',
  exportButton: 'logs-button-export',
  searchInput: 'logs-input-search',
  // Records filter bar date picker. Verified in the deployed admin: the filter
  // bar uses the plain scope (no `-date-range-picker` suffix) and the calendar
  // derives day buttons as `-button-day-{yyyy-MM-dd}`.
  dateFilter: 'logs-select-date',
  dateFilterDialog: 'logs-select-date-dialog',
  dateFilterDayPrefix: 'logs-select-date-button-day-',
  dateFilterConfirmButton: 'logs-select-date-button-confirm',
  dateFilterCancelButton: 'logs-select-date-button-cancel',
  dateFilterPrevMonthButton: 'logs-select-date-button-prev-month',
  dateFilterNextMonthButton: 'logs-select-date-button-next-month',
  tabRecords: 'logs-tabs-filter-tab-records',
  tabDownloads: 'logs-tabs-filter-tab-downloads',
  tableScope: 'logs-table',
  tableRowPrefix: 'logs-table-row-',
  tableHeaderPrefix: 'logs-table-header-',
  tableCellExecutedByPrefix: 'logs-table-cell-executedBy-',
  tableCellCreatedAtPrefix: 'logs-table-cell-createdAt-',
  tableCellIpPrefix: 'logs-table-cell-ip-',
  tableCellSectionPrefix: 'logs-table-cell-section-',
  tableTotalCount: 'logs-table-total-count',
  tableRefreshButton: 'logs-table-button-refresh',
  tablePaginatorSelectPageSize: 'logs-table-paginator-select-page-size',
  tablePaginatorInfoPage: 'logs-table-paginator-info-page',
  downloadsTable: 'logs-downloads-table',
  downloadsTableRowPrefix: 'logs-downloads-table-row-',
  downloadsTableCellNamePrefix: 'logs-downloads-table-cell-name-',
  downloadsTableCellCreatedAtPrefix: 'logs-downloads-table-cell-createdAt-',
  downloadsTableChipPrefix: 'logs-downloads-table-chip-',
  downloadsTableEmptyResults: 'logs-downloads-table-empty-results',
  downloadsTableRefreshButton: 'logs-downloads-table-button-refresh',
  downloadsPaginatorNext: 'logs-downloads-table-paginator-button-next',
  downloadsPaginatorPrevious: 'logs-downloads-table-paginator-button-previous',
  downloadExportButtonPrefix: 'logs-button-download-export-',
  copyExportNameButtonPrefix: 'logs-button-copy-export-name-',
  exportErrorToast: 'logs-export-error-toast',
  exportSuccessToast: 'logs-export-success-toast',
  downloadErrorToast: 'logs-download-error-toast',
  notFoundState: 'error-page-not-found',
  exportDateRangeScope: 'logs-export-drawer-datepicker-date-range-picker',
  exportSectionFilterTrigger: 'logs-export-drawer-select-section-combobox-container-trigger',
  exportSectionOptionPrefix: 'logs-export-drawer-select-section-option-',
  exportSectionSelectAllOption: 'logs-export-drawer-select-section-option-all',
  exportSubmitButton: 'logs-export-drawer-button-submit',
  exportCancelButton: 'logs-export-drawer-button-cancel',
  moreFiltersButton: 'logs-table-filter-bar-button-add-filter',
  clearFiltersButton: 'logs-table-filter-bar-button-clear-filters',
  moreFiltersOptionPrefix: 'logs-table-filter-bar-chooser-option-',
  moreFiltersApplyButton: 'logs-table-filter-bar-chooser-button-apply',
  moreFiltersClearButton: 'logs-table-filter-bar-chooser-button-clear',
  sectionFilterScope: 'logs-select-section',
  sectionFilterOptionPrefix: 'logs-select-section-option-',
  sectionFilterRemoveButton: 'logs-select-section-button-remove',
  actionFilterScope: 'logs-select-action',
  actionFilterOptionPrefix: 'logs-select-action-option-',
  severityFilterScope: 'logs-select-severity',
  severityFilterOptionPrefix: 'logs-select-severity-option-',
  resultFilterScope: 'logs-select-result',
  resultFilterOptionPrefix: 'logs-select-result-option-',
  rowDetailsPrefix: 'row-details-',
  detailsTable: 'logs-table-details-content',
  detailTabDetails: 'logs-detail-tabs-filter-tab-details',
  detailTabJson: 'logs-detail-tabs-filter-tab-json',
  jsonSearchInput: 'logs-input-json-search',
  jsonCodeContent: 'logs-code-block-json-code-block-content',
  tableToggleRowButtonPrefix: 'logs-table-button-toggle-row-',
  tableActionsButtonPrefix: 'logs-table-button-actions-',
  tableCopyEntryPrefix: 'logs-table-menu-copy-entry-',
  tableCopyIpPrefix: 'logs-table-menu-copy-ip-',
} as const;

/**
 * Test id builders for the Calendar/DateRangePicker molecule, shared by every
 * scope that renders one (records filter, export drawer). Verified in the
 * deployed admin: the dialog/day/confirm/prev-month ids are the scope with a
 * fixed suffix appended — no extra `-date-range-picker` layer for the records
 * scope, but export's own scope already ends in `-date-range-picker`.
 */
export const CALENDAR_TEST_IDS = {
  dialog: (scope: string) => `${scope}-dialog`,
  day: (scope: string, isoDay: string) => `${scope}-button-day-${isoDay}`,
  confirmButton: (scope: string) => `${scope}-button-confirm`,
  cancelButton: (scope: string) => `${scope}-button-cancel`,
  prevMonthButton: (scope: string) => `${scope}-button-prev-month`,
  nextMonthButton: (scope: string) => `${scope}-button-next-month`,
} as const;

/** Export status whose row exposes an enabled download action (admin-ff DOWNLOADABLE_STATUS). */
export const LOGS_EXPORT_DOWNLOADABLE_STATUS = 'completed';

/**
 * Column keys of the records table (admin-ff useLogsTableHeaders.tsx).
 * The deployed admin 2.0 renders five columns; `deviceId` exists in the
 * admin-ff source but is not shown by default, so it is not asserted.
 */
export const LOGS_RECORDS_COLUMNS = ['createdAt', 'executedBy', 'action', 'section', 'ip'] as const;
