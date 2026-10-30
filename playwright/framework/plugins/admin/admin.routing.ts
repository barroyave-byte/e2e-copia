import { Context, FrameworkPlugin } from '../interface';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { RiskOption } from '@support/interfaces/riskOption';

export class PluginAdminRouting extends FrameworkPlugin {
  pluginBaseName = 'admin.routing';

  strategyPage!: AdminPaymentStrategyPage;
  specificRulesPage!: AdminSpecificRulesPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.strategyPage = new AdminPaymentStrategyPage(context.page);
    this.specificRulesPage = new AdminSpecificRulesPage(context.page);
  }

  /** @description Edits the default routing configuration by clicking the edit button and defining the processing order for the given processor(s). Optionally configures risk categories. */
  async $tf_editDefaultRouting(params: {
    processor: ConnectionsAvailable | ConnectionsAvailable[];
    configRisks?: RiskOption[];
  }) {
    const { processor, configRisks } = params;
    await this.strategyPage.editDefaultRouting(processor, configRisks);
  }

  /** @description Edits the default routing to configure multiple payment processors in sequence, saving and updating the configuration when done. */
  async $tf_editDefaultRoutingManyProcessor(params: { processors: ConnectionsAvailable[] }) {
    const { processors } = params;
    await this.strategyPage.editDefaultRoutingManyProcessor(processors);
  }

  /** @description Clicks the edit button on the default processing rule to enter edit mode. */
  async $tf_clickEditDefaultProcessing() {
    await this.strategyPage.clickEditDefaultProcessing();
  }

  /** @description Clicks the edit routing button within the default processing rule drawer. */
  async $tf_clickEditRouting() {
    await this.strategyPage.clickEditRouting();
  }

  /** @description Selects a payment processor from the default payment engine dropdown. */
  async $tf_selectDefaultPaymentEngine(params: { pspEngine: ConnectionsAvailable }) {
    const { pspEngine } = params;
    await this.strategyPage.selectDefaultPaymentEngine(pspEngine);
  }

  /** @description Selects a fraud engine from the processor dropdown. Optionally specify an index for multi-processor configurations. */
  async $tf_selectDefaultFraudEngine(params: {
    fraudEngine: ConnectionsAvailable;
    index?: number;
  }) {
    const { fraudEngine, index } = params;
    await this.strategyPage.selectDefaultFraudEngine(fraudEngine, index);
  }

  /** @description Selects a post-authorization fraud processor from the fraud engine dropdown. */
  async $tf_selectPostAuthFraudProcessor(params: { fraudEngine: ConnectionsAvailable }) {
    const { fraudEngine } = params;
    await this.strategyPage.selectPosthAuthFraudProcessor(fraudEngine);
  }

  /** @description Configures risk-level actions (process or decline) and associated processors for each provided risk level. */
  async $tf_selectRiskToProcess(params: { riskLevels: RiskOption[] }) {
    const { riskLevels } = params;
    await this.strategyPage.selectRiskToProcess(riskLevels);
  }

  /** @description Adds an additional payment processor to the routing by clicking the decline default option and selecting "to process". */
  async $tf_addPaymentProcessor() {
    await this.strategyPage.addPaymentProcessor();
  }

  /** @description Selects the last available payment processor from the processor dropdown and confirms with the "to process" action. */
  async $tf_selectLastPaymentProcessor() {
    await this.strategyPage.selectLastPaymentProcessor();
  }

  /** @description Configures routing for multiple processors sequentially, adding "Payment Processor" cascade entries between each. */
  async $tf_configureRoutingMultipleProcessors(params: { processors: ConnectionsAvailable[] }) {
    const { processors } = params;
    await this.strategyPage.configureRoutingMultipleProcessors(processors);
  }

  /** @description Adds a shadow mode member to the routing rule and selects the given fraud processor. */
  async $tf_addShadowMode(params: { fraudProcessorShadowMode: ConnectionsAvailable }) {
    const { fraudProcessorShadowMode } = params;
    await this.strategyPage.addShadowMode(fraudProcessorShadowMode);
  }

  /** @description Clicks the decline transaction button within a payment strategy configuration. */
  async $tf_declineTransactionForPaymentStrategy() {
    await this.strategyPage.declineTransactionForPaymentStrategy();
  }

  /** @description Clicks the update button to confirm changes to the default processing rule. */
  async $tf_clickUpdateDefaultProcessing() {
    await this.strategyPage.clickUpdateDefaultProcessing();
  }

  /** @description Clicks the create specific rule button to open the specific rule creation flow. */
  async $tf_createSpecificRule() {
    await this.strategyPage.createSpecificRule();
  }

  /** @description Fills in the rule name input (defaults to 'New rule 2025' if not provided) and advances to the next step of specific rule creation. */
  async $tf_firstStepSpecificRule(params?: { ruleName?: string }) {
    await this.strategyPage.firstStepSpecificRule(params?.ruleName);
  }

  /** @description Clicks the add condition button to open the condition type selector in the specific rule creation wizard. */
  async $tf_addConditionStepSpecificRule() {
    await this.strategyPage.addConditionStepSpecificRule();
  }

  /** @description Adds a BIN condition to a specific routing rule. Clicks the Bin option and fills in the 6-digit BIN code (e.g. "424242" for Visa test cards, "555555" for Mastercard test cards). Must be called after addConditionStepSpecificRule. */
  async $tf_addConditionBin(params: { bin: string }) {
    const { bin } = params;
    await this.strategyPage.addConditionBin(bin);
  }

  /** @description Adds a condition to a specific rule using a manually entered email list. Optionally use an incorrect email or a custom email address. */
  async $tf_addConditionManualEmailList(params?: { emailIncorrect?: boolean; email?: string }) {
    const { emailIncorrect, email } = params || {};
    await this.strategyPage.addConditionManualEmailList(emailIncorrect, email);
  }

  /** @description Adds a condition to a specific rule using a manually entered store code list with a given operator condition. */
  async $tf_addConditionManualStoreCodeList(params: { condition: string; stores: string }) {
    const { condition, stores } = params;
    await this.strategyPage.addConditionManualStoreCodeList(condition, stores);
  }

  /** @description Adds a condition to a specific rule by uploading a CSV file containing email addresses. */
  async $tf_addConditionCSVEmailList() {
    await this.strategyPage.addConditionCSVEmailList();
  }

  /** @description Advances to the routing step of the specific rule creation wizard. */
  async $tf_nextStepRouting() {
    await this.strategyPage.nextStepRouting();
  }

  /** @description Clicks the activate button so by this the rule is going to be active and saved. */
  async $tf_saveRule() {
    await this.strategyPage.saveRule();
  }

  /** @description Clicks the save rule button to persist the specific rule configuration, and the rule is going to be ready for save and activate. */
  async $tf_saveRouting() {
    await this.strategyPage.saveRouting();
  }

  /** @description Clicks the save rule button and waits for the routing rules API response to confirm the rule was created. */
  async $tf_saveRuleAndWaitForResponse() {
    await this.strategyPage.saveRuleAndWaitForResponse();
  }

  /** @description Asserts that the default rule label is visible in the rules list, confirming successful rule creation. */
  async $tf_validateRuleCreated() {
    await this.strategyPage.validateRuleCreated();
  }

  /** @description Asserts that a rule with the given name is visible in the rules list. */
  async $tf_validateCustomRuleCreated(params: { ruleName: string }) {
    const { ruleName } = params;
    await this.strategyPage.validateCustomRuleCreated(ruleName);
  }

  /** @description Opens the first specific rule, navigates to routing configuration, and toggles the CVV validation checkbox before saving. */
  async $tf_switchCvvValidationFromFirstRule() {
    await this.strategyPage.switchCvvValidationFromFirstRule();
  }

  /** @description Adds a metadata condition to a specific routing rule. Configures the variable name, format type (text or number), operator (eq or neq), and value. */
  async $tf_addConditionMetadata(params: {
    variableName: string;
    formatType?: 'text' | 'number';
    operator?: 'eq' | 'neq';
    value?: string;
  }) {
    const { variableName, formatType, operator, value } = params;
    await this.strategyPage.addConditionMetadata(variableName, { formatType, operator, value });
  }

  /** @description Reloads the routing page so the filter bar refetches its option catalog (a rule created in the same session is not offered until then). */
  async $tf_reloadRoutingPage() {
    await this.strategyPage.reloadRoutingPage();
  }

  /** @description Filters the routing rules table by rule name using the multiselect combobox in the filter bar. */
  async $tf_filterByRuleName(params: { ruleName: string }) {
    await this.strategyPage.filterByRuleName(params.ruleName);
  }

  /** @description Filters the routing rules table by payment processor name using the combobox in the filter bar. */
  async $tf_filterByProcessor(params: { processorName: string }) {
    await this.strategyPage.filterByProcessor(params.processorName);
  }

  /** @description Opens the 'Agregar filtro' picker, adds the metadata filter, applies it, and fills in the key and value of the first metadata pair. */
  async $tf_filterByMetadata(params: { key: string; value: string }) {
    await this.strategyPage.filterByMetadata(params.key, params.value);
  }

  /** @description Clicks "Omitir" on the routing product tour if it appears (first-time users), so the strategies screen is usable. Run right after navigating to routing. */
  async $tf_skipRoutingTourIfShown() {
    await this.strategyPage.skipRoutingTourIfShown();
  }

  /** @description Asserts that the save/activate button is disabled because no conditions are configured. */
  async $tf_assertSaveBlockedWithNoConditions() {
    await this.strategyPage.assertSaveBlockedWithNoConditions();
  }
}
