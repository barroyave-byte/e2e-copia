import { expect, type Page } from '@playwright/test';
import { RuleCondition } from '@pages/admin/rules/ruleCondition';
import { selectConditionTypeAndOperator } from '@pages/admin/rules/conditions/selectConditionTypeAndOperator';
import { DATA_TEST_ID } from '@pages/admin/constants/strategy';
import { CardTypes } from '@support/interfaces/ruleConditions';

export class CardTypeCondition implements RuleCondition {
  async configureCondition(page: Page, cardType: CardTypes): Promise<void> {
    await selectConditionTypeAndOperator(page, 'method_type', 'eq');

    // method_type now renders the generic inline value MultiSelect
    // (InlineConditionValue), not a checkbox list — confirmed live (ADM-T658).
    const valueTrigger = page.getByTestId(DATA_TEST_ID.conditionValueTrigger);
    await expect(valueTrigger).toBeEnabled();
    await valueTrigger.click();
    await page.getByTestId(DATA_TEST_ID.conditionValueOption(cardType)).click();
  }
}
