import type { Page } from '@playwright/test';
import envConfig from '@support/envConfig';
import { AUTH0_LOGIN_SCREEN, AUTH0_LOCATORS } from '../constants';
import type { Auth0LoginScreen } from '../types';

export async function detectAuth0LoginScreen(
  page: Page,
  timeoutMs = 10_000
): Promise<Auth0LoginScreen> {
  const result = await Promise.race([
    page
      .getByText(AUTH0_LOCATORS.ORG_PICKER.TITLE_TEXT)
      .waitFor({ state: 'visible', timeout: timeoutMs })
      .then(() => AUTH0_LOGIN_SCREEN.ORG_PICKER),
    page
      .locator(AUTH0_LOCATORS.MFA_CHALLENGE.OTP_INPUT)
      .first()
      .waitFor({ state: 'visible', timeout: timeoutMs })
      .then(() => AUTH0_LOGIN_SCREEN.OTP_SCREEN),
    page
      .waitForURL(`${envConfig.ADMIN_URL}/**`, { timeout: timeoutMs })
      .then(() => AUTH0_LOGIN_SCREEN.REDIRECTED),
  ]).catch(() => AUTH0_LOGIN_SCREEN.TIMEOUT);

  if (result !== AUTH0_LOGIN_SCREEN.OTP_SCREEN) {
    return result;
  }

  return AUTH0_LOGIN_SCREEN.MFA_CHALLENGE;
}
