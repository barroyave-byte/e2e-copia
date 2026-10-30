import type { Page } from '@playwright/test';
import { loginWithAuth0 } from '@pages/admin/authentication/utils/loginWithAuth0';
import { loginWithLegacy } from '@pages/admin/authentication/utils/loginWithLegacy';
import { detectAuth0Screen } from '@pages/admin/authentication/utils/detectAuth0Screen';
import { detectLegacyScreen } from '@pages/admin/authentication/utils/detectLegacyScreen';
import { AUTH_FILE_PATH } from '@support/constants/authFile';
import envConfig from '@support/envConfig';

import { AUTH_MODE, LOGIN_SCREEN_DETECTION_TIMEOUT } from './constants';
import type { AdminCredentials, AuthMode } from './types';
import { buildAdminLoginUrl } from './utils/buildAdminLoginUrl';

export async function adminAuthenticate(
  page: Page,
  authMode?: AuthMode,
  credentials?: AdminCredentials,
  storageStatePath: string = AUTH_FILE_PATH,
  options: { persistAuthState?: boolean } = {}
): Promise<AuthMode> {
  const url = buildAdminLoginUrl(authMode ?? envConfig.AUTH_MODE);

  await page.goto(url);

  const screen = await Promise.race([
    detectAuth0Screen(page, LOGIN_SCREEN_DETECTION_TIMEOUT),
    detectLegacyScreen(page, LOGIN_SCREEN_DETECTION_TIMEOUT),
  ]);

  if (screen === AUTH_MODE.AUTH0) {
    await loginWithAuth0(page, credentials);
  } else if (screen === AUTH_MODE.LEGACY) {
    await loginWithLegacy(page, credentials);
  } else {
    throw new Error('No login screen detected within the timeout');
  }

  if (options.persistAuthState ?? true) {
    await page.context().storageState({ path: storageStatePath });
  }

  return screen;
}
