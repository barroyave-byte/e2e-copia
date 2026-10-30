import { CommonsActions } from '@pages/commonActions';
import { expect, type Locator, type Page } from '@playwright/test';
import { ConditionFactory } from '@pages/admin/rules/conditionFactory';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import { ConditionDataMap } from '@support/interfaces/ruleConditions';
import { DATA_TEST_ID } from '@pages/admin/constants/strategy';

export const SPECIFIC_RULE_SELECTORS = {
  BUTTON_CREATE_SPECIFIC_RULE: 'create_specific_rule',
  BUTTON_CREATE_SPECIFIC_RULE_APM: 'strategy-specific-rule-button-create',
  FORM_INPUT_NAME_RULE: 'input_name_rule',
  BUTTON_ADD_CONDITION: 'add-condition',
  // Baja: unused anywhere in e2e-testing (dead constant, not a broken-test risk) — and
  // repo-wide grep in admin-ff finds no binding either. Candidate for removal.
  BUTTON_CREATE_ROUTING: 'specific-rule-create-dynamic-route',
  // TODO(migration): zero admin-ff bindings found for this string or for
  // 'add-dynamic-route-select-option-*' (repo-wide grep). ItemProcessorFraudRisk now
  // drives risk-row selection through RowProvider/onSelectRoutingMember, which looks
  // like the same payment-selector-listbox pattern used elsewhere in this page —
  // needs interrogation (live DOM check) before remapping, not a mechanical rename.
  SELECTOR_ROUTING_STRATEGY: 'specific-rule-select-soft-decline',
  BUTTON_PENDING_LOAD_FILE_CONFIRM_BUTTON: 'specific-rule-pending-load-file-confirm-button',
  PROCESSOR_CARD_INDEX: (index: number) => `specific-rule-processor-card-index-${index}`,
  // TODO(migration): needs interrogation, see SELECTOR_ROUTING_STRATEGY above — same
  // orphaned flow (zero admin-ff bindings for 'add-dynamic-route-select-option-*').
  ADD_DYNAMIC_ROUTE_SELECT_DECLINE: 'specific-rule-add-dynamic-route-select-option-2',
  TABLE_DROPDOWN_OPTION_EDIT: 'strategy-specific-rule-apm-dropdown-option-edit',
  // TODO(migration): zero admin-ff bindings found repo-wide. Consumed by
  // adminPaymentStrategyPage.ts's buttonEditTransactionProcessingOrderEditRouting /
  // clickEditRouting — will fail at runtime. Needs interrogation.
  EDIT_DYNAMIC_ROUTE: 'specific-rule-edit-dynamic-route',
  SHADOW_MODE_SELECT_MEMBER: 'specific-rule-shadow-mode-select-member',
  SHADOW_MODE_PRE_AUTH_RADIO: 'specific-rule-shadow-mode-pre-authorization-radio',
} as const;

export class AdminSpecificRulesPage extends CommonsActions {
  protected page: Page;
  readonly buttonCreateSpecificRule: Locator;
  readonly buttonCreateSpecificRuleApm: Locator;
  readonly inputSpecificRuleName: Locator;
  readonly buttonNextStep: Locator;
  readonly buttonNextStepRouting: Locator;
  readonly buttonAddCondition: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.buttonCreateSpecificRule = page.getByTestId(
      SPECIFIC_RULE_SELECTORS.BUTTON_CREATE_SPECIFIC_RULE
    );
    this.buttonCreateSpecificRuleApm = page.getByTestId(
      SPECIFIC_RULE_SELECTORS.BUTTON_CREATE_SPECIFIC_RULE_APM
    );
    this.inputSpecificRuleName = page.getByTestId(SPECIFIC_RULE_SELECTORS.FORM_INPUT_NAME_RULE);
    this.buttonNextStep = page.getByTestId(SPECIFIC_RULE_SELECTORS.BUTTON_ADD_CONDITION);
    this.buttonNextStepRouting = page.getByTestId(
      DATA_TEST_ID.processingTypeOption('dynamic_route')
    );
    this.buttonAddCondition = page.getByTestId(SPECIFIC_RULE_SELECTORS.BUTTON_ADD_CONDITION);
  }

  async clickCreateSpecificRule(isApm = false) {
    const createRuleButton = isApm
      ? this.buttonCreateSpecificRuleApm
      : this.buttonCreateSpecificRule;
    await this.ensureVisibleToClick(createRuleButton);
  }

  async enterSpecificRuleName(name: string) {
    await expect(this.inputSpecificRuleName).toBeVisible();
    await this.inputSpecificRuleName.fill(name);
  }

  async clickNextToAddCondition() {
    await expect(this.buttonNextStep).toBeVisible();
  }

  async clickNextToConfigRouting() {
    await this.ensureVisibleToClick(this.buttonNextStepRouting);
  }

  async clickAddCondition() {
    await this.ensureVisibleToClick(this.buttonAddCondition);
  }

  async addConditionToSpecificRule<C extends RuleConditions>(
    condition: C,
    data: ConditionDataMap[C]
  ) {
    await this.clickAddCondition();
    const conditionStrategy = ConditionFactory.getConditionStrategy(condition);
    await conditionStrategy.configureCondition(this.page, data);
  }

  async clickOnCreateRuleAndEnterName(ruleName?: string, isApm = false) {
    await this.clickCreateSpecificRule(isApm);
    await this.enterSpecificRuleName(ruleName || 'Regla de prueba');
    await this.clickNextToAddCondition();
  }

  async addConditionsToSpecificRule(
    conditions: { condition: RuleConditions; data: ConditionDataMap[RuleConditions] }[],
    ruleName?: string,
    isApm = false,
    isOmitCreateButton?: boolean
  ) {
    if (!isOmitCreateButton) {
      await this.clickOnCreateRuleAndEnterName(ruleName, isApm);
    }
    for (const { condition, data } of conditions) {
      await this.addConditionToSpecificRule(condition, data);
    }
    await this.clickNextToConfigRouting();
  }
}
