// Usage: npm run ai-heal:test
//
// The "[AI-HEAL: <ref>]" Comments QA marker e2e-dashboard counts as "known bug
// identified by AI": the marker helpers, the cross-release carry-forward, and
// the 'known-issue' KB tier's CSV row.
import * as assert from 'assert';

import {
  AI_HEAL_PREFIX,
  hasAiHealMarker,
  stripAiHealMarker,
  withAiHealMarker,
} from '../steps/aiHealMarker';
import { carryForwardReview, CsvRow, PreviousReviewedRow } from '../steps/compareReleases';
import { buildCsv, CSV_HEADERS, HealCaseDecision } from '../steps/csv';
import { ClassifiedFailure } from '../schemas/classifiedFailure';

const tests: [string, () => void][] = [];
const test = (name: string, fn: () => void): void => {
  tests.push([name, fn]);
};

// --- marker helpers ---

test('marks a comment with the ref', () => {
  assert.strictEqual(withAiHealMarker('41.2', 'ya reportado'), '[AI-HEAL: 41.2] ya reportado');
});

test('writes the bare marker when there is no comment', () => {
  assert.strictEqual(withAiHealMarker('41.2', ''), '[AI-HEAL: 41.2]');
  assert.strictEqual(withAiHealMarker('41.2', '   '), '[AI-HEAL: 41.2]');
  assert.strictEqual(withAiHealMarker('41.2'), '[AI-HEAL: 41.2]');
});

test('replaces markers the comment already carries instead of stacking them', () => {
  assert.strictEqual(
    withAiHealMarker('41.3', '[AI-HEAL: 41.2] [AI-HEAL: 41.1] ya reportado'),
    '[AI-HEAL: 41.3] ya reportado'
  );
  assert.strictEqual(withAiHealMarker('41.3', '[AI-HEAL: 41.2]'), '[AI-HEAL: 41.3]');
});

test('keeps brackets out of the ref so the marker cannot close early', () => {
  assert.strictEqual(withAiHealMarker('a]b[c', 'x'), '[AI-HEAL: abc] x');
  assert.strictEqual(withAiHealMarker(']', 'x'), '[AI-HEAL: unknown] x');
});

test('the marker is always the very first thing in the cell (dashboard LIKE prefix)', () => {
  const marked = withAiHealMarker('41.2', '  comentario');
  assert.ok(marked.startsWith(AI_HEAL_PREFIX));
  assert.ok(hasAiHealMarker(marked));
  assert.ok(!hasAiHealMarker(' [AI-HEAL: 41.2]'));
  assert.ok(!hasAiHealMarker(''));
  assert.strictEqual(stripAiHealMarker(marked), 'comentario');
  assert.strictEqual(
    stripAiHealMarker('mentions [AI-HEAL: x] later'),
    'mentions [AI-HEAL: x] later'
  );
});

// --- cross-release carry-forward ---

const previous = (overrides: Partial<PreviousReviewedRow> = {}): PreviousReviewedRow => ({
  testCaseId: 'AM-T45',
  errorIdentified: 'timeout',
  rootCause: 'PSP down',
  qaReview: 'Not applicable',
  rootCauseQA: 'External issue',
  commentsQA: 'Falla conocida del PSP',
  ...overrides,
});

const currentRow = (overrides: CsvRow = {}): CsvRow => ({
  'Test Case Id': 'AM-T45',
  'QA Review': '',
  'Root cause QA': '',
  'Comments QA': '',
  ...overrides,
});

test('carries the disposition forward with the baseline release as ref', () => {
  const row = currentRow();
  carryForwardReview(row, previous(), '41.2');
  assert.strictEqual(row['Comments QA'], '[AI-HEAL: 41.2] Falla conocida del PSP');
  assert.strictEqual(row['QA Review'], 'Not applicable');
  assert.strictEqual(row['Root cause QA'], 'External issue');
});

test('marks the row even when the baseline had no comment', () => {
  const row = currentRow();
  carryForwardReview(row, previous({ commentsQA: '' }), '41.2');
  assert.strictEqual(row['Comments QA'], '[AI-HEAL: 41.2]');
});

test('a baseline exported from the dashboard does not chain markers', () => {
  const row = currentRow();
  carryForwardReview(
    row,
    previous({ commentsQA: '[AI-HEAL: 41.1] Falla conocida del PSP' }),
    '41.2'
  );
  assert.strictEqual(row['Comments QA'], '[AI-HEAL: 41.2] Falla conocida del PSP');
});

test('keeps an existing marker (known-issue KB tier) untouched', () => {
  const row = currentRow({
    'QA Review': 'Not applicable',
    'Root cause QA': 'PSP issue',
    'Comments QA': '[AI-HEAL: KB psp-decline]',
  });
  carryForwardReview(row, previous(), '41.2');
  assert.strictEqual(row['Comments QA'], '[AI-HEAL: KB psp-decline]');
  assert.strictEqual(row['QA Review'], 'Not applicable');
  assert.strictEqual(row['Root cause QA'], 'PSP issue');
});

test('prefixes an unmarked existing comment instead of replacing it', () => {
  const row = currentRow({ 'Comments QA': 'nota manual' });
  carryForwardReview(row, previous(), '41.2');
  assert.strictEqual(row['Comments QA'], '[AI-HEAL: 41.2] nota manual');
});

// --- 'known-issue' KB tier ---

const failure = (testCaseId: string): ClassifiedFailure =>
  ({
    testCaseId,
    testDescription: 'desc',
    teamOwner: 'team_payment_integration',
    errorIdentified: 'declined',
    rootCause: 'PSP decline',
    rootCauseCategory: 'psp_decline',
    failedStep: 'pay',
  }) as ClassifiedFailure;

const decision = (overrides: Partial<HealCaseDecision>): HealCaseDecision =>
  ({
    prResult: 'enrichment_only',
    prUrl: null,
    subagent: null,
    proposalKind: 'enrichment_only',
    verdict: null,
    bugLocation: null,
    suspectedRepo: null,
    orchestratorConfidence: 0.97,
    confidenceThreshold: 0.7,
    totalCostUsd: 0,
    budgetUsd: 10,
    prsOpened: 0,
    prCap: 5,
    errors: [],
    isDuplicate: false,
    leaderTestCaseId: null,
    ...overrides,
  }) as HealCaseDecision;

const commentsQAByTestCase = (csv: string): Map<string, string> => {
  const commentsIdx = CSV_HEADERS.indexOf('Comments QA');
  const out = new Map<string, string>();
  // Test rows carry no commas/quotes, so a plain split is enough here.
  for (const line of csv.trim().split('\n').slice(1)) {
    const cells = line.split(',');
    out.set(cells[0], cells[commentsIdx] ?? '');
  }
  return out;
};

test('known-issue rows (leader and inherited duplicate) carry the KB marker; others stay empty', () => {
  const known = {
    shortCircuit: 'known-issue' as const,
    csvStatus: 'Not applicable',
    csvIssueType: 'PSP issue',
    kbMatchIds: ['psp-decline'],
  };
  const csv = buildCsv(
    { failures: [failure('AM-T1'), failure('AM-T2'), failure('AM-T3')] },
    new Map([
      ['AM-T1', decision({ ...known, prResult: 'known-issue' })],
      [
        'AM-T2',
        decision({
          ...known,
          prResult: 'known-issue',
          isDuplicate: true,
          leaderTestCaseId: 'AM-T1',
        }),
      ],
      ['AM-T3', decision({ prResult: 'enrichment_only' })],
    ])
  );
  const comments = commentsQAByTestCase(csv);
  assert.strictEqual(comments.get('AM-T1'), '[AI-HEAL: KB psp-decline]');
  assert.strictEqual(comments.get('AM-T2'), '[AI-HEAL: KB psp-decline]');
  assert.strictEqual(comments.get('AM-T3'), '');
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}\n${(err as Error).message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} tests passed`);
process.exit(failed ? 1 : 0);
