import type { Page } from '@playwright/test';
import { AUTH_MODE, LOGIN_LEGACY_LOCATORS } from '../constants';
import type { AuthMode } from '../types';

export async function detectLegacyScreen(page: Page, timeout: number): Promise<AuthMode | null> {
  try {
    await page
      .getByTestId(LOGIN_LEGACY_LOCATORS.LOGIN_FORM.LOGIN_FORM_DATA_TEST_ID)
      .waitFor({ state: 'visible', timeout });
    return AUTH_MODE.LEGACY;
  } catch (error) {
    return null;
  }
}
