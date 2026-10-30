import { test as base } from '@playwright/test';
import { mockRequests } from '@support/mocks/requests/mockRequests';
import * as dotenv from 'dotenv';
import { type AuthMode, readAuthMode } from '@pages/admin/authentication';

// Load environment variables
dotenv.config();

/**
 * Extended test fixture that injects window.devUrl into every page
 * Usage: import { test, expect } from '@deuna/test';
 */
export const test = base.extend<{ authMode: AuthMode }>({
  authMode: async ({}, use) => {
    await use(readAuthMode());
  },
  // Override the context fixture to grant permissions
  context: async ({ context }, use) => {
    // Grant permissions for all contexts
    await context.grantPermissions(['local-network-access']);

    await mockRequests(context);
    // Continue with the regular context fixture
    await use(context);
  }, // Override the page fixture
  page: async ({ page }, use) => {
    // Granular override for checkout-base widget only.
    if (process.env.URL_CHECKOUT_BASE_LOCAL) {
      await page.addInitScript((devUrl: string) => {
        (window as any).devUrlCheckoutBase = devUrl;
      }, process.env.URL_CHECKOUT_BASE_LOCAL);
    }

    // Granular override for elements-link widget only.
    if (process.env.URL_ELEMENTS_LINK_LOCAL) {
      await page.addInitScript((devUrl: string) => {
        (window as any).devUrlElementsLink = devUrl;
      }, process.env.URL_ELEMENTS_LINK_LOCAL);
    }

    // Block Localize API calls to avoid consuming quota during tests
    await page.route('**/*localizecdn.com/**', (route) => {
      route.abort();
    });

    // Continue with the regular page fixture
    await use(page);
  },
});

// Re-export expect for convenience
export * from '@playwright/test';
