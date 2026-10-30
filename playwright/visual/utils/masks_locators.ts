import { Page } from '@playwright/test';

export const getExplorerHeaderLocator = (page: Page) =>
  page.locator('svg#menu_button').locator('..').locator('..');
