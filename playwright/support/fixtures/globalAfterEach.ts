import { test as base } from './merchantPool';
import type { ServiceFixtures } from './services';

/**
 * Fixture interface for the auto after hook
 */
interface GlobalHooks {
  _autoAfterEach: void;
}

/**
 * Global afterEach hook that runs after every test
 *
 * Note: Merchant cleanup is now handled by global teardown via bulk deletion
 * in playwright/tests/global.teardown.ts for better performance and efficiency.
 * Individual merchant deletion has been removed from this hook.
 */
export const test = base.extend<GlobalHooks>({
  // Use autoFixture with undefined to create a hook that runs for every test
  _autoAfterEach: [
    async ({}, use, testInfo) => {
      await use(undefined);
      // This runs after the test completes
      // Future: Add any post-test cleanup logic here if needed
      // Merchant cleanup is now handled by global.teardown.ts
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
export type { ServiceFixtures } from './services';
