import { expect, type Page } from '@playwright/test';
import { DATA_TEST_ID } from '@pages/admin/constants/strategy';

/** Opens the condition-type and operator dropdowns and picks the given options. Shared by every RuleCondition. */
export async function selectConditionTypeAndOperator(
  page: Page,
  conditionType: string,
  operator: string
): Promise<void> {
  const conditionSelector = page.getByTestId(DATA_TEST_ID.conditionTypeTrigger);
  await expect(conditionSelector).toBeVisible();
  await conditionSelector.click();
  await page.getByTestId(DATA_TEST_ID.conditionTypeOption(conditionType)).click();

  const operatorSelector = page.getByTestId(DATA_TEST_ID.conditionOperatorTrigger);
  await expect(operatorSelector).toBeVisible();
  await operatorSelector.click();
  await page.getByTestId(DATA_TEST_ID.conditionOperatorOption(operator)).click();
}
