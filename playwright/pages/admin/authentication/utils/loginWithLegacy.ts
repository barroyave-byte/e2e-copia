import type { Page } from '@playwright/test';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';
import envConfig from '@support/envConfig';
import { LOGIN_LEGACY_LOCATORS } from '../constants';
import type { AdminCredentials } from '../types';

export async function loginWithLegacy(
  page: Page,
  credentials: AdminCredentials = ADMIN_CREDENTIALS
) {
  await page.getByTestId(LOGIN_LEGACY_LOCATORS.LOGIN_FORM.EMAIL_INPUT_DATA_TEST_ID).fill(credentials.email);
  await page.getByTestId(LOGIN_LEGACY_LOCATORS.LOGIN_FORM.PASSWORD_INPUT_DATA_TEST_ID).fill(credentials.password);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');

  await page.waitForURL(`${envConfig.ADMIN_URL}/orders`);
  await page.waitForTimeout(1000);
}
