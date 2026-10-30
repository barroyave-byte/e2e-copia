import type { Page } from '@playwright/test';
import { AUTH_MODE } from '../constants';
import type { AuthMode } from '../types';

export async function detectAuth0Screen(page: Page, timeout: number): Promise<AuthMode | null> {
  try {
    await page.waitForURL(/login-admin\.(?:.+\.)?deuna\.com/, { timeout });
    return AUTH_MODE.AUTH0;
  } catch (error) {
    return null;
  }
}
