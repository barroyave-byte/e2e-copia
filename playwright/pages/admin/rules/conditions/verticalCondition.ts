import { RuleCondition } from '@pages/admin/rules/ruleCondition';
import { selectConditionTypeAndOperator } from '@pages/admin/rules/conditions/selectConditionTypeAndOperator';
import { DATA_TEST_ID } from '@pages/admin/constants/strategy';
import { VerticalConditionData } from '@support/interfaces/ruleConditions';
import { expect, type Page } from '@playwright/test';

export class VerticalCondition implements RuleCondition {
  async configureCondition(page: Page, data: VerticalConditionData): Promise<void> {
    await selectConditionTypeAndOperator(page, 'market_type', 'eq');

    // market_type/channel_type conditions now render a free-text operand input
    // (MarketTypeRuleEditor), not a value combobox — confirmed live (ADM-T661).
    const valueInput = page.getByTestId(DATA_TEST_ID.conditionOperandInput('market_type'));
    await expect(valueInput).toBeVisible();
    await valueInput.fill(data.vertical);
  }
}
