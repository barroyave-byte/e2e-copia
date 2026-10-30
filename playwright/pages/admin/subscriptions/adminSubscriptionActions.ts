import { expect, type Locator, type Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELED: 'canceled',
} as const;

type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export class AdminSubscriptionActions extends CommonsActions {
  readonly dialogPauseSubscription: Locator;
  readonly dialogResumeSubscription: Locator;
  readonly dialogCancelSubscription: Locator;
  readonly pauseSubscriptionDialogSelectPolicy: Locator;
  readonly resumeSubscriptionDialogSelectPolicy: Locator;
  readonly cancelSubscriptionDialogSelectPolicy: Locator;
  readonly pauseSubscriptionDialogInputReason: Locator;
  readonly cancelSubscriptionDialogInputReason: Locator;
  readonly pauseSubscriptionDialogInputDate: Locator;
  readonly pauseSubscriptionDialogButtonConfirm: Locator;
  readonly resumeSubscriptionDialogButtonConfirm: Locator;
  readonly cancelSubscriptionDialogButtonConfirm: Locator;
  readonly resumeSubscriptionDialogInputDate: Locator;
  readonly cancelSubscriptionDialogInputDate: Locator;

  constructor(page: Page) {
    super(page);
    this.dialogPauseSubscription = page.getByTestId(
      'pause-subscription-dialog-section-content-dialog'
    );
    this.pauseSubscriptionDialogSelectPolicy = this.dialogPauseSubscription.getByTestId(
      'pause-subscription-dialog-select-policy'
    );
    this.pauseSubscriptionDialogInputReason = this.dialogPauseSubscription.getByTestId(
      'pause-subscription-dialog-input-reason'
    );
    this.pauseSubscriptionDialogInputDate = page.getByTestId(
      'pause-subscription-dialog-input-date-date-picker'
    );
    this.pauseSubscriptionDialogButtonConfirm = page.getByTestId(
      'pause-subscription-dialog-section-content-confirm-button'
    );
    // Resume subscription locators
    this.dialogResumeSubscription = page.getByTestId(
      'resume-subscription-dialog-section-content-dialog'
    );
    this.resumeSubscriptionDialogSelectPolicy = page.getByTestId(
      'resume-subscription-dialog-select-policy'
    );
    this.resumeSubscriptionDialogButtonConfirm = page.getByTestId(
      'resume-subscription-dialog-section-content-confirm-button'
    );
    this.resumeSubscriptionDialogInputDate = page.getByTestId(
      'resume-subscription-dialog-input-date-date-picker'
    );
    // Cancel subscription locators
    this.dialogCancelSubscription = page.getByTestId(
      'cancel-subscription-dialog-section-content-dialog'
    );
    this.cancelSubscriptionDialogSelectPolicy = this.dialogCancelSubscription.getByTestId(
      'cancel-subscription-dialog-select-policy'
    );
    this.cancelSubscriptionDialogInputReason = this.dialogCancelSubscription.getByTestId(
      'cancel-subscription-dialog-input-reason'
    );
    this.cancelSubscriptionDialogInputDate = this.dialogCancelSubscription.getByTestId(
      'cancel-subscription-dialog-input-date-date-picker'
    );
    this.cancelSubscriptionDialogButtonConfirm = this.dialogCancelSubscription.getByTestId(
      'cancel-subscription-dialog-section-content-confirm-button'
    );
  }

  //#region Pause Subscription
  async assertDialogPauseSubscription(): Promise<void> {
    await expect(this.dialogPauseSubscription).toBeVisible();
  }

  async fillPauseSubscriptionDialogForm({
    policyOption,
    reason = '',
    date,
  }: {
    policyOption: string;
    reason?: string;
    date?: Date;
  }): Promise<void> {
    await this.selectPolicyOption(
      policyOption,
      this.pauseSubscriptionDialogSelectPolicy,
      'pause-subscription-dialog-select-policy'
    );
    if (date) {
      await this.selectDateFromDatePickerFieldByLocators(
        this.pauseSubscriptionDialogInputDate,
        date
      );
    }
    await this.fillReasonInputField(reason);
  }

  async clickPauseButtonIntoDialog(): Promise<void> {
    await this.pauseSubscriptionDialogButtonConfirm.click();
  }

  async assertPauseSubscriptionDialogIsClosed(): Promise<void> {
    await expect
      .poll(() => this.dialogPauseSubscription.isVisible(), {
        intervals: [5000],
        timeout: 90000,
      })
      .toBe(false);
  }

  async assertSubscriptionIsPaused(): Promise<void> {
    await this.assertSubscriptionChipStatusIs(SUBSCRIPTION_STATUS.PAUSED);
  }

  async assertSubscriptionIsActive(): Promise<void> {
    await this.assertSubscriptionChipStatusIs(SUBSCRIPTION_STATUS.ACTIVE);
  }

  /**
   * @description Validates that the subscription status chip is visible
   *              on the subscription detail page by its data-testid.
   */
  async assertSubscriptionChipStatusIs(status: SubscriptionStatus): Promise<void> {
    const chipLocator = this.page.locator(
      `[data-testid^="subscription-detail-status-${status}-chip"]`
    );
    await expect(chipLocator).toBeVisible();
  }
  //#endregion

  //#region Resume Subscription
  async assertDialogResumeSubscription(): Promise<void> {
    await expect(this.dialogResumeSubscription).toBeVisible();
  }

  async fillResumeSubscriptionDialogForm({
    policyOption,
    date,
  }: {
    policyOption: string;
    date?: Date;
  }): Promise<void> {
    await this.selectPolicyOption(
      policyOption,
      this.resumeSubscriptionDialogSelectPolicy,
      'resume-subscription-dialog-select-policy'
    );
    if (date) {
      await this.selectDateFromDatePickerFieldByLocators(
        this.resumeSubscriptionDialogInputDate,
        date
      );
    }
  }

  async clickResumeButtonIntoDialog(): Promise<void> {
    await this.resumeSubscriptionDialogButtonConfirm.click();
  }

  async assertDialogResumeSubscriptionIsClosed(): Promise<void> {
    await expect(this.dialogResumeSubscription).not.toBeVisible();
  }
  //#endregion

  //#region Cancel Subscription
  async assertDialogCancelSubscription(): Promise<void> {
    await expect(this.dialogCancelSubscription).toBeVisible();
  }

  async fillCancelSubscriptionDialogForm({
    policyOption,
    reason = '',
    date,
  }: {
    policyOption: string;
    reason?: string;
    date?: Date;
  }): Promise<void> {
    await this.selectPolicyOption(
      policyOption,
      this.cancelSubscriptionDialogSelectPolicy,
      'cancel-subscription-dialog-select-policy'
    );
    if (date) {
      await this.selectDateFromDatePickerFieldByLocators(
        this.cancelSubscriptionDialogInputDate,
        date
      );
    }
    await this.fillCancelReasonInputField(reason);
  }

  async clickCancelButtonIntoDialog(): Promise<void> {
    await this.cancelSubscriptionDialogButtonConfirm.click();
  }

  async assertDialogCancelSubscriptionIsClosed(): Promise<void> {
    await expect(this.dialogCancelSubscription).not.toBeVisible();
  }

  async assertSubscriptionIsCanceled(): Promise<void> {
    await this.assertSubscriptionChipStatusIs(SUBSCRIPTION_STATUS.CANCELED);
  }
  //#endregion

  //#region Private methods
  private async selectPolicyOption(
    optionValue: string,
    locator: Locator,
    selectTestId: string
  ): Promise<void> {
    await this.assertIsVisible(locator);
    await this.click(locator);
    await this.click(this.page.getByTestId(`${selectTestId}-option-${optionValue}`));
  }

  private async fillReasonInputField(reason: string): Promise<void> {
    await expect(this.pauseSubscriptionDialogInputReason).toBeVisible();
    await this.pauseSubscriptionDialogInputReason.fill(reason);
  }

  private async fillCancelReasonInputField(reason: string): Promise<void> {
    await expect(this.cancelSubscriptionDialogInputReason).toBeVisible();
    await this.cancelSubscriptionDialogInputReason.fill(reason);
  }

  private async selectDateFromDatePickerFieldByLocators(
    locator: Locator,
    date: Date
  ): Promise<void> {
    await expect(locator).toBeVisible();
    await expect(locator).not.toBeDisabled();
    await locator.click();

    // Select the date from the date popover
    // Find all gridcell elements and click on the one that matches the target date
    const calendar = this.page.getByRole('grid');
    await expect(calendar).toBeVisible();
    const gridCells = calendar.getByRole('gridcell');
    const targetDay = date.getDate().toString();

    // Find the gridcell that contains the target day
    const targetGridCell = gridCells.filter({ hasText: targetDay }).last();
    await expect(targetGridCell).toBeVisible();
    await targetGridCell.click();
  }
  //#endregion
}
