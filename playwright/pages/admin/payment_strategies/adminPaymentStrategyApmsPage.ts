import { expect, type Locator, type Page } from '@playwright/test';
import type { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { DATA_TEST_ID } from '@pages/admin/constants/strategy';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

export class AdminPaymentStrategyApmsPage extends AdminPaymentStrategyPage {
  readonly buttonSaveRule: Locator;
  readonly selectAPMTab: Locator;
  readonly buttonCreateAPMDefaultRule: Locator;
  readonly buttonSelectFraudProcessor: Locator;
  readonly fraudNotFoundAlert: Locator;
  readonly itemResumeAPM: Locator;
  readonly dropDownActions: Locator;
  readonly dropDownActionsEdit: Locator;
  readonly dropDownActionsDeactive: Locator;
  readonly modalDisableRuleAPM: Locator;
  readonly dropDownActionsEditSpecificRule: Locator;
  readonly dropDownActionsDeactiveSpecificRule: Locator;
  readonly tabDisableRule: Locator;
  readonly specificRuleTableRows: Locator;
  readonly getApmMerchantProcessorItem: (merchantPaymentProcessorId: string) => Locator;
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);
    this.buttonSaveRule = page.getByTestId('default-rule-button-save');
    this.selectAPMTab = this.page.getByTestId(DATA_TEST_ID.filterTabApm);
    this.buttonCreateAPMDefaultRule = this.page.getByTestId(DATA_TEST_ID.defaultRuleCreate);
    this.buttonSelectFraudProcessor = this.page.getByTestId('specific-rule-processor-card-index-0');
    this.fraudNotFoundAlert = this.page.getByTestId('specific-rule-apms-fraud-not-found-alert');
    this.itemResumeAPM = this.page.locator('[data-testid^="strategy-default-rule-table-row-"]');
    this.dropDownActions = this.page.getByTestId(DATA_TEST_ID.specificRuleTableActionsTrigger);
    this.dropDownActionsEdit = this.page.getByTestId(
      'strategy-default-rule-apm-dropdown-option-edit'
    );
    this.dropDownActionsDeactive = this.page.getByTestId(
      'strategy-default-rule-apm-dropdown-option-deactivate'
    );
    this.dropDownActionsEditSpecificRule = this.page.getByTestId(
      'strategy-specific-rule-apm-dropdown-option-edit'
    );
    this.dropDownActionsDeactiveSpecificRule = this.page.getByTestId(
      'strategy-specific-rule-apm-dropdown-option-deactivate'
    );
    // The deactivate-confirm dialog now exposes a stable data-testid via
    // AlternativePaymentTab's `dataTestIdScope` (confirmed live: previously it had
    // none at all — the old `[data-slot="dialog-content"]` attribute selector never
    // matched anything real).
    this.modalDisableRuleAPM = page.getByTestId(DATA_TEST_ID.deactivateRuleModalDialog);
    this.tabDisableRule = this.page.getByTestId('strategy-filter-tab-disabled');
    this.specificRuleTableRows = this.page.locator(
      `[data-testid^="${DATA_TEST_ID.specificRuleTable}-row-"]`
    );
    this.getApmMerchantProcessorItem = (merchantPaymentProcessorId: string) =>
      this.page.getByTestId(
        `strategy-routing-processor-option-payment-${merchantPaymentProcessorId}`
      );
  }

  async clickSaveAPMRule() {
    await expect(this.buttonSaveRule).toBeVisible();
    await expect(this.buttonSaveRule).toBeEnabled();

    // Editing an existing default rule PUTs to /rules/{ruleId}; creating one POSTs to
    // the bare /rules collection. Match both (confirmed live, ADM-T737: the edit flow's
    // PUT was never matched, so the wait hung until the 240s test timeout).
    const saveResponse = this.page.waitForResponse(
      (response) =>
        /\/routing\/merchants\/[^/]+\/rules(\/[^/]+)?$/.test(response.url()) &&
        (response.request().method() === 'POST' || response.request().method() === 'PUT') &&
        response.ok(),
      { timeout: 30000 }
    );

    await this.buttonSaveRule.click();
    await saveResponse;
  }

  async saveAPMRuleAndWaitForResponse() {
    await expect(this.buttonActivatePaymentStrategy).toBeVisible();

    const urlRe = /\/routing\/merchants\/[^/]*\/rules(\/|$)/;

    const waitPost = this.page.waitForResponse(
      (res) =>
        (urlRe.test(res.url()) && res.request().method() === 'POST') ||
        (res.request().method() === 'PUT' && res.status() >= 200 && res.status() < 300),
      { timeout: 30000 }
    );

    await Promise.all([waitPost, this.buttonActivatePaymentStrategy.click()]);
  }

  async selectAlternativePaymentMethodTab() {
    await expect(this.selectAPMTab).toBeVisible();
    await this.selectAPMTab.click();
  }

  async openAddCascadeApmProcessorSelector(isWidthFraud?: boolean) {
    void isWidthFraud;
    await expect(this.buttonSelectFraudProcessor).toBeVisible();
    await this.buttonSelectFraudProcessor.click();
  }

  async createDefaultAPMRule(isWidthFraud?: boolean) {
    await expect(this.buttonCreateAPMDefaultRule).toBeVisible();
    await this.buttonCreateAPMDefaultRule.click();
    if (isWidthFraud) {
      await this.selectProcessorOption(
        this.buttonSelectFraudProcessor,
        ConnectionsAvailable.cybersourceFraud
      );
      const firstRiskProcessor = this.page
        .locator('[data-testid^="specific-rule-risk-"][data-testid$="-processor-card-index-0"]')
        .first();
      await this.selectProcessorOption(firstRiskProcessor, ConnectionsAvailable.paypal);
    } else {
      await this.ensureVisibleToClick(this.buttonSelectFraudProcessor);
      const listbox = await this.getPaymentSelectorListbox(this.buttonSelectFraudProcessor);
      await expect(listbox).toBeVisible();
      await listbox.locator('[data-testid^="strategy-routing-processor-option-"]').first().click();
    }
    await this.clickSaveAPMRule();
  }

  async createDefaultFraudAPMRule(processor: ConnectionsAvailable) {
    await expect(this.buttonCreateAPMDefaultRule).toBeVisible();
    await this.buttonCreateAPMDefaultRule.click();
    await this.selectProcessorOption(this.buttonSelectFraudProcessor, processor);
  }

  async verifyFraudNotFoundAlert() {
    await expect(this.fraudNotFoundAlert).toBeVisible();
  }

  getAvailableApmMerchantProcessorItems(): Locator {
    return this.page.locator('[data-testid^="strategy-routing-processor-option-"]');
  }

  async openDrawerEditAPMDefaultRule() {
    await expect(this.dropDownActions.first()).toBeVisible();
    await this.dropDownActions.first().click();
    await expect(this.dropDownActionsEdit).toBeVisible();
    await this.dropDownActionsEdit.click();
  }

  async openDrawerEditAPMSpecificRule() {
    const specificRuleDropdown = this.specificRuleTableRows
      .last()
      .getByTestId(DATA_TEST_ID.specificRuleTableActionsTrigger);

    await expect(specificRuleDropdown).toBeVisible();
    await specificRuleDropdown.click();

    await expect(this.dropDownActionsEditSpecificRule).toBeVisible();

    const waitRuleDetail = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/rules') &&
        response.status() === 200,
      { timeout: 15000 }
    );

    await this.dropDownActionsEditSpecificRule.click();
    await waitRuleDetail;

    await expect(this.page.getByTestId('ssot-image-Aplazo')).toBeVisible();
  }

  async editDefaultAPMRule(options?: {
    merchantPaymentProcessorId?: string;
    isSpecificRule?: boolean;
  }) {
    const { merchantPaymentProcessorId, isSpecificRule = false } = options ?? {};

    await this.openAddCascadeApmProcessorSelector();

    if (merchantPaymentProcessorId) {
      const apmMerchantProcessorItem = this.getApmMerchantProcessorItem(merchantPaymentProcessorId);
      await expect(apmMerchantProcessorItem).toBeVisible();
      await apmMerchantProcessorItem.click();
    } else {
      const availableApmMerchantProcessorItems = this.getAvailableApmMerchantProcessorItems();
      await expect(availableApmMerchantProcessorItems.first()).toBeVisible();
      await availableApmMerchantProcessorItems.first().click();
    }

    if (!isSpecificRule) {
      await this.clickSaveAPMRule();
    }
  }

  async disableDefaultAPMRule() {
    await expect(this.dropDownActions.first()).toBeVisible();
    await this.dropDownActions.first().click();
    await expect(this.dropDownActionsDeactive).toBeVisible();
    await this.dropDownActionsDeactive.click();
    await expect(this.modalDisableRuleAPM).toBeVisible();
    await this.page.getByTestId(DATA_TEST_ID.deactivateRuleModalConfirmButton).click();
  }

  async disableSpecificRule() {
    const specificRuleDropdown = this.specificRuleTableRows
      .last()
      .getByTestId(DATA_TEST_ID.specificRuleTableActionsTrigger);

    await expect(specificRuleDropdown).toBeVisible();
    await specificRuleDropdown.click();

    await expect(this.dropDownActionsDeactiveSpecificRule).toBeVisible();
    await this.dropDownActionsDeactiveSpecificRule.click();
    await expect(this.modalDisableRuleAPM).toBeVisible();
    await this.page.getByTestId(DATA_TEST_ID.deactivateRuleModalConfirmButton).click();
  }

  async verifyDisableSpecificRule() {
    await expect(this.tabDisableRule).toBeVisible();
    await this.tabDisableRule.click();
    await expect(
      this.specificRuleTableRows,
      'Expected exactly one disabled specific rule row'
    ).toHaveCount(1, { timeout: 30000 });
  }

  async verifyDefaultAPMRuleCreated() {
    await expect(this.itemResumeAPM.first()).toBeVisible();
  }

  async verifyDefaultAPMRuleDisabled() {
    await expect(this.itemResumeAPM.first()).not.toBeVisible();
  }

  async verifyDefaultAPMRuleEdited(customProcessorName: string) {
    await expect(this.itemResumeAPM.first()).toContainText(customProcessorName);
  }
}
