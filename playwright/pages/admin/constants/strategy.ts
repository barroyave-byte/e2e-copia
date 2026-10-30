const DATA_TEST_ID_SCOPE = 'strategy';
export const toDataTestIdSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const DATA_TEST_ID = {
  defaultRuleEdit: `${DATA_TEST_ID_SCOPE}-default-rule-button-edit`,
  defaultRuleUpdate: 'default-rule-button-update',
  defaultRuleName: 'default-rule-input-name',
  defaultRuleSave: 'default-rule-button-save',
  declineOption: 'payment-selector-option-decline',
  filterTabApm: `${DATA_TEST_ID_SCOPE}-filter-tab-apm`,
  defaultRuleCreate: `${DATA_TEST_ID_SCOPE}-default-rule-button-create`,
  // TODO(migration): no admin-ff component binds this string (verified via full-repo
  // grep). splitFraudProcessorCardIndex is the only consumer; needs interrogation to
  // find the current fraud-processor-card testid inside a split (structural change,
  // not a 1:1 rename candidate) before remapping.
  fraudProcessorCardIndex: (index: number) => `specific-rule-fraud-processor-card-index-${index}`,
  riskProcessorCardIndex: (riskLevel: string, index: number) =>
    `specific-rule-risk-${riskLevel}-processor-card-index-${index}`,
  riskContainer: (riskLevel: string) => `specific-rule-risk-${riskLevel}-container`,
  // TODO(migration): dead id-based locator — no `id="fraud-softDecline-*"` exists in
  // admin-ff anymore. Its only consumer (adminPaymentStrategyByPercentagePage.ts
  // riskSoftDeclineSelect) needs interrogation: SELECTOR_ROUTING_STRATEGY
  // ('specific-rule-select-soft-decline') also has zero admin-ff bindings, so the
  // whole "soft decline select -> add-dynamic-route option 1/2/3" flow looks
  // superseded by the RowProvider/payment-selector-listbox pattern used elsewhere in
  // SpecificRulePage — needs a live DOM check, not a mechanical remap.
  riskSoftDeclineSelect: (riskLevel: string, index: number) =>
    `fraud-softDecline-${riskLevel}-${index}`,
  splitContainer: (index: number) => `specific-rule-split-container-${index}`,
  splitPercentageInput: (index: number) => `specific-rule-split-percentage-input-${index}`,
  addSplitButton: 'specific-rule-add-split-button',
  switchPostAuthorization: 'specific-rule-switch-post-authorization',
  postAuthorizationProcessorCardIndex: (index: number) =>
    `specific-rule-post-authorization-processor-card-index-${index}`,
  postAuthorizationShadowModeRadio: 'specific-rule-shadow-mode-post-authorization-radio',
  processingTypeOption: (value: 'decline' | 'dynamic_route') =>
    `specific-rule-processing-type-option-${value.replaceAll('_', '-')}`,
  conditionTypeTrigger: 'specific-rule-condition-type-select',
  conditionTypeOption: (value: string) =>
    `specific-rule-condition-type-select-select-option-${value}`,
  conditionOperatorTrigger: 'specific-rule-condition-operator-select',
  conditionOperatorOption: (value: string) =>
    `specific-rule-condition-operator-select-select-option-${value}`,
  conditionValueTrigger: 'specific-rule-condition-values-combobox-container-trigger',
  conditionValueOption: (value: string) => `specific-rule-condition-values-option-${value}`,
  conditionListNameInput: 'specific-rule-condition-list-input-name',
  conditionListManualTab: 'specific-rule-condition-list-tab-manual',
  conditionListCsvTab: 'specific-rule-condition-list-tab-csv',
  conditionListValuesInput: 'specific-rule-condition-list-input-values',
  conditionOperandInput: (conditionType: string) =>
    `specific-rule-condition-${conditionType}-operand-input`,
  conditionListSaveButton: 'specific-rule-condition-list-button-save',
  deactivateRuleModalDialog: 'specific-rule-deactivate-modal-dialog',
  deactivateRuleModalConfirmButton: 'specific-rule-deactivate-modal-confirm-button',
  paymentSelectorListbox: (triggerDataTestId: string) => `${triggerDataTestId}-listbox`,
  paymentSelectorOptionLabel: (label: string) =>
    `payment-selector-option-label-${toDataTestIdSegment(label)}`,
  specificRuleTable: `${DATA_TEST_ID_SCOPE}-specific-rule-table`,
  specificRuleLabel: (label: string) =>
    `${DATA_TEST_ID_SCOPE}-specific-rule-label-${toDataTestIdSegment(label)}`,
  specificRuleTableExpand: (label: string) =>
    `${DATA_TEST_ID_SCOPE}-specific-rule-table-button-expand-${toDataTestIdSegment(label)}`,
  specificRuleTableActionsTrigger: 'dropdown-button-trigger',
  processorItem: (processorName: string) =>
    `${DATA_TEST_ID_SCOPE}-processor-${processorName.toLowerCase().replaceAll(' ', '-')}-item`,
  shadowModeDisableAlert: 'strategy-shadow-mode-disabled-alert',
  shadowModeSwitch: 'switch-shadow-mode-active',
  // Metadata condition form (RulesConditionListContainer -> MetadataField).
  // Index is hardcoded to the first entry — every current spec configures
  // exactly one metadata entry per condition.
  metadataKeyInput: 'specific-rule-metadata-entry-0-key-input',
  metadataOperationTrigger: 'specific-rule-metadata-entry-0-operation-trigger',
  metadataOperationOption: (value: string) =>
    `specific-rule-metadata-entry-0-operation-option-${value}`,
  metadataValueType: (value: 'text' | 'number') =>
    `specific-rule-metadata-entry-0-value-type-${value}`,
  metadataValueInput: 'specific-rule-metadata-entry-0-value-input',

  // ── Routing table additional filter bar (ADM-5033) ────────────────────────
  // Scope comes from admin-ff FILTER_BAR_DATA_TEST_ID + the multiselect combobox suffixes.
  addFilterButton: `${DATA_TEST_ID_SCOPE}-specific-rule-table-filter-bar-button-add-filter`,
  filterChooserOption: (filterId: string) =>
    `${DATA_TEST_ID_SCOPE}-specific-rule-table-filter-bar-chooser-option-${filterId}`,
  filterChooserApply: `${DATA_TEST_ID_SCOPE}-specific-rule-table-filter-bar-chooser-button-apply`,
  filterRuleNamesTrigger: `${DATA_TEST_ID_SCOPE}-specific-rule-table-filter-bar-filter-ruleNames-combobox-container-trigger`,
  // Routing product tour (driver.js) shown to first-time users; "Omitir" button.
  tourSkipButton: `${DATA_TEST_ID_SCOPE}-tour-button-dismiss`,
  filterPaymentProcessorsTrigger: `${DATA_TEST_ID_SCOPE}-specific-rule-table-filter-bar-filter-paymentProcessors-combobox-container-trigger`,
};
