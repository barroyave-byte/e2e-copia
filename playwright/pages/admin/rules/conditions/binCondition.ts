import { RuleCondition } from '@pages/admin/rules/ruleCondition';
import { Page } from '@playwright/test';
import { Banks } from '@support/interfaces/ruleConditions';

// TODO - Add the actions to configure the condition in the page
export class BinCondition implements RuleCondition {
  async configureCondition(page: Page, bin: string): Promise<void> {
    await page.locator('li').filter({ hasText: 'Bin' }).click();
    await page.locator("input[name='bin']").fill(bin);
  }
}
