import { defineConfig } from '@playwright/test';

// Config for the i-hub sandbox repo: runs only the toy specs, with no login/global setup.
export default defineConfig({
  testDir: './playwright/tests/api_guard',
  testMatch: ['PF-T127.spec.ts', 'PF-T134.spec.ts', 'PI-T1911.spec.ts'],
  reporter: [['list'], ['json', { outputFile: 'playwright-report/results.json' }]],
  retries: 0,
  workers: 1,
});
