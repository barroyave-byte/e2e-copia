import { expect, type Locator, type Page } from '@playwright/test';
import type { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import type { ShadowModeAuthorization } from '@support/interfaces/routingByPercentage';
import type { RiskLevel } from '@support/interfaces/routingConfig';
import { DATA_TEST_ID } from '@pages/admin/constants/strategy';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { SPECIFIC_RULE_SELECTORS } from './adminSpecificRulesPage';

export class AdminPaymentStrategyByPercentagePage extends AdminPaymentStrategyPage {
  readonly buttonAddSplit: Locator;

  readonly splitContainer: (splitIndex: number) => Locator;
  readonly riskContainer: (splitIndex: number, riskLevel: RiskLevel) => Locator;
  readonly inputSplitPercentage: (splitIndex: number) => Locator;
  readonly splitProcessorCardIndex: (splitIndex: number, index: number) => Locator;
  readonly splitFraudProcessorCardIndex: (splitIndex: number, index: number) => Locator;
  readonly splitSelectSoftDecline: (splitIndex: number, processorRowIndex: number) => Locator;
  readonly riskSelectSoftDecline: (
    splitIndex: number,
    riskLevel: RiskLevel,
    processorRowIndex: number
  ) => Locator;
  readonly riskProcessorCardIndex: (
    splitIndex: number,
    riskLevel: RiskLevel,
    processorRowIndex: number
  ) => Locator;
  readonly riskSoftDeclineSelect: (
    splitIndex: number,
    riskLevel: RiskLevel,
    index: number
  ) => Locator;
  readonly splitSwitchPostAuthorization: (splitIndex: number) => Locator;
  readonly splitPostAuthorizationProcessorCardIndex: (splitIndex: number, index: number) => Locator;
  readonly splitAddMemberShadowMode: (splitIndex: number) => Locator;
  readonly splitSelectMemberShadowMode: (splitIndex: number) => Locator;
  readonly splitPreAuthorizationShadowModeRadio: (splitIndex: number) => Locator;
  readonly splitPostAuthorizationShadowModeRadio: (splitIndex: number) => Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);

    this.buttonAddSplit = page.getByTestId(DATA_TEST_ID.addSplitButton);

    this.splitContainer = (splitIndex: number) =>
      page.getByTestId(DATA_TEST_ID.splitContainer(splitIndex));

    this.riskContainer = (splitIndex: number, riskLevel: RiskLevel) =>
      this.splitContainer(splitIndex).getByTestId(DATA_TEST_ID.riskContainer(riskLevel));

    this.inputSplitPercentage = (splitIndex: number) =>
      page.getByTestId(DATA_TEST_ID.splitPercentageInput(splitIndex));

    this.splitProcessorCardIndex = (splitIndex: number, index: number) =>
      this.splitContainer(splitIndex).getByTestId(
        SPECIFIC_RULE_SELECTORS.PROCESSOR_CARD_INDEX(index)
      );

    // TODO(migration): needs interrogation, see DATA_TEST_ID.fraudProcessorCardIndex.
    this.splitFraudProcessorCardIndex = (splitIndex: number, index: number) =>
      this.splitContainer(splitIndex).getByTestId(DATA_TEST_ID.fraudProcessorCardIndex(index));

    // TODO(migration): needs interrogation, see SPECIFIC_RULE_SELECTORS.SELECTOR_ROUTING_STRATEGY.
    this.splitSelectSoftDecline = (splitIndex: number, processorRowIndex: number) =>
      this.splitContainer(splitIndex)
        .getByTestId(SPECIFIC_RULE_SELECTORS.SELECTOR_ROUTING_STRATEGY)
        .nth(processorRowIndex);

    // TODO(migration): needs interrogation, see SPECIFIC_RULE_SELECTORS.SELECTOR_ROUTING_STRATEGY.
    this.riskSelectSoftDecline = (
      splitIndex: number,
      riskLevel: RiskLevel,
      processorRowIndex: number
    ) =>
      this.riskContainer(splitIndex, riskLevel)
        .getByTestId(SPECIFIC_RULE_SELECTORS.SELECTOR_ROUTING_STRATEGY)
        .nth(processorRowIndex);

    this.riskProcessorCardIndex = (
      splitIndex: number,
      riskLevel: RiskLevel,
      processorRowIndex: number
    ) =>
      this.riskContainer(splitIndex, riskLevel).getByTestId(
        DATA_TEST_ID.riskProcessorCardIndex(riskLevel, processorRowIndex)
      );

    // TODO(migration): needs interrogation, see DATA_TEST_ID.riskSoftDeclineSelect.
    this.riskSoftDeclineSelect = (splitIndex: number, riskLevel: RiskLevel, index: number) =>
      this.riskContainer(splitIndex, riskLevel).locator(
        `#${DATA_TEST_ID.riskSoftDeclineSelect(riskLevel, index)}`
      );

    this.splitSwitchPostAuthorization = (splitIndex: number) =>
      this.splitContainer(splitIndex).getByTestId(DATA_TEST_ID.switchPostAuthorization);

    this.splitPostAuthorizationProcessorCardIndex = (splitIndex: number, index: number) =>
      this.splitContainer(splitIndex).getByTestId(
        DATA_TEST_ID.postAuthorizationProcessorCardIndex(index)
      );

    this.splitAddMemberShadowMode = (splitIndex: number) =>
      this.splitContainer(splitIndex).getByTestId(DATA_TEST_ID.shadowModeSwitch);

    this.splitSelectMemberShadowMode = (splitIndex: number) =>
      this.splitContainer(splitIndex).getByTestId(
        SPECIFIC_RULE_SELECTORS.SHADOW_MODE_SELECT_MEMBER
      );

    this.splitPreAuthorizationShadowModeRadio = (splitIndex: number) =>
      this.splitContainer(splitIndex).getByTestId(
        SPECIFIC_RULE_SELECTORS.SHADOW_MODE_PRE_AUTH_RADIO
      );

    this.splitPostAuthorizationShadowModeRadio = (splitIndex: number) =>
      this.splitContainer(splitIndex).getByTestId(DATA_TEST_ID.postAuthorizationShadowModeRadio);
  }

  async addRoutingSplit(): Promise<void> {
    await this.ensureVisibleToClick(this.buttonAddSplit);
  }

  async setRoutingSplitPercentage(splitIndex: number, percentage: number): Promise<void> {
    const input = this.inputSplitPercentage(splitIndex);
    await expect(input).toBeVisible();
    await input.fill(String(percentage));
    await expect(input).toHaveValue(String(percentage));
  }

  async selectSplitRootProcessor(
    splitIndex: number,
    processor: ConnectionsAvailable
  ): Promise<void> {
    await this.selectProcessorOption(this.splitProcessorCardIndex(splitIndex, 0), processor);
  }

  async addPaymentCascadeToSplit(splitIndex: number, processorRowIndex: number): Promise<void> {
    await expect(this.splitProcessorCardIndex(splitIndex, processorRowIndex + 1)).toBeVisible();
  }

  async addFraudCascadeToSplit(splitIndex: number, processorRowIndex: number): Promise<void> {
    await this.splitSelectSoftDecline(splitIndex, processorRowIndex).click();
    await this.ensureVisibleToClick(this.optionStrategyToFraud);
  }

  async selectSplitPaymentProcessor(
    splitIndex: number,
    processorRowIndex: number,
    processor: ConnectionsAvailable
  ): Promise<void> {
    await this.selectProcessorOption(
      this.splitProcessorCardIndex(splitIndex, processorRowIndex),
      processor
    );
  }

  async selectSplitFraudProcessor(
    splitIndex: number,
    processor: ConnectionsAvailable
  ): Promise<void> {
    await this.selectProcessorOption(this.splitFraudProcessorCardIndex(splitIndex, 0), processor);
    await expect(this.splitFraudProcessorCardIndex(splitIndex, 0)).toBeVisible();
  }

  async setSplitRiskToProcess(splitIndex: number, riskLevel: RiskLevel): Promise<void> {
    await this.riskSoftDeclineSelect(splitIndex, riskLevel, 0).click();
    await this.ensureVisibleToClick(this.optionStrategyToProcess);
  }

  async addSplitRiskProcessorCascade(
    splitIndex: number,
    riskLevel: RiskLevel,
    processorRowIndex: number
  ): Promise<void> {
    await this.riskSelectSoftDecline(splitIndex, riskLevel, processorRowIndex).click();
    await this.ensureVisibleToClick(this.optionStrategyToProcess);
  }

  async selectSplitRiskProcessor(
    splitIndex: number,
    riskLevel: RiskLevel,
    processorRowIndex: number,
    processor: ConnectionsAvailable
  ): Promise<void> {
    await this.selectProcessorOption(
      this.riskProcessorCardIndex(splitIndex, riskLevel, processorRowIndex),
      processor
    );
  }

  async enableSplitPostAuthorization(
    splitIndex: number,
    fraudProcessor: ConnectionsAvailable
  ): Promise<void> {
    await this.splitSwitchPostAuthorization(splitIndex).click();
    await this.selectProcessorOption(
      this.splitPostAuthorizationProcessorCardIndex(splitIndex, 0),
      fraudProcessor
    );
  }

  async addSplitShadowMode(
    splitIndex: number,
    fraudProcessor: ConnectionsAvailable,
    authorization: ShadowModeAuthorization = 'pre'
  ): Promise<void> {
    await this.splitAddMemberShadowMode(splitIndex).click();
    await this.selectProcessorOption(this.splitSelectMemberShadowMode(splitIndex), fraudProcessor);

    const authorizationRadio =
      authorization === 'post'
        ? this.splitPostAuthorizationShadowModeRadio(splitIndex)
        : this.splitPreAuthorizationShadowModeRadio(splitIndex);

    await authorizationRadio.click();
  }

  async saveEditedRoutingRule(): Promise<void> {
    await this.clickUpdateDefaultProcessing();
  }
}
