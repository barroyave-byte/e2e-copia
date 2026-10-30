import { expect, type Locator } from '@playwright/test';
import { Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { RiskOption } from '@support/interfaces/riskOption';
import { CommonsActions } from '@pages/commonActions';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { SPECIFIC_RULE_SELECTORS } from './payment_strategies/adminSpecificRulesPage';
import { DATA_TEST_ID, toDataTestIdSegment } from './constants/strategy';
import { retryOperationWithAction } from '@support/utils/retries';
import envConfig, { allowedEnvironments } from '@support/envConfig';

const ruleLabel = 'New rule 2025';

export type MetadataConditionFormatType = 'text' | 'number';
export type MetadataConditionOperator = 'eq' | 'neq';

/** Optional fields for {@link AdminPaymentStrategyPage.addConditionMetadata}. Defaults match the original hardcoded flow. */
export type AddConditionMetadataOptions = {
  formatType?: MetadataConditionFormatType;
  operator?: MetadataConditionOperator;
  /** Value compared against the metadata variable (operand). */
  value?: string;
};

export class AdminPaymentStrategyPage extends CommonsActions {
  protected page: Page;
  readonly selectors: AdminTranslations;
  readonly buttonStrategyFraudEngine: Locator;
  readonly optionStrategyToProcess: Locator;
  readonly optionStrategyToFraud: Locator;
  readonly optionDecline: Locator;
  readonly buttonStrategyDefRuleEdit: Locator;
  readonly buttonStrategyDefRuleCreate: Locator;
  readonly inputDefaultRuleName: Locator;
  readonly buttonStrategyDefRuleUpdate: Locator;
  readonly switchStrategyDefRulePostAuthAnalisys: Locator;
  readonly buttonStrategyOrderProcessingEdit: Locator;
  readonly buttonConfirmModal: Locator;
  readonly labelRuleName: Locator;
  readonly tabActiveSpecificRule: Locator;
  readonly tabPendingSpecificRule: Locator;
  readonly buttonRefreshSpecificRulesTable: Locator;
  readonly buttonMoreVert: Locator;
  readonly buttonEditSpecificRoutingRule: Locator;
  readonly buttonEditTransactionProcessingOrderEditRouting: Locator;
  readonly checkBoxCvvValidation: Locator;
  readonly checkboxRequire3DS: Locator;
  readonly buttonActivatePaymentStrategy: Locator;
  readonly addMemberShadowModeButton: Locator;
  readonly selectMemberShadowModeButton: Locator;
  readonly selectShadowModePreAuthRadio: Locator;
  readonly buttonDeclineTransaction: Locator;
  readonly buttonNextStepRouting: Locator;
  readonly listItemEmail: Locator;
  readonly inputNameList: Locator;
  readonly selectOperatorList: Locator;
  readonly operatorEqual: Locator;
  readonly radioUploadManual: Locator;
  readonly inputManualList: Locator;
  readonly listItemStoreId: Locator;
  readonly radioUploadCsv: Locator;
  readonly listItemMetadata: Locator;
  readonly inputVariableMetadata: Locator;
  readonly selectOperatorMetadata: Locator;
  readonly inputValueMetadata: Locator;
  readonly buttonPostAuthFraudProcessorCard: Locator;
  readonly selectConditionType: Locator;
  readonly buttonSaveConditionList: Locator;
  // ── Additional filter bar (ADM-5033) ──────────────────────────────────────
  readonly buttonAddFilter: Locator;
  readonly buttonFilterBarChooserApply: Locator;
  readonly filterRuleNameTrigger: Locator;
  readonly filterProcessorTrigger: Locator;
  readonly filterOptions: Locator;
  readonly buttonSkipTour: Locator;
  readonly chooserOptionMetadata: Locator;
  readonly buttonFilterMetadata: Locator;
  readonly buttonAddMetadataPair: Locator;
  readonly inputFilterMetadataKey: Locator;
  readonly inputFilterMetadataValue: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    this.buttonStrategyFraudEngine = page.getByTestId(
      SPECIFIC_RULE_SELECTORS.PROCESSOR_CARD_INDEX(0)
    );
    this.optionStrategyToProcess = page.getByTestId(
      'specific-rule-add-dynamic-route-select-option-1'
    );
    this.optionStrategyToFraud = page.getByTestId(
      'specific-rule-add-dynamic-route-select-option-3'
    );
    this.optionDecline = page.getByTestId(DATA_TEST_ID.declineOption);
    this.buttonStrategyDefRuleEdit = page.getByTestId(DATA_TEST_ID.defaultRuleEdit);
    this.buttonStrategyDefRuleCreate = page.getByTestId(DATA_TEST_ID.defaultRuleCreate);
    this.inputDefaultRuleName = page.getByTestId(DATA_TEST_ID.defaultRuleName);
    this.buttonStrategyDefRuleUpdate = page
      .getByTestId(DATA_TEST_ID.defaultRuleSave)
      .or(page.getByTestId(DATA_TEST_ID.defaultRuleUpdate));
    this.switchStrategyDefRulePostAuthAnalisys = page.getByTestId(
      'specific-rule-switch-post-authorization'
    );
    this.buttonConfirmModal = this.page.getByTestId(
      SPECIFIC_RULE_SELECTORS.BUTTON_PENDING_LOAD_FILE_CONFIRM_BUTTON
    );
    // The edit-rule drawer now renders the rule-name field directly editable —
    // confirmed live (ADM-T741): the "general information" step no longer has a
    // separate edit-toggle button, so this locator targets the input itself.
    this.buttonStrategyOrderProcessingEdit = page.getByTestId(
      SPECIFIC_RULE_SELECTORS.FORM_INPUT_NAME_RULE
    );
    this.labelRuleName = this.page.locator(`text=${ruleLabel}`);
    this.tabActiveSpecificRule = this.page.getByTestId('specific-rule-filter-tab-enabled');
    this.tabPendingSpecificRule = this.page.getByTestId('specific-rule-filter-tab-pending');
    this.buttonRefreshSpecificRulesTable = this.page.getByTestId(
      'strategy-specific-rule-table-button-refresh'
    );
    this.buttonMoreVert = page.getByTestId(DATA_TEST_ID.specificRuleTableActionsTrigger);
    this.buttonEditSpecificRoutingRule = this.page.getByTestId(
      SPECIFIC_RULE_SELECTORS.TABLE_DROPDOWN_OPTION_EDIT
    );
    this.buttonEditTransactionProcessingOrderEditRouting = this.page.getByTestId(
      SPECIFIC_RULE_SELECTORS.EDIT_DYNAMIC_ROUTE
    );
    this.checkBoxCvvValidation = this.page.getByTestId('strategy-checkbox-cvv');
    this.checkboxRequire3DS = this.page.getByTestId('strategy-checkbox-3ds');
    this.buttonActivatePaymentStrategy = this.page.getByTestId('save_rule');
    this.addMemberShadowModeButton = this.page.getByTestId(DATA_TEST_ID.shadowModeSwitch);
    this.selectMemberShadowModeButton = this.page.getByTestId(
      SPECIFIC_RULE_SELECTORS.SHADOW_MODE_SELECT_MEMBER
    );
    this.selectShadowModePreAuthRadio = this.page.getByTestId(
      SPECIFIC_RULE_SELECTORS.SHADOW_MODE_PRE_AUTH_RADIO
    );
    this.buttonDeclineTransaction = page.getByTestId(DATA_TEST_ID.processingTypeOption('decline'));
    this.buttonNextStepRouting = page.getByTestId(
      DATA_TEST_ID.processingTypeOption('dynamic_route')
    );
    this.listItemEmail = page.getByTestId(DATA_TEST_ID.conditionTypeOption('email_list'));
    this.inputNameList = page.getByTestId(DATA_TEST_ID.conditionListNameInput);
    this.selectOperatorList = page.getByTestId(DATA_TEST_ID.conditionOperatorTrigger);
    this.operatorEqual = page.getByTestId(DATA_TEST_ID.conditionOperatorOption('eq'));
    this.radioUploadManual = page.getByTestId(DATA_TEST_ID.conditionListManualTab);
    this.inputManualList = page.getByTestId(DATA_TEST_ID.conditionListValuesInput);
    this.listItemStoreId = page.getByTestId(DATA_TEST_ID.conditionTypeOption('store_id_list'));
    this.radioUploadCsv = page.getByTestId(DATA_TEST_ID.conditionListCsvTab);
    this.listItemMetadata = page.getByTestId(DATA_TEST_ID.conditionTypeOption('metadata'));
    // The metadata sub-form was redesigned: format type is now a segmented
    // pill group (no dropdown), and the operator/key/value fields moved to
    // the new per-entry MetadataField scope (confirmed live, ADM-T811).
    this.inputVariableMetadata = page.getByTestId(DATA_TEST_ID.metadataKeyInput);
    this.selectOperatorMetadata = page.getByTestId(DATA_TEST_ID.metadataOperationTrigger);
    this.inputValueMetadata = page.getByTestId(DATA_TEST_ID.metadataValueInput);
    this.buttonPostAuthFraudProcessorCard = page.getByTestId(
      DATA_TEST_ID.postAuthorizationProcessorCardIndex(0)
    );
    this.selectConditionType = page.getByTestId(DATA_TEST_ID.conditionTypeTrigger);
    this.buttonSaveConditionList = page.getByTestId(DATA_TEST_ID.conditionListSaveButton);
    this.buttonAddFilter = page.getByTestId(DATA_TEST_ID.addFilterButton);
    this.buttonFilterBarChooserApply = page.getByTestId(DATA_TEST_ID.filterChooserApply);
    this.filterRuleNameTrigger = page.getByTestId(DATA_TEST_ID.filterRuleNamesTrigger);
    this.filterProcessorTrigger = page.getByTestId(DATA_TEST_ID.filterPaymentProcessorsTrigger);
    // Combobox options carry the raw value in their test ID, so they are picked by text.
    this.filterOptions = page.getByRole('option');
    this.buttonSkipTour = page.getByTestId(DATA_TEST_ID.tourSkipButton);
    this.chooserOptionMetadata = page.getByTestId(DATA_TEST_ID.filterChooserOption('metadata'));
    // The metadata filter popover exposes no test IDs; it is reachable by role / aria-label.
    this.buttonFilterMetadata = page.getByRole('button', { name: 'Add pairs…' });
    this.buttonAddMetadataPair = page.getByRole('button', { name: /^add (filter|pair)$/i });
    this.inputFilterMetadataKey = page.getByRole('textbox', { name: 'Metadata key' });
    this.inputFilterMetadataValue = page.getByRole('textbox', { name: 'Metadata value' });
  }
  // Actions:
  async editDefaultRouting(
    processor: ConnectionsAvailable | ConnectionsAvailable[],
    configRisks?: RiskOption[]
  ) {
    await this.clickEditDefaultProcessing();
    await this.defineDefaultProcessingOrder(processor, configRisks ?? configRisks);
  }

  async assertButtonIsEnabledBeforeClick() {
    await this.isButtonEnabled(this.buttonActivatePaymentStrategy);
  }

  async clickSaveButtonAndAssertIsDisabled() {
    await this.assertButtonIsEnabledBeforeClick();
    await this.buttonActivatePaymentStrategy.click();
    await expect(this.buttonActivatePaymentStrategy).not.toBeAttached();
  }

  async editDefaultRoutingWidthShadowMode(processor: ConnectionsAvailable) {
    await this.clickEditDefaultProcessing();
    await this.selectDefaultFraudEngine(processor);
  }

  async addShadowMode(fraudProcessorShadowMode: ConnectionsAvailable) {
    await expect(this.addMemberShadowModeButton).toBeVisible();
    await this.addMemberShadowModeButton.click();
    await expect(this.selectMemberShadowModeButton).toBeVisible();
    await this.selectProcessorOption(this.selectMemberShadowModeButton, fraudProcessorShadowMode);
  }

  async AddShadowModePreAuth() {
    await expect(this.selectShadowModePreAuthRadio).toBeVisible();
    await this.selectShadowModePreAuthRadio.click();
    await this.clickUpdateDefaultProcessing();
  }

  async editDefaultRoutingPostAuthorization(
    fraudEngine: ConnectionsAvailable,
    pspEngine: ConnectionsAvailable
  ) {
    await this.clickEditDefaultProcessing();
    await this.processingOrderWithPaymentAndFraud(fraudEngine, pspEngine);
    await this.clickUpdateDefaultProcessing();
  }

  // A merchant with no default rule configured yet shows a "create" CTA instead of
  // "edit"; both land on the same default-rule form, so either entry point works.
  // The create form additionally requires a rule name before the save button enables.
  async clickEditDefaultProcessing() {
    await expect(this.buttonStrategyDefRuleEdit.or(this.buttonStrategyDefRuleCreate)).toBeVisible();

    if (await this.buttonStrategyDefRuleCreate.isVisible()) {
      await this.buttonStrategyDefRuleCreate.click();
      await expect(this.inputDefaultRuleName).toBeVisible();
      await this.inputDefaultRuleName.fill('Default rule');
      return;
    }

    await this.buttonStrategyDefRuleEdit.click();
  }

  async clickEditNameRule() {
    const firstButtonStrategyOrderProcessingEdit = this.buttonStrategyOrderProcessingEdit.first();
    await expect(firstButtonStrategyOrderProcessingEdit).toBeVisible();
    await firstButtonStrategyOrderProcessingEdit.click();
  }

  async addLastPaymentProcessor() {
    const selector = this.getLastRoutingProcessorSelector();
    await this.ensureVisibleToClick(selector);
    await expect(await this.getPaymentSelectorListbox(selector)).toBeVisible();
  }

  async selectLastPaymentProcessor() {
    await this.ensureVisibleToClick(this.optionDecline);
  }

  async verifySelectProcessorVisibility(isVisible: boolean) {
    const listbox = await this.getPaymentSelectorListbox(this.getLastRoutingProcessorSelector());
    if (isVisible) {
      await expect(listbox).toBeVisible();
    } else {
      await expect(listbox).not.toBeVisible();
    }
  }

  async defineDefaultProcessingOrder(
    processor: ConnectionsAvailable[] | ConnectionsAvailable,
    categoryRisks?: RiskOption[],
    buttonStrategyDefRuleRouting?: 'create' | 'edit',
    validateCvv?: boolean,
    require3ds?: boolean
  ) {
    await this.configureRouting(processor, categoryRisks, validateCvv, require3ds);

    if (buttonStrategyDefRuleRouting !== 'create') {
      await this.clickUpdateDefaultProcessing();
    }
  }

  async declineTransactionForPaymentStrategy() {
    await expect(this.buttonDeclineTransaction).toBeVisible();
    await this.buttonDeclineTransaction.click();
  }

  async configureRouting(
    processor: ConnectionsAvailable[] | ConnectionsAvailable,
    categoryRisks?: RiskOption[],
    validateCvv?: boolean,
    require3ds?: boolean
  ) {
    if (Array.isArray(processor)) {
      await this.configureRoutingMultipleProcessors(processor);
    } else {
      await this.selectDefaultFraudEngine(processor);
      if (categoryRisks) await this.selectRiskToProcess(categoryRisks);
    }

    if (validateCvv === false) {
      await this.checkBoxCvvValidation.click();
      await expect(this.checkBoxCvvValidation).toHaveAttribute('aria-checked', 'false');
    }
    if (require3ds === true) {
      await this.checkboxRequire3DS.click();
      await expect(this.checkboxRequire3DS).toHaveAttribute('aria-checked', 'true');
    }
  }

  // TODO - This method will be updated and improved
  async configureRoutingMultipleProcessors(processors: ConnectionsAvailable[]) {
    for (let index = 0; index < processors.length; index++) {
      const processor = processors[index];
      await this.selectDefaultFraudEngine(processor, index);
    }
  }

  async processingOrderWithPaymentAndFraud(
    fraudEngine: ConnectionsAvailable,
    pspEngine: ConnectionsAvailable
  ) {
    await this.selectDefaultPaymentEngine(pspEngine);

    await expect(this.switchStrategyDefRulePostAuthAnalisys).toBeVisible();
    await this.switchStrategyDefRulePostAuthAnalisys.click();
    await this.selectPosthAuthFraudProcessor(fraudEngine);
  }

  async editDefaultRoutingManyProcessor(processors: ConnectionsAvailable[]) {
    await this.clickEditDefaultProcessing();
    await this.configureRoutingMultipleProcessors(processors);
    await this.clickUpdateDefaultProcessing();
  }

  async editDefaultRoutingOneProcessor(firstPaymentProcessor: ConnectionsAvailable) {
    await this.clickEditDefaultProcessing();
    await this.selectDefaultPaymentEngine(firstPaymentProcessor);

    await this.clickUpdateDefaultProcessing();
  }

  async addPaymentProcessor() {
    await this.addLastPaymentProcessor();
  }

  async clickUpdateDefaultProcessing() {
    if (envConfig.NODE_ENV === allowedEnvironments.PRE_PRODUCTION) {
      await this.ensureVisibleToClick(this.buttonStrategyDefRuleUpdate, undefined, undefined, {
        force: true,
      });
      return;
    }

    await expect(
      this.buttonStrategyDefRuleUpdate,
      'Default-rule Actualizar button should be visible'
    ).toBeVisible({ timeout: 15000 });
    await expect(this.buttonStrategyDefRuleUpdate).toBeEnabled({ timeout: 15000 });
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/rules') &&
        ['POST', 'PUT', 'PATCH'].includes(response.request().method()),
      { timeout: 40000 }
    );
    await this.buttonStrategyDefRuleUpdate.click();
    const response = await saveResponse;
    expect(response.ok()).toBeTruthy();
    await this.page.waitForURL(/\/strategy\/?$/);
  }

  async clickSaveDefaultProcessingRule() {
    await expect(this.buttonStrategyDefRuleUpdate).toBeVisible();
    await expect(this.buttonStrategyDefRuleUpdate).toBeEnabled();
    await this.buttonStrategyDefRuleUpdate.click();
  }

  async clickEditRouting() {
    await expect(this.buttonEditTransactionProcessingOrderEditRouting).toBeVisible();
    await this.buttonEditTransactionProcessingOrderEditRouting.click();
  }

  async selectDefaultPaymentEngine(pspEngine: ConnectionsAvailable) {
    await this.selectProcessorOption(this.buttonStrategyFraudEngine, pspEngine);
  }

  // TODO - This method will be updated and improved
  async selectDefaultFraudEngine(fraudEngine: ConnectionsAvailable, index?: number) {
    const selector = this.page.getByTestId(
      SPECIFIC_RULE_SELECTORS.PROCESSOR_CARD_INDEX(index ?? 0)
    );
    await this.selectProcessorOption(selector, fraudEngine);
  }

  /**
   * Selects a post-authentication fraud processor from the available connections.
   *
   * @param {ConnectionsAvailable} fraudEngine - The name of the fraud engine to be selected.
   * @returns {Promise<void>} A promise that resolves when the fraud engine has been selected.
   *
   * @example
   * ```typescript
   * await adminPaymentStrategyPage.selectPosthAuthFraudProcessor(ConnectionsAvailable.FraudEngineName);
   * ```
   */
  async selectPosthAuthFraudProcessor(fraudEngine: ConnectionsAvailable) {
    await this.selectProcessorOption(this.buttonPostAuthFraudProcessorCard, fraudEngine);
  }

  async selectRiskToProcess(riskLevels: RiskOption[]) {
    for (const riskLevel of riskLevels) {
      const riskSelector = this.page
        .getByTestId(DATA_TEST_ID.riskProcessorCardIndex(riskLevel.riskLevel, 0))
        .last();

      if (riskLevel.action === 'process' && riskLevel.processor) {
        await this.selectProcessorOption(riskSelector, riskLevel.processor.name);
      } else {
        await this.ensureVisibleToClick(riskSelector);
        await this.ensureVisibleToClick(this.optionDecline);
      }
    }
  }

  async createSpecificRule() {
    const createRuleButton = this.page.getByTestId(
      SPECIFIC_RULE_SELECTORS.BUTTON_CREATE_SPECIFIC_RULE
    );
    await expect(createRuleButton).toBeVisible();
    await createRuleButton.click();
  }

  async saveRule() {
    await expect(this.buttonActivatePaymentStrategy).toBeVisible();

    if (envConfig.NODE_ENV === allowedEnvironments.PRE_PRODUCTION) {
      await this.buttonActivatePaymentStrategy.click();
      return;
    }

    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/rules') && response.request().method() === 'POST'
    );
    await this.buttonActivatePaymentStrategy.click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  }

  async saveRouting() {
    await expect(this.buttonNextStepRouting).toBeVisible();
  }

  async saveRuleAndWaitForResponse() {
    await expect(this.buttonActivatePaymentStrategy).toBeVisible();
    const responsePromise = this.page.waitForResponse('**/routing/merchants/**/rules/**', {
      timeout: 10000,
    });

    await this.buttonActivatePaymentStrategy.click();
    await responsePromise;
  }

  async firstStepSpecificRule(val: string = ruleLabel, _isOmitNextStep?: boolean) {
    const input = this.page.getByTestId(SPECIFIC_RULE_SELECTORS.FORM_INPUT_NAME_RULE);
    await expect(input).toBeVisible();
    await input.fill(val);
    await expect(input).toHaveValue(val);
  }

  async addConditionStepSpecificRule() {
    const addConditionButton = this.page.getByTestId(SPECIFIC_RULE_SELECTORS.BUTTON_ADD_CONDITION);
    await expect(addConditionButton).toBeVisible();
    await addConditionButton.click();
  }

  async nextStepRouting() {
    await this.nextStepRoutingConfig();
  }
  async nextStepRoutingConfig() {
    await expect(this.buttonNextStepRouting).toBeVisible();
    await this.buttonNextStepRouting.click();
    await expect(this.buttonStrategyFraudEngine).toBeVisible();
  }
  async addConditionManualEmailList(emailIncorrect?: boolean, email?: string) {
    await this.ensureVisibleToClick(this.selectConditionType);
    await expect(this.listItemEmail).toBeVisible();
    await this.listItemEmail.click();

    await this.inputNameList.fill('New email list');
    await expect(this.inputNameList).toHaveValue('New email list');

    await expect(this.selectOperatorList).toBeVisible();
    await this.selectOperatorList.click();
    await expect(this.operatorEqual).toBeVisible();
    await this.operatorEqual.click();
    await expect(this.radioUploadManual).toBeVisible();
    await this.radioUploadManual.click();

    await this.inputManualList.fill(
      emailIncorrect ? 'adqminqa+11@deuna.com' : email || 'adqminqa+10@deuna.com'
    );
    await this.inputManualList.press('Enter');
    await expect(this.buttonSaveConditionList).toBeEnabled();
    const createListResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/routing\/v2\/merchants\/[^/]+\/lists(?:\?|$)/.test(response.url())
    );
    await this.buttonSaveConditionList.click();
    expect((await createListResponse).ok()).toBeTruthy();
  }

  async addConditionBin(bin: string) {
    await this.ensureVisibleToClick(this.selectConditionType);
    const binOption = this.page.getByTestId(DATA_TEST_ID.conditionTypeOption('bin'));
    await expect(binOption).toBeVisible();
    await binOption.click();
    const input = this.page
      .getByTestId(DATA_TEST_ID.conditionOperandInput('bin'))
      .getByRole('textbox');
    await input.fill(bin);
  }

  async addConditionManualStoreCodeList(condition: string, stores: string) {
    await this.ensureVisibleToClick(this.selectConditionType);
    await expect(this.listItemStoreId).toBeVisible();
    await this.listItemStoreId.click();

    await this.inputNameList.fill('New store list');
    await expect(this.inputNameList).toHaveValue('New store list');

    await expect(this.selectOperatorList).toBeVisible();
    await this.selectOperatorList.click();
    // The store-list flow now shares the generic inline condition-operator
    // select (same one email uses), not a dedicated "email-and-stores" scope
    // — confirmed live (ADM-T525).
    const operator = this.page.getByTestId(DATA_TEST_ID.conditionOperatorOption(condition));
    await expect(operator).toBeVisible();
    await operator.click();
    await expect(this.radioUploadManual).toBeVisible();
    await this.radioUploadManual.click();

    await this.inputManualList.fill(stores);
    await this.inputManualList.press('Enter');

    // The store list must be saved the same way the email list is — without
    // this, the rule POST references a list that was never persisted and the
    // backend rejects it (confirmed live, ADM-T525).
    await expect(this.buttonSaveConditionList).toBeEnabled();
    const createListResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/routing\/v2\/merchants\/[^/]+\/lists(?:\?|$)/.test(response.url())
    );
    await this.buttonSaveConditionList.click();
    expect((await createListResponse).ok()).toBeTruthy();
  }

  async chooseFormatTypeMetadata(formatType: MetadataConditionFormatType) {
    // Segmented pills, always visible — no dropdown to open first.
    const formatTypeOption = this.page.getByTestId(DATA_TEST_ID.metadataValueType(formatType));
    await expect(formatTypeOption).toBeVisible();
    await formatTypeOption.click();
  }

  async chooseOperatorMetadata(operator: MetadataConditionOperator) {
    await expect(this.selectOperatorMetadata).toBeVisible();
    await this.selectOperatorMetadata.click();
    const operatorOption = this.page.getByTestId(DATA_TEST_ID.metadataOperationOption(operator));
    await expect(operatorOption).toBeVisible();
    await operatorOption.click();
  }

  /**
   * Adds a metadata condition in the specific-rule flow.
   * @param variableName — Metadata key / variable shown in the form.
   * @param options — Format, operator and value; defaults preserve previous behavior (text, eq, value `test_metadata`).
   */
  async addConditionMetadata(variableName: string, options: AddConditionMetadataOptions = {}) {
    const formatType: MetadataConditionFormatType = options.formatType ?? 'text';
    const operator: MetadataConditionOperator = options.operator ?? 'eq';
    const value = options.value ?? 'test_metadata';

    await this.ensureVisibleToClick(this.selectConditionType);
    await this.ensureVisibleToClick(this.listItemMetadata);
    await this.inputVariableMetadata.fill(variableName);
    await this.chooseFormatTypeMetadata(formatType);
    await this.chooseOperatorMetadata(operator);
    await this.inputValueMetadata.fill(value);
  }

  async createFileInMemory() {
    const csvContent = `email\nadqminqa+10@deuna.com\n`;
    return Buffer.from(csvContent, 'utf-8');
  }

  async addConditionCSVEmailList() {
    await this.ensureVisibleToClick(this.selectConditionType);
    await expect(this.listItemEmail).toBeVisible();
    await this.listItemEmail.click();

    await this.inputNameList.fill('New email list');
    await expect(this.inputNameList).toHaveValue('New email list');

    await expect(this.selectOperatorList).toBeVisible();
    await this.selectOperatorList.click();
    await expect(this.operatorEqual).toBeVisible();
    await this.operatorEqual.click();
    await expect(this.radioUploadCsv).toBeVisible();
    await this.radioUploadCsv.click();
    const inputFile = this.page.locator('input[type=file]');
    const file = await this.createFileInMemory();

    await inputFile.setInputFiles({
      name: 'name',
      mimeType: 'text/csv',
      buffer: file,
    });

    // Uploading a CSV no longer opens a separate confirm modal — the file
    // preview renders inline and the same "Guardar lista" button used by the
    // manual-list flow commits it (confirmed live, ADM-T514).
    await expect(this.buttonSaveConditionList).toBeEnabled();
    const createListResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/routing\/v2\/merchants\/[^/]+\/lists(?:\?|$)/.test(response.url())
    );
    await this.buttonSaveConditionList.click();
    expect((await createListResponse).ok()).toBeTruthy();
  }

  /**
   * Asserts the just-created rule is visible (via retryOperationWithAction's
   * internal expect(...).toBeVisible()).
   *
   * CSV-list rules start as `process-in-background` while the file is still
   * processing, then flip to `enabled` once the backend job finishes — a real
   * async race, not a UI bug (confirmed live, ADM-T514: the rule showed on
   * "Activos" or "Pendientes" depending on how far that job had gotten by the
   * time we checked). Non-CSV rules are enabled immediately, so this resolves
   * on the first check against "Activos" exactly like before — the tab
   * alternation only kicks in when that first check fails.
   */
  async validateRuleCreated() {
    if (envConfig.NODE_ENV === allowedEnvironments.PRE_PRODUCTION) {
      await expect(this.labelRuleName).toBeVisible();
      return;
    }

    let isPendingTabSelected = false;
    await retryOperationWithAction(this.page, this.labelRuleName, 5, 3000, async () => {
      isPendingTabSelected = !isPendingTabSelected;
      await (
        isPendingTabSelected ? this.tabPendingSpecificRule : this.tabActiveSpecificRule
      ).click();
    });
  }

  private getSpecificRuleLocator(ruleName: string) {
    return this.page.getByTestId(DATA_TEST_ID.specificRuleLabel(ruleName));
  }

  async validateCustomRuleCreated(ruleName: string) {
    const ruleLocator = this.getSpecificRuleLocator(ruleName);
    await expect(ruleLocator).toBeVisible();
  }

  /**
   * For specs whose goal is the payment, not the admin. Right after saving, the rules
   * search can still come back empty (PF-T214: POST /rules 200 and the rule enabled, but
   * the search that followed returned 0 rules), and the table is never fetched again on
   * its own. Refreshing the table re-runs the search.
   */
  async validateCustomRuleCreatedRefreshingTable(ruleName: string) {
    const ruleLocator = this.getSpecificRuleLocator(ruleName);
    await retryOperationWithAction(this.page, ruleLocator, 5, 4000, async () => {
      await this.buttonRefreshSpecificRulesTable.click();
    });
  }

  async expandSpecificRuleDetail(ruleName: string) {
    const expandButton = this.page.getByTestId(DATA_TEST_ID.specificRuleTableExpand(ruleName));
    await expect(expandButton).toBeVisible();
    await expandButton.click();

    return expandButton;
  }

  async validateShadowModeDisabledAlertInRuleDetail(ruleName: string) {
    await this.expandSpecificRuleDetail(ruleName);
    await expect(this.page.getByTestId(DATA_TEST_ID.shadowModeDisableAlert)).toBeVisible();
  }

  // There is no separate read-only "saved condition" summary for metadata
  // anymore — the field is always-editable and applies directly to state, so
  // persistence is verified by re-reading the same live inputs (confirmed
  // live, ADM-T811). Values are compared slugified since callers may pass
  // either the raw typed string or its testid-safe form.
  async assertConditionMetadataSaved(
    variableName: string,
    formatType: MetadataConditionFormatType,
    value: string
  ) {
    await expect(this.inputVariableMetadata).toBeVisible();
    expect(toDataTestIdSegment(await this.inputVariableMetadata.inputValue())).toBe(
      toDataTestIdSegment(variableName)
    );
    await expect(this.page.getByTestId(DATA_TEST_ID.metadataValueType(formatType))).toHaveAttribute(
      'data-state',
      'on'
    );
    expect(toDataTestIdSegment(await this.inputValueMetadata.inputValue())).toBe(
      toDataTestIdSegment(value)
    );
  }

  protected async selectProcessorOption(trigger: Locator, processor: string) {
    await this.ensureVisibleToClick(trigger);
    const listbox = await this.getPaymentSelectorListbox(trigger);
    await expect(listbox).toBeVisible();
    const option = listbox.getByTestId(DATA_TEST_ID.paymentSelectorOptionLabel(processor));
    await expect(option).toBeVisible();
    await option.click();
  }

  protected async getPaymentSelectorListbox(trigger: Locator): Promise<Locator> {
    const triggerDataTestId = await trigger.getAttribute('data-testid');
    if (!triggerDataTestId) {
      throw new Error('Payment selector trigger must expose a data-testid');
    }

    return this.page.getByTestId(DATA_TEST_ID.paymentSelectorListbox(triggerDataTestId)).last();
  }

  private getLastRoutingProcessorSelector() {
    // The prefix also matches each trigger's own listbox
    // (`...-card-index-N-listbox`), which is a portal rendered after the
    // triggers — excluding it keeps `.last()` on the actual trigger button
    // (confirmed live, ADM-T474).
    return this.page
      .locator(
        '[data-testid^="specific-rule-processor-card-index-"]:not([data-testid$="-listbox"])'
      )
      .last();
  }

  async switchCvvValidationFromFirstRule() {
    await expect(this.buttonMoreVert).toBeVisible();
    await this.buttonMoreVert.click();

    await expect(this.buttonEditSpecificRoutingRule).toBeVisible();
    await this.buttonEditSpecificRoutingRule.click();

    // The routing-config step no longer has its own edit-toggle button —
    // clicking "Edit" on the row already lands in an editable state, same
    // as the general-information step (confirmed live, ADM-T741).
    await expect(this.checkBoxCvvValidation).toBeVisible();
    await this.checkBoxCvvValidation.click();
  }

  /**
   * DO NOT MODIFY
   * This method is used to get the created rule data from the admin
   * The merchant only has one rule with one member
   */
  async getCreatedRuleData(
    merchantId: string,
    ruleName: string
  ): Promise<{ id: number; requestBody: Record<string, any> } | null> {
    let id: number | null = null;
    let requestBody: Record<string, any> | null = null;
    await this.page.waitForRequest(
      async (request) => {
        const url = request.url();
        const method = request.method();
        const postData = request.postData();

        if (
          url.endsWith(`/routing/merchants/${merchantId}/rules`) &&
          method === 'POST' &&
          postData
        ) {
          requestBody = JSON.parse(postData);

          if (requestBody?.label !== ruleName) {
            return false;
          }

          const response = await request.response();
          const responseBody = await response?.json();
          id = responseBody.id;
          return true;
        }
        return false;
      },
      { timeout: 15000 }
    );

    if (id && requestBody) {
      return { id, requestBody };
    }
    return null;
  }

  /**
   * Reloads the routing page so the filter bar refetches its option catalog.
   * The catalog is cached with an infinite stale time and is not invalidated when a
   * rule is created, so a freshly created rule is not offered until the page reloads.
   */
  async reloadRoutingPage() {
    await this.page.reload();
    await expect(this.buttonAddFilter).toBeVisible();
  }

  /**
   * Filters the routing rules table by rule name using the multiselect combobox in the filter bar.
   * @param ruleName — Exact name of the rule to select.
   */
  async filterByRuleName(ruleName: string) {
    await expect(this.filterRuleNameTrigger).toBeVisible();
    await this.filterRuleNameTrigger.click();
    await this.filterOptions.filter({ hasText: ruleName }).first().click();
  }

  /**
   * Filters the routing rules table by payment processor name.
   * @param processorName — Name of the processor to filter by.
   */
  async filterByProcessor(processorName: string) {
    await expect(this.filterProcessorTrigger).toBeVisible();
    await this.filterProcessorTrigger.click();
    await this.filterOptions.filter({ hasText: processorName }).first().click();
  }

  /**
   * Opens the "Agregar filtro" picker, adds the metadata filter and fills its first key/value pair.
   */
  async filterByMetadata(key: string, value: string) {
    await expect(this.buttonAddFilter).toBeVisible();
    await this.buttonAddFilter.click();
    await this.chooserOptionMetadata.click();
    await this.buttonFilterBarChooserApply.click();
    await this.buttonFilterMetadata.click();
    await this.buttonAddMetadataPair.click();
    await this.inputFilterMetadataKey.fill(key);
    await this.inputFilterMetadataValue.fill(value);
  }

  /**
   * Clicks "Omitir" when the routing product tour appears for a first-time user; its overlay
   * intercepts pointer events, so the strategies screen is unusable until it is closed.
   * The tour only shows once per user, so the wait is bounded and its absence is not an error.
   */
  async skipRoutingTourIfShown() {
    const isTourShown = await this.buttonSkipTour
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (isTourShown) {
      await this.buttonSkipTour.click();
      await expect(this.buttonSkipTour).toBeHidden();
    }
  }

  /**
   * Asserts that the specific rule cannot be activated while no condition is configured
   * (the "Activar" button stays disabled). Used for negative tests.
   */
  async assertSaveBlockedWithNoConditions() {
    await expect(
      this.buttonActivatePaymentStrategy,
      'Activate button should be disabled when no conditions are configured'
    ).toBeDisabled();
  }
}
