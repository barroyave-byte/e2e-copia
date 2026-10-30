import { faker } from '@faker-js/faker';
import { CommonsActions } from '@pages/commonActions';
import { expect, type Locator, type Page } from '@playwright/test';
import { retryApiCall } from '@support/utils/retries';

export interface CreatePlanResponse {
  plan_id: string;
  currency: string;
}

export abstract class AdminSubscriptionsPlanPage extends CommonsActions {
  protected abstract readonly page: Page;

  private static readonly PLAN_NAME_COLUMN_SELECTOR =
    '[data-testid^="subscriptions-plans-table-column-name-"]';

  protected buttonTabPlans: Locator;
  protected tableHeaderPlanName: Locator;
  protected tableHeaderBillingAmount: Locator;
  protected tableHeaderCreatedAt: Locator;
  protected tableHeaderStatus: Locator;
  protected linkCreatePlan: Locator;

  // Form input selectors
  protected formInputPlanName: Locator;
  protected formInputPlanDescription: Locator;
  protected formInputGroupName: Locator;
  protected formInputCodePlan: Locator;
  protected formInputBillingAmount: Locator;

  // Form control selectors
  protected formComboboxPeriod: Locator;
  protected formRadioRenewalAuto: Locator;
  protected formRadioRenewalEnd: Locator;

  // Form layout and action selectors
  protected formLayoutCreatePlan: Locator;
  protected formButtonCreatePlan: Locator;

  // Alert selectors
  protected alertPlanCreated: Locator;

  constructor(page: Page) {
    super(page);

    this.tableHeaderPlanName = page
      .locator(AdminSubscriptionsPlanPage.PLAN_NAME_COLUMN_SELECTOR)
      .first();
    this.tableHeaderBillingAmount = page
      .locator('[data-testid^="subscriptions-plans-table-column-amount-"]')
      .first();
    this.tableHeaderCreatedAt = page
      .locator('[data-testid^="subscriptions-plans-table-column-created-at-"]')
      .first();
    this.tableHeaderStatus = page
      .locator('[data-testid^="subscriptions-plans-table-column-status-"]')
      .first();

    this.buttonTabPlans = page.getByTestId('subscriptions-filter-tab-plans');
    this.linkCreatePlan = page.getByTestId('subscriptions-create-plan-button');

    // Form input selectors initialization
    this.formInputPlanName = page.getByTestId('subscriptions-create-plan-input-name');
    this.formInputPlanDescription = page.getByTestId('subscriptions-create-plan-input-description');
    this.formInputGroupName = page.getByTestId('subscriptions-create-plan-input-plan-group');
    this.formInputCodePlan = page.getByTestId('subscriptions-create-plan-input-plan-code');
    this.formInputBillingAmount = page.getByTestId(
      'subscriptions-create-plan-input-billing-amount'
    );

    // Form control selectors initialization
    this.formComboboxPeriod = page.getByTestId('subscriptions-create-plan-combobox-period');
    this.formRadioRenewalAuto = page.getByTestId(
      'subscriptions-create-plan-radio-auto-renewal-automatic'
    );
    this.formRadioRenewalEnd = page.getByTestId(
      'subscriptions-create-plan-radio-auto-renewal-end-of-term'
    );

    // Form layout and action selectors initialization
    this.formLayoutCreatePlan = page.getByTestId('subscriptions-create-plan-layout');
    this.formButtonCreatePlan = page.getByTestId('subscriptions-create-plan-button');

    // Alert selectors initialization
    this.alertPlanCreated = page.getByTestId('subscriptions-created-plan-alert');
  }

  async clickTabPlans(): Promise<void> {
    await this.assertIsVisible(this.buttonTabPlans);
    await this.click(this.buttonTabPlans);
  }

  async assertPlanTable(): Promise<void> {
    await this.assertIsVisible(this.tableHeaderPlanName);
    await this.assertIsVisible(this.tableHeaderBillingAmount);
    await this.assertIsVisible(this.tableHeaderCreatedAt);
    await this.assertIsVisible(this.tableHeaderStatus);
  }

  async clickButtonCreatePlan(): Promise<void> {
    await this.assertIsVisible(this.linkCreatePlan);
    await expect(this.linkCreatePlan).toBeEnabled();
    await this.linkCreatePlan.click();
  }

  async assertCreatePlanPage(): Promise<void> {
    await expect(this.formLayoutCreatePlan).toBeVisible();
  }

  async assertCreatePlanForm(): Promise<void> {
    await expect(this.formInputPlanName, 'The plan name input is not visible').toBeVisible({
      timeout: 30_000,
    });
    await expect(this.formInputPlanName).toBeEnabled();
    await expect(this.formInputPlanName).toBeEditable();

    await expect(
      this.formInputPlanDescription,
      'The plan description input is not visible'
    ).toBeVisible({ timeout: 30_000 });
    await expect(this.formInputPlanDescription).toBeEnabled();
    await expect(this.formInputPlanDescription).toBeEditable();

    await expect(this.formInputGroupName, 'The plan group input is not visible').toBeVisible({
      timeout: 30_000,
    });
    await expect(this.formInputGroupName).toBeEnabled();
    await expect(this.formInputGroupName).toBeEditable();

    await expect(this.formInputCodePlan, 'The plan code input is not visible').toBeVisible({
      timeout: 30_000,
    });
    await expect(this.formInputCodePlan).toBeEnabled();
    await expect(this.formInputCodePlan).toBeEditable();

    await expect(this.formComboboxPeriod, 'The billing period combobox is not visible').toBeVisible(
      { timeout: 30_000 }
    );

    await expect(
      this.formRadioRenewalAuto,
      'The automatic renewal radio is not visible'
    ).toBeVisible({ timeout: 30_000 });
    await expect(this.formRadioRenewalAuto).toBeEnabled();
    await expect(
      this.formRadioRenewalEnd,
      'The end-of-term renewal radio is not visible'
    ).toBeVisible({ timeout: 30_000 });
    await expect(this.formRadioRenewalEnd).toBeEnabled();

    await expect(
      this.formInputBillingAmount,
      'The billing amount input is not visible'
    ).toBeVisible({ timeout: 30_000 });
    await expect(this.formInputBillingAmount).toBeEnabled();
    await expect(this.formInputBillingAmount).toBeEditable();
  }

  async fillCreatePlanForm(planName: string): Promise<void> {
    // Plan details
    await this.formInputPlanName.fill(planName);
    await this.formInputPlanDescription.fill(faker.word.words(3));
    await this.formInputGroupName.fill(faker.string.alphanumeric(10));
    await this.formInputCodePlan.fill(faker.string.alphanumeric(10));

    // Billing
    await this.selectOptionPeriod('MONTHLY');

    if (!(await this.formRadioRenewalAuto.isChecked())) {
      await this.formRadioRenewalAuto.click();
    }
    await expect(this.formRadioRenewalAuto).toBeChecked();

    // Billing amount
    const BILLING_AMOUNT = 1_000;
    await this.formInputBillingAmount.fill(BILLING_AMOUNT.toString());
    await expect(this.formInputBillingAmount).toHaveValue(BILLING_AMOUNT.toString());
  }

  async selectOptionPeriod(optionValue: string): Promise<void> {
    await this.formComboboxPeriod.click();
    await this.click(this.page.locator(`[data-testid$="-option-${optionValue}"]`));
  }

  async assertAndClickButtonCreatePlan(): Promise<void> {
    await expect(this.formButtonCreatePlan).toBeVisible();
    await expect(this.formButtonCreatePlan).toBeEnabled();
    await this.formButtonCreatePlan.click();
  }

  /**
   * @description Locator for the plans table row matching the given plan name,
   *              exposed so callers can build their own waits/retries on it.
   */
  getPlanRowByName(planName: string): Locator {
    return this.page
      .locator(AdminSubscriptionsPlanPage.PLAN_NAME_COLUMN_SELECTOR)
      .filter({ hasText: planName });
  }

  async assertPlanCreatedByTable(planName: string): Promise<void> {
    await expect(this.getPlanRowByName(planName)).toBeAttached();
  }

  async createPlan(planName: string): Promise<CreatePlanResponse> {
    let isFirstAttempt = true;

    // Navigate to plans tab on first attempt only
    await this.clickTabPlans();
    await this.assertPlanTable();
    await this.clickButtonCreatePlan();

    // Use retryApiCall to handle the creation logic with optimized retries
    return retryApiCall(
      async () => {
        // On retries, reload the page instead of navigating from scratch
        if (!isFirstAttempt) {
          await this.page.reload();
        }
        isFirstAttempt = false;

        await this.assertCreatePlanForm();
        await this.fillCreatePlanForm(planName);

        // Set up response interceptor before clicking the button
        const responsePromise = this.page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            response.url().includes('/subscriptions/plans')
        );

        await this.assertAndClickButtonCreatePlan();

        const responseData: CreatePlanResponse = await responsePromise.then((response) =>
          response.json()
        );

        await this.assertPlanCreatedByModal();
        await this.page.reload();
        await this.clickTabPlans();
        await this.assertPlanCreatedByTable(planName);

        return responseData;
      },
      (result) => result && result.plan_id !== undefined,
      8,
      5000
    );
  }

  async assertPlanCreatedByModal(): Promise<void> {
    await expect(this.alertPlanCreated).toBeVisible();
  }
}
