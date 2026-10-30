import { test, expect } from '@playwright/test';
import * as crypto from 'crypto';
import * as fs from 'fs';

// Toy spec for the i-hub E2E execution flow. It checks that the run credentials reached the runner
// for this test id and logs a fingerprint (short sha256) so runs can be compared. Values are never printed.
test(
  '@PF-T134 Purchase with billing address 2 - Signifyd Post authorization',
  { tag: ['@i-hub-global'] },
  async () => {
    const testId = 'PF-T134';
    const file = process.env.IHUB_CREDENTIALS_FILE;
    expect(file, 'IHUB_CREDENTIALS_FILE must be set by the workflow').toBeTruthy();

    const all = JSON.parse(fs.readFileSync(file as string, 'utf8')).credentials ?? {};
    const mine: Record<string, unknown> = all[testId] ?? {};
    const keys = Object.keys(mine).sort();
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(mine)).digest('hex').slice(0, 8);

    console.log(`[ihub] test=${testId} credential_keys=${JSON.stringify(keys)} fingerprint=${fingerprint}`);
    test.info().annotations.push({ type: 'credentials-fingerprint', description: fingerprint });

    expect(keys.length).toBeGreaterThan(0);
  },
);
