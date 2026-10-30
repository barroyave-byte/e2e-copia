import { Page } from '@playwright/test';
export interface RuleCondition {
  configureCondition(page: Page, data: any): Promise<void>;
}
