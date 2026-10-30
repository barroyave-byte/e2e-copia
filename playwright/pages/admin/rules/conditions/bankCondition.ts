import { RuleCondition } from '@pages/admin/rules/ruleCondition';
import { Page } from '@playwright/test';
import { Banks } from '@support/interfaces/ruleConditions';

export class BankCondition implements RuleCondition {
  async configureCondition(page: Page, bankName: Banks): Promise<void> {
    await page
      .locator('div')
      .filter({ hasText: /^Banco$/ })
      .first()
      .click();
    await page
      .locator('li')
      .filter({ hasText: `${bankName}` })
      .getByRole('checkbox')
      .check();
  }
}
