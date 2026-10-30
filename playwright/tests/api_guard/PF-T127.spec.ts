import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Toy spec for the i-hub E2E execution flow. It only checks that the run credentials
// reached the runner for this test id; values are never printed.
test(
  '@PF-T127 Purchase with upper case billing address name function for Cybersource fraud provider',
  { tag: ['@fraud', '@i-hub-global'] },
  async () => {
    const file = process.env.IHUB_CREDENTIALS_FILE;
    expect(file, 'IHUB_CREDENTIALS_FILE must be set by the workflow').toBeTruthy();

    const all = JSON.parse(fs.readFileSync(file as string, 'utf8')).credentials ?? {};
    expect(Object.keys(all[process.env.IHUB_TEST_ID ?? 'PF-T127'] ?? {}).length).toBeGreaterThan(0);
  },
);
