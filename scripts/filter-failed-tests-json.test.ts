import * as assert from 'assert';

import { selectFailures } from './filter-failed-tests-json';

type Test = Record<string, any>;

const spec = (title: string, test: Test) => ({
  title,
  file: 'playwright/tests/f.spec.ts',
  line: 1,
  tests: [test],
});

const report = (...specs: ReturnType<typeof spec>[]) => ({
  suites: [{ title: 'f.spec.ts', file: 'playwright/tests/f.spec.ts', specs }],
});

const titlesOf = (reports: any[]) =>
  selectFailures(reports)
    .map(({ spec: found }) => found.title as string)
    .sort();

const check = (name: string, reports: any[], expected: string[]) =>
  assert.deepStrictEqual(titlesOf(reports), expected.sort(), name);

// ---------------------------------------------------------------------------
// What belongs in a report of "what needs fixing now"
// ---------------------------------------------------------------------------

// resolveZephyrStatus maps a skipped test carrying a `bug` annotation to Fail,
// which is right for the Zephyr board — the linked Jira issue has to show up
// against a red case. It is wrong here: ~174 test.fixme specs would flood a
// report meant to list what actually broke in this run.
check(
  'a test.fixme spec never reaches the report',
  [
    report(
      spec('@ADM-T1 fixme', { status: 'skipped', annotations: [{ type: 'bug' }], results: [] })
    ),
  ],
  []
);

check(
  'a deliberate skip never reaches the report',
  [
    report(
      spec('@ADM-T2 skip', {
        status: 'skipped',
        expectedStatus: 'skipped',
        annotations: [],
        results: [],
      })
    ),
  ],
  []
);

// Blocked is tracked in Zephyr and in the Slack notification, deliberately not
// here: the case that blocked it is the one with something to fix.
check(
  'a blocked test never reaches the report',
  [
    report(
      spec('@ADM-T3 blocked', {
        status: 'skipped',
        annotations: [],
        results: [{ status: 'skipped' }],
      })
    ),
  ],
  []
);

check(
  'a real failure does',
  [
    report(
      spec('@ADM-T4 fail', {
        status: 'unexpected',
        annotations: [],
        results: [{ status: 'failed' }],
      })
    ),
  ],
  ['@ADM-T4 fail']
);

check(
  'a test that failed and passed on its own retry does not',
  [
    report(
      spec('@ADM-T5 flaky', {
        status: 'flaky',
        annotations: [],
        results: [{ status: 'failed' }, { status: 'passed' }],
      })
    ),
  ],
  []
);

// ---------------------------------------------------------------------------
// Resolving one case across phases
// ---------------------------------------------------------------------------

// The defect this whole thing exists for: when `authenticate` dies on a retry
// shard, every chromium test on it is reported `skipped` with zero attempts.
// Reading only the last round then drops a case that genuinely failed earlier —
// six of them in run 34370934097, all of which Zephyr had in Fail.
check(
  'a case that failed in the primary run and that a later round never ran is still a failure',
  [
    report(
      spec('@ADM-T6 x', { status: 'unexpected', annotations: [], results: [{ status: 'failed' }] })
    ),
    report(spec('@ADM-T6 x', { status: 'skipped', annotations: [], results: [] })),
  ],
  ['@ADM-T6 x']
);

check(
  'a case that failed in the primary run and passed on a retry is not',
  [
    report(
      spec('@ADM-T7 x', { status: 'unexpected', annotations: [], results: [{ status: 'failed' }] })
    ),
    report(
      spec('@ADM-T7 x', { status: 'expected', annotations: [], results: [{ status: 'passed' }] })
    ),
  ],
  []
);

// Same status in both phases: keep the newer evidence, so the error and the
// trace shown are the ones whose blob-report this run actually downloaded.
{
  const resolved = selectFailures([
    report(
      spec('@ADM-T8 x', {
        status: 'unexpected',
        annotations: [],
        results: [{ status: 'failed', error: { message: 'older' } }],
      })
    ),
    report(
      spec('@ADM-T8 x', {
        status: 'unexpected',
        annotations: [],
        results: [{ status: 'failed', error: { message: 'newer' } }],
      })
    ),
  ]);

  assert.strictEqual(resolved.length, 1);
  assert.strictEqual(
    resolved[0].spec.tests?.[0].results[0].error.message,
    'newer',
    'a Fail/Fail tie keeps the most recent phase'
  );
}

// Attachment paths are absolute paths into the blob-report that produced them,
// and only the newest phase's blobs are downloaded next to this JSON.
{
  const resolved = selectFailures([
    report(
      spec('@ADM-T9 x', {
        status: 'unexpected',
        annotations: [],
        results: [{ status: 'failed', attachments: [{ name: 'trace', path: '/gone/trace.zip' }] }],
      })
    ),
    report(spec('@ADM-T9 x', { status: 'skipped', annotations: [], results: [] })),
  ]);

  assert.deepStrictEqual(
    resolved[0].spec.tests?.[0].results[0].attachments,
    [],
    'attachments from an earlier phase are dropped rather than left pointing at a missing file'
  );
}

// ---------------------------------------------------------------------------
// Tests with no Zephyr case ID
// ---------------------------------------------------------------------------

// The `authenticate` setup test has no case ID and the merged report holds one
// copy per shard, under ids that differ between phases — there is nothing
// stable to resolve it by. It is taken from the newest report alone, which is
// what the pipeline did before phases were merged at all.
check(
  'an untagged failure is read from the newest report only',
  [
    report(
      spec('authenticate', {
        status: 'unexpected',
        annotations: [],
        results: [{ status: 'failed' }],
      })
    ),
    report(
      spec('authenticate', { status: 'expected', annotations: [], results: [{ status: 'passed' }] })
    ),
  ],
  []
);

check(
  'an untagged failure in the newest report is kept',
  [
    report(
      spec('authenticate', { status: 'expected', annotations: [], results: [{ status: 'passed' }] })
    ),
    report(
      spec('authenticate', {
        status: 'unexpected',
        annotations: [],
        results: [{ status: 'failed' }],
      })
    ),
  ],
  ['authenticate']
);

console.log('filter-failed-tests-json: all assertions passed');
