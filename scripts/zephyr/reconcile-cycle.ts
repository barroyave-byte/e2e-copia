#!/usr/bin/env node

/**
 * Closes the gap between what a regression run actually did and what the Zephyr
 * cycle says it did.
 *
 * The reporter publishes from inside each shard, so a shard whose runner dies,
 * whose job times out, or whose publish calls all fail leaves test cases with no
 * execution at all — and a case with no execution reads as NO EXECUTED on the
 * board. This runs once at the end of the workflow, compares the merged
 * Playwright report against the cycle, and posts whatever is missing or stale.
 *
 * Pass one merged report per phase, oldest first (primary, then each retry
 * round). Each round's report only contains the tests that round re-ran, so the
 * definitive status of a case comes from combining them: a case that failed in
 * the primary run and passed on a retry is a Pass.
 *
 * `--selection` takes the preflight's `selection.json`. It is what makes a shard
 * that died without reporting anything visible: without it the script only knows
 * about tests that reached some report.
 *
 */

import * as fs from 'fs';
import axios from 'axios';
import {
  ZEPHYR_STATUS,
  STATUS_PRECEDENCE,
  resolveZephyrStatus,
  type ZephyrStatus,
} from '../../playwright/support/zephyr/statusMapping';

const ZEPHYR_API = 'https://api.zephyrscale.smartbear.com';

// Imported, never redefined:  a private copy of this mapping is what made the
// reconciler rewrite 177 correct `Fail` executions to `Not Executed` in QA-R3254.
const STATUS = ZEPHYR_STATUS;
type Status = ZephyrStatus;
const PRECEDENCE = STATUS_PRECEDENCE;

const TEST_CASE_ID = /@((?:PI|ENTP1|PAYM|ADM|PF|PLAT|RECON|ECOM)-T\d+)\b/;

interface ReportTest {
  status?: string;
  expectedStatus?: string;
  annotations?: { type: string }[];
  results?: { duration?: number }[];
}

interface ReportSpec {
  title?: string;
  tests?: ReportTest[];
}

interface ReportSuite {
  file?: string;
  suites?: ReportSuite[];
  specs?: ReportSpec[];
}

/** A spec plus the file it came from; `file` only appears on the outer suite. */
interface LocatedSpec {
  spec: ReportSpec;
  file?: string;
}

function walkSpecs(suites: ReportSuite[] = [], inheritedFile?: string): LocatedSpec[] {
  return suites.flatMap((suite) => {
    const file = suite.file ?? inheritedFile;
    return [
      ...(suite.specs ?? []).map((spec) => ({ spec, file })),
      ...walkSpecs(suite.suites, file),
    ];
  });
}

/**
 * Every spec file is named after exactly one Zephyr case, so the filename is an
 * independent check on the ID in the test title.
 *
 */
function idFromFile(file?: string): string | null {
  if (!file) return null;
  const base =
    file
      .split('/')
      .pop()
      ?.replace(/\.spec\.ts$/, '') ?? '';
  return /^[A-Z][A-Z0-9]*-T\d+$/.test(base) ? base : null;
}

/** Adapts a JSON-report test to the shared mapping. */
function statusOf(test: ReportTest): Status {
  return resolveZephyrStatus({
    outcome: test.status,
    expectedStatus: test.expectedStatus,
    annotationTypes: (test.annotations ?? []).map((a) => a.type),
  });
}

interface ReportReading {
  resolved: Map<string, { status: Status; duration: number }>;
  /** Specs whose title ID disagrees with their filename. */
  mismatches: { file: string; fromFile: string; fromTitle: string | null }[];
}

function readReports(paths: string[]): ReportReading {
  const resolved = new Map<string, { status: Status; duration: number }>();

  const idsByFile = new Map<string, Set<string>>();

  for (const reportPath of paths) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    for (const { spec, file } of walkSpecs(report.suites)) {
      const id = spec.title?.match(TEST_CASE_ID)?.[1] ?? null;

      if (file && idFromFile(file)) {
        const seen = idsByFile.get(file) ?? new Set<string>();
        if (id) seen.add(id);
        idsByFile.set(file, seen);
      }

      if (!id) continue;

      for (const test of spec.tests ?? []) {
        const status = statusOf(test);
        const duration = (test.results ?? []).reduce((sum, r) => sum + (r.duration ?? 0), 0);
        const current = resolved.get(id);

        // Precedence, not last-write-wins: a case that failed in the primary run
        // and passed on a retry is a Pass, whichever order the reports arrive in.
        if (!current || PRECEDENCE[status] > PRECEDENCE[current.status]) {
          resolved.set(id, { status, duration });
        }
      }
    }
  }

  const mismatches: ReportReading['mismatches'] = [];
  for (const [file, ids] of idsByFile) {
    const fromFile = idFromFile(file)!;
    if (ids.has(fromFile)) continue;
    mismatches.push({
      file,
      fromFile,
      fromTitle: ids.size > 0 ? [...ids].join(', ') : null,
    });
  }

  return { resolved, mismatches };
}

/**
 * Execution status names by id, for the project the cycle belongs to.
 *
 * Scoped to one project on purpose: unscoped, this endpoint returns every
 * status of every project (135 at the time of writing) and a single page of 100
 * silently drops the rest. An unresolved id reads as 'Unknown', which the caller
 * then treats as a disagreement and rewrites a perfectly good execution.
 */
async function fetchStatusNames(projectKey: string, token: string): Promise<Map<number, string>> {
  const headers = { Authorization: `Bearer ${token}` };
  const names = new Map<number, string>();

  let startAt = 0;
  for (;;) {
    const page = await axios.get(`${ZEPHYR_API}/v2/statuses`, {
      headers,
      params: { projectKey, statusType: 'TEST_EXECUTION', maxResults: 100, startAt },
    });

    const values = page.data.values ?? [];
    for (const status of values) names.set(status.id, status.name);

    if (page.data.isLast || values.length === 0) break;
    startAt += values.length;
  }

  return names;
}

async function fetchCycleStatuses(
  cycleKey: string,
  projectKey: string,
  token: string
): Promise<Map<string, string>> {
  const headers = { Authorization: `Bearer ${token}` };
  const statusNames = await fetchStatusNames(projectKey, token);

  // Without the id->name map every execution reads as 'Unknown', every case
  // looks like a disagreement, and the script rewrites the whole cycle. That is
  // a configuration or API failure, not something to reconcile: stop instead.
  if (statusNames.size === 0) {
    throw new Error(
      `No execution statuses returned for project "${projectKey}". ` +
        'Refusing to reconcile: every case would look like a mismatch and the cycle would be rewritten.'
    );
  }

  // Keyed by test case, holding the most recent execution. Which execution wins
  // is decided by actualEndDate rather than by the order the API happens to
  // return, because the whole point of this script is that the cycle shows the
  // wrong one.
  const latest = new Map<string, { status: string; endedAt: string }>();

  let startAt = 0;
  for (;;) {
    const page = await axios.get(`${ZEPHYR_API}/v2/testexecutions`, {
      headers,
      params: { testCycle: cycleKey, maxResults: 1000, startAt },
    });

    const values = page.data.values ?? [];
    for (const execution of values) {
      const key = execution.testCase?.self?.match(/testcases\/([^/?]+)/)?.[1];
      if (!key) continue;

      const status = statusNames.get(execution.testExecutionStatus?.id) ?? 'Unknown';
      const endedAt = execution.actualEndDate ?? '';
      const current = latest.get(key);
      if (!current || endedAt >= current.endedAt) {
        latest.set(key, { status, endedAt });
      }
    }

    // `values.length === 0` guards against a missing isLast turning this into an
    // endless loop.
    if (page.data.isLast || values.length === 0) break;
    startAt += values.length;
  }

  return new Map([...latest].map(([key, { status }]) => [key, status]));
}

/** Where the counts are left for the workflow to pick up. */
const SUMMARY_FILE = 'reconcile-summary.json';

/** The run's counts, as the workflow reports them. */
export interface ReconcileSummary {
  pass: number;
  fail: number;
  blocked: number;
  notExecuted: number;
  unreported: number;
  missing: number;
  total: number;
}

/**
 * Counts the run for whoever reports it — the Slack notification reads
 * `blocked` from here. Pure so it can be checked on its own; writeSummary does
 * the file.
 *
 * Counted over the same resolved map that decides what gets published, so the
 * numbers cannot drift from the cycle.
 */
export function buildSummary(
  expected: Map<string, { status: Status; duration: number }>,
  missing: number,
  unreported: readonly string[]
): ReconcileSummary {
  const counts = { pass: 0, fail: 0, blocked: 0, notExecuted: 0 };
  const bucket: Record<Status, keyof typeof counts> = {
    [STATUS.PASS]: 'pass',
    [STATUS.FAIL]: 'fail',
    [STATUS.BLOCKED]: 'blocked',
    [STATUS.NOT_EXECUTED]: 'notExecuted',
  };

  const lost = new Set(unreported);

  for (const [id, { status }] of expected) {
    if (lost.has(id)) continue;
    counts[bucket[status]]++;
  }

  return { ...counts, unreported: lost.size, missing, total: expected.size };
}

function writeSummary(
  expected: Map<string, { status: Status; duration: number }>,
  missing: number,
  unreported: readonly string[]
): void {
  const summary = buildSummary(expected, missing, unreported);

  try {
    fs.writeFileSync(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`  summary written to ${SUMMARY_FILE}: ${JSON.stringify(summary)}`);
  } catch (error) {
    // Never let a reporting convenience stop the reconciliation itself.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not write ${SUMMARY_FILE}: ${message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const selectionPath = args
    .find((a) => a.startsWith('--selection='))
    ?.slice('--selection='.length);
  const reportPaths = args.filter((a) => !a.startsWith('--'));
  const token = process.env.ZEPHYR_ACCESS_TOKEN;
  const cycleKey = process.env.TEST_CYCLE_ID;

  // Rounds that never ran leave no report; skipping them silently is correct,
  // but having none at all means there is nothing to reconcile against.
  const existingReports = reportPaths.filter((p) => fs.existsSync(p));
  const skipped = reportPaths.filter((p) => !fs.existsSync(p));
  for (const p of skipped) {
    console.log(`No report at ${p} — that phase did not run.`);
  }

  if (existingReports.length === 0) {
    console.error('No merged report found. Pass at least one existing report file.');
    process.exit(1);
  }
  if (!token || !cycleKey) {
    console.error('ZEPHYR_ACCESS_TOKEN and TEST_CYCLE_ID are required.');
    process.exit(1);
  }

  console.log(`Reading ${existingReports.length} report(s): ${existingReports.join(', ')}`);
  const { resolved: expected, mismatches } = readReports(existingReports);

  // The preflight selection is the authority on what should have run. Without
  // it a test whose shard never produced a report is invisible to this check.
  // The filename is used as the ID here on purpose: a spec whose title carries
  // the wrong ID would otherwise hide behind the case it points at.
  //
  // Only collected here. Whether each one is really a gap is decided after the
  // cycle is read, because a shard publishes its results before uploading its
  // report: a case can be correctly published and still be missing from every
  // report, and overwriting it would be the very degradation this script exists
  // to prevent.
  const selectedButUnreported: string[] = [];
  // Resolved once: "not given" and "given but absent" are different problems
  // and the operator needs to know which one they are looking at.
  const selectionFile = selectionPath && fs.existsSync(selectionPath) ? selectionPath : undefined;

  if (selectionFile) {
    for (const { spec, file } of walkSpecs(
      JSON.parse(fs.readFileSync(selectionFile, 'utf-8')).suites
    )) {
      const id = idFromFile(file) ?? spec.title?.match(TEST_CASE_ID)?.[1];
      if (id && !expected.has(id)) selectedButUnreported.push(id);
    }
  } else if (selectionPath) {
    // Given but absent: the artifact did not arrive. A different problem from
    // not asking for the check at all, and worth failing on — someone wired it
    // up and it silently did nothing.
    console.error(
      `--selection points at ${selectionPath}, which does not exist. ` +
        'Cases lost with a dead shard cannot be detected in this run.'
    );
    process.exitCode = 1;
  } else {
    // Not asked for: say plainly what this run can and cannot check.
    console.log(
      'No --selection given: cases lost with a dead shard cannot be detected in this run.'
    );
  }

  if (mismatches.length > 0) {
    console.error(`Specs whose test case ID does not match their filename: ${mismatches.length}`);
    for (const { file, fromFile, fromTitle } of mismatches) {
      console.error(`  ${file}: filename says ${fromFile}, title says ${fromTitle ?? '(no ID)'}`);
      console.error(
        `    -> ${fromFile} never gets an execution` +
          (fromTitle ? `, and ${fromTitle} receives this test's result` : '')
      );
    }
    console.error('');
    process.exitCode = 1;
  }

  const projectKey = cycleKey.split('-')[0] || process.env.ZEPHYR_PROJECT_NAME || '';

  // Same fallback as playwright/support/zephyr/utils/config.ts. Without it an
  // unset USER_ID_ZEPHYR sends an empty executedById and Zephyr answers 400.
  const userId = process.env.USER_ID_ZEPHYR || '63e704e786a66a7cc7ab6e34';
  const published = await fetchCycleStatuses(cycleKey, projectKey, token);

  // A selected case absent from every report is only a gap when the cycle has
  // no execution for it either. If Zephyr already holds a result, its shard
  // published and then lost its report — that result is better information than
  // anything this script could infer, so leave it alone.
  const unreported = selectedButUnreported.filter((id) => !published.has(id));

  for (const id of unreported) {
    // Meant to run and never ran: blocked, not "not executed".
    expected.set(id, { status: STATUS.BLOCKED, duration: 0 });
  }

  if (selectionFile) {
    const publishedAnyway = selectedButUnreported.length - unreported.length;
    if (publishedAnyway > 0) {
      console.log(
        `${publishedAnyway} case(s) missing from the reports already have an execution; left untouched.`
      );
    }

    if (unreported.length > 0) {
      // The headline number for a shard that died before reporting anything.
      console.error(
        `${unreported.length} selected case(s) reached no report and have no execution — a shard likely died before finishing:`
      );
      console.error(`  ${[...unreported].sort().join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log('Every selected case is accounted for.');
    }
  }

  const missing: string[] = [];
  const stale: string[] = [];

  for (const [id, { status }] of expected) {
    const current = published.get(id);
    if (!current) missing.push(id);
    else if (current !== status) stale.push(id);
  }

  console.log(`Cycle ${cycleKey}: ${expected.size} expected, ${published.size} published`);
  console.log(`  missing an execution: ${missing.length}`);
  console.log(`  disagreeing with the report: ${stale.length}`);

  writeSummary(expected, missing.length, unreported);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  for (const id of [...missing, ...stale]) {
    const resolved = expected.get(id);
    if (!resolved) continue;
    const { status, duration } = resolved;
    const wasMissing = missing.includes(id);

    try {
      await axios.post(
        `${ZEPHYR_API}/v2/testexecutions`,
        {
          projectKey: process.env.ZEPHYR_PROJECT_NAME || projectKey,
          testCaseKey: id,
          testCycleKey: cycleKey,
          statusName: status,
          executionTime: duration,
          executedById: userId,
          assignedToId: userId,
          environmentName: process.env.ZEPHYR_ENVIRONMENT_EXECUTION,
          comment: wasMissing
            ? 'Reconciled: no result reported by any shard'
            : `Reconciled: cycle showed ${published.get(id)}, report says ${status}`,
        },
        { headers }
      );
      console.log(`  reconciled ${id} -> ${status}`);
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? (error.response?.data ?? error.message)
        : error instanceof Error
          ? error.message
          : String(error);
      console.error(`  FAILED to reconcile ${id}:`, detail);
      process.exitCode = 1;
    }
  }

  // Anything still unaccounted for after reconciling is a real hole and the
  // workflow should say so rather than leaving it silently on the board.
  const holes = [...expected.keys()].filter((id) => !published.has(id) && !missing.includes(id));
  if (holes.length > 0) {
    console.error(`Test cases with no execution after reconciling: ${holes.join(', ')}`);
    process.exitCode = 1;
  }
}

// Same guard as scripts/find_test_cases_id.ts: importing this module for a
// check must not kick off a reconciliation against a live cycle.
if (require.main === module) {
  main().catch((error) => {
    console.error('Reconciliation failed:', error);
    process.exit(1);
  });
}
