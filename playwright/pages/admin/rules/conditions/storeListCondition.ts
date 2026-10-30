import { RuleCondition } from '@pages/admin/rules/ruleCondition';
import { selectConditionTypeAndOperator } from '@pages/admin/rules/conditions/selectConditionTypeAndOperator';
import { DATA_TEST_ID } from '@pages/admin/constants/strategy';
import { StoreListConditionData } from '@support/interfaces/ruleConditions';
import { expect, type Page } from '@playwright/test';

export class StoreListCondition implements RuleCondition {
  async configureCondition(page: Page, data: StoreListConditionData): Promise<void> {
    await selectConditionTypeAndOperator(page, 'store_id_list', data.condition);

    await page.getByTestId(DATA_TEST_ID.conditionListNameInput).fill(data.storeListName);
    const valuesInput = page.getByTestId(DATA_TEST_ID.conditionListValuesInput);
    await valuesInput.fill(data.stores);
    await valuesInput.press('Enter');

    const saveListButton = page.getByTestId(DATA_TEST_ID.conditionListSaveButton);
    await expect(saveListButton).toBeEnabled();
    const saveListResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/routing\/v2\/merchants\/[^/]+\/lists$/.test(response.url()) &&
        response.ok()
    );
    await saveListButton.click();
    await saveListResponse;
    await expect(saveListButton).toBeVisible();
  }
}
