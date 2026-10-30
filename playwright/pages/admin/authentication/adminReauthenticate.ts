import type { Browser, Page } from '@playwright/test';

import { AUTH_FILE_PATH } from '@support/constants/authFile';

import type { AdminCredentials, AuthMode } from './types';
import { adminAuthenticate } from './adminAuthenticate';

interface AdminReauthenticateResult {
  page: Page;
}

export async function adminReauthenticate(
  browser: Browser,
  authMode?: AuthMode,
  credentials?: AdminCredentials,
  storageStatePath: string = AUTH_FILE_PATH,
  beforeAuthCallback?: (page: Page) => Promise<void> | void,
  afterAuthCallback?: (page: Page) => Promise<void> | void,
  options: { persistAuthState?: boolean } = {}
): Promise<AdminReauthenticateResult> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  await beforeAuthCallback?.(page);
  await adminAuthenticate(page, authMode, credentials, storageStatePath, options);
  await afterAuthCallback?.(page);

  await context.close();

  return { page };
}
