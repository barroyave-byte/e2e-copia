import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractTestCaseIds } from './find_test_cases_id';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-test-cases-'));
const reportPath = path.join(tmpDir, 'failed-tests.json');

fs.writeFileSync(
  reportPath,
  JSON.stringify({
    suites: [
      {
        file: 'playwright/tests/checkout/checkout.spec.ts',
        specs: [
          { title: 'first failed case', line: 42 },
          { title: 'second failed case', line: 88 },
          { title: 'duplicate failed case from another project', line: 42 },
        ],
      },
      {
        title: 'nested suite',
        file: 'playwright/tests/payments/payment.spec.ts',
        suites: [
          {
            title: 'child suite inherits parent file',
            specs: [{ title: 'nested failed case', line: 17 }],
          },
        ],
      },
      // Tests registered from a shared helper report the helper as their file.
      // `playwright test .../share/admT800.ts:66` matches no test file, so the
      // selector has to fall back to the spec that loaded it.
      {
        title: 'orchestrator spec loading shared helpers',
        file: 'playwright/tests/teams/admin/security/ADM-T799.spec.ts',
        specs: [{ title: '@ADM-T799 declared in the spec itself', line: 15 }],
        suites: [
          {
            title: 'group registered from share/',
            file: 'playwright/tests/teams/admin/security/share/admT800.ts',
            specs: [{ title: '@ADM-T800 declared in the helper', line: 66 }],
          },
        ],
      },
    ],
  }),
  'utf-8'
);

assert.deepStrictEqual(extractTestCaseIds(reportPath), [
  'playwright/tests/checkout/checkout.spec.ts:42',
  'playwright/tests/checkout/checkout.spec.ts:88',
  'playwright/tests/payments/payment.spec.ts:17',
  // No line, and no `:15` entry either: selecting the whole spec already covers
  // every test in it, and re-running the whole file is the right unit for the
  // describe.serial group these helpers belong to.
  'playwright/tests/teams/admin/security/ADM-T799.spec.ts',
]);

fs.rmSync(tmpDir, { recursive: true, force: true });
