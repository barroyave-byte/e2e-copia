#!/usr/bin/env node

/**
 * Reduces one or more Playwright JSON reports to the tests that are still
 * failing, and writes the result as a report of the same shape.
 *
 * Usage:
 *   filter-failed-tests-json.ts <input-json-path> <output-json-path>
 *   filter-failed-tests-json.ts --out <output> <report.json>...
 *
 * The second form takes one merged report per phase, OLDEST FIRST (primary,
 * then each retry round), and resolves every Zephyr-mapped case across all of
 * them before deciding whether it failed.
 *
 * Why that matters: each retry round's report only contains what that round
 * re-ran, and a round can fail to run a test it selected — when `authenticate`
 * (the `setup` project) dies on a shard, every chromium test on it is reported
 * `skipped` with zero attempts. Reading only the last round then drops a case
 * that genuinely failed earlier. In run 34370934097 that cost six real failures
 * (ADM-T799, ADM-T803, RECON-T9, ADM-T675/676/677): Zephyr had them in Fail —
 * the reconciliation job repaired them — while the delivered CSV had no row for
 * any of them.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  ZEPHYR_STATUS,
  STATUS_PRECEDENCE,
  resolveZephyrStatus,
  type ZephyrStatus,
} from '../playwright/support/zephyr/statusMapping';

interface TestResult {
  status?: string;
  attachments?: unknown[];
  [key: string]: any;
}

interface Test {
  status?: string;
  expectedStatus?: string;
  annotations?: { type: string }[];
  results?: TestResult[];
  [key: string]: any;
}

interface Spec {
  title?: string;
  tests?: Test[];
  [key: string]: any;
}

interface Suite {
  title?: string;
  file?: string;
  suites?: Suite[];
  specs?: Spec[];
  [key: string]: any;
}

interface PlaywrightReport {
  suites: Suite[];
  [key: string]: any;
}

/** Same anchored pattern the reporter and the reconciler use. */
const TEST_CASE_ID = /@((?:PI|ENTP1|PAYM|ADM|PF|PLAT|RECON|ECOM)-T\d+)\b/;

/** Playwright statuses that mean the test ran and ended red. */
const RAN_AND_FAILED = ['unexpected', 'failed', 'timedOut', 'interrupted'];

/** Identifies a suite so the output tree can be rebuilt along the same path. */
interface SuiteMeta {
  title?: string;
  file?: string;
  line?: number;
  column?: number;
}

interface LocatedSpec {
  spec: Spec;
  path: SuiteMeta[];
}

const suiteMeta = (suite: Suite): SuiteMeta => ({
  title: suite.title,
  file: suite.file,
  line: suite.line,
  column: suite.column,
});

function walkSpecs(suites: Suite[] = [], parents: SuiteMeta[] = []): LocatedSpec[] {
  return suites.flatMap((suite) => {
    const here = [...parents, suiteMeta(suite)];
    return [
      ...(suite.specs ?? []).map((spec) => ({ spec, path: here })),
      ...walkSpecs(suite.suites, here),
    ];
  });
}

/** Adapts a JSON-report test to the shared Zephyr mapping. */
function statusOf(test: Test): ZephyrStatus {
  return resolveZephyrStatus({
    outcome: test.status,
    expectedStatus: test.expectedStatus,
    annotationTypes: (test.annotations ?? []).map((annotation) => annotation.type),
  });
}

interface SpecVerdict {
  /** Best status across the spec's tests — the one that decides the case. */
  status: ZephyrStatus;
  /** True when at least one test both ran and ended red. */
  ranAndFailed: boolean;
}

function verdictOf(spec: Spec): SpecVerdict {
  let status: ZephyrStatus = ZEPHYR_STATUS.NOT_EXECUTED;
  let ranAndFailed = false;

  for (const test of spec.tests ?? []) {
    const testStatus = statusOf(test);
    if (STATUS_PRECEDENCE[testStatus] > STATUS_PRECEDENCE[status]) status = testStatus;
    if (test.status && RAN_AND_FAILED.includes(test.status)) ranAndFailed = true;
  }

  return { status, ranAndFailed };
}

interface Candidate extends SpecVerdict {
  spec: Spec;
  path: SuiteMeta[];
  reportIndex: number;
}

/**
 * A failing case keeps its row; anything else is dropped.
 *
 * `ranAndFailed` is not redundant with `status === Fail`: resolveZephyrStatus
 * maps a `skipped` test carrying a `bug` annotation to Fail, which is right for
 * the Zephyr board but would put every `test.fixme` spec (~174 in a full
 * regression) into a report meant to list what needs fixing now.
 */
const isFailure = (candidate: SpecVerdict): boolean =>
  candidate.status === ZEPHYR_STATUS.FAIL && candidate.ranAndFailed;

/**
 * Attachment paths are absolute paths into the blob-report that produced them.
 * Only the newest report's blobs are downloaded alongside this JSON, so a path
 * from an earlier phase points at a file that does not exist on this machine.
 * ai-heal degrades cleanly on a missing file, but a null path is honest and a
 * stale one is not.
 */
function withoutAttachments(spec: Spec): Spec {
  return {
    ...spec,
    tests: (spec.tests ?? []).map((test) => ({
      ...test,
      results: (test.results ?? []).map((result) => ({ ...result, attachments: [] })),
    })),
  };
}

/**
 * Resolves every case across phases and returns the specs that are still
 * failing, each paired with the suite path it has to be rebuilt under.
 *
 * Only specs carrying a Zephyr case ID are merged across phases: they are the
 * population the cycle is keyed on. Everything else — the `authenticate` setup
 * test above all, which the merged report holds once per shard under ids that
 * differ between phases — is taken from the newest report alone, exactly as
 * before.
 */
function selectFailures(reports: PlaywrightReport[]): LocatedSpec[] {
  const byCaseId = new Map<string, Candidate>();
  const unmapped: LocatedSpec[] = [];
  const lastIndex = reports.length - 1;

  reports.forEach((report, reportIndex) => {
    for (const { spec, path: suitePath } of walkSpecs(report.suites)) {
      const caseId = spec.title?.match(TEST_CASE_ID)?.[1];

      if (!caseId) {
        if (reportIndex === lastIndex && isFailure(verdictOf(spec))) {
          unmapped.push({ spec, path: suitePath });
        }
        continue;
      }

      const candidate: Candidate = { ...verdictOf(spec), spec, path: suitePath, reportIndex };
      const current = byCaseId.get(caseId);

      // Precedence, not last-write-wins: a case that failed in the primary run
      // and was never re-run by a later round is still a failure, whereas one
      // that failed and then passed is not. Ties go to the newer report so the
      // error and the trace shown are the freshest available.
      if (!current || STATUS_PRECEDENCE[candidate.status] >= STATUS_PRECEDENCE[current.status]) {
        byCaseId.set(caseId, candidate);
      }
    }
  });

  const mapped = [...byCaseId.values()]
    .filter(isFailure)
    .map(({ spec, path: suitePath, reportIndex }) => ({
      spec: reportIndex === lastIndex ? spec : withoutAttachments(spec),
      path: suitePath,
    }));

  return [...mapped, ...unmapped];
}

/** Rebuilds the suite tree containing exactly the given specs. */
function buildTree(located: LocatedSpec[]): Suite[] {
  const roots: Suite[] = [];

  const keyOf = (meta: SuiteMeta) => `${meta.file ?? ''}::${meta.title ?? ''}::${meta.line ?? ''}`;

  for (const { spec, path: suitePath } of located) {
    let siblings = roots;
    let parent: Suite | null = null;

    for (const meta of suitePath) {
      let node = siblings.find((suite) => keyOf(suiteMeta(suite)) === keyOf(meta));
      if (!node) {
        node = { ...meta };
        siblings.push(node);
      }
      parent = node;
      node.suites = node.suites ?? [];
      siblings = node.suites;
    }

    if (!parent) continue;
    parent.specs = parent.specs ?? [];
    parent.specs.push(spec);
  }

  const prune = (suites: Suite[]): Suite[] =>
    suites
      .map((suite) => {
        const nested = prune(suite.suites ?? []);
        const pruned: Suite = { ...suite };
        if (nested.length > 0) pruned.suites = nested;
        else delete pruned.suites;
        if (!pruned.specs?.length) delete pruned.specs;
        return pruned;
      })
      .filter((suite) => suite.specs || suite.suites);

  return prune(roots);
}

function countSpecs(suites: Suite[] = []): number {
  return suites.reduce(
    (total, suite) => total + (suite.specs?.length ?? 0) + countSpecs(suite.suites),
    0
  );
}

interface Args {
  inputs: string[];
  output: string;
}

function parseArgs(argv: string[]): Args | null {
  const inputs: string[] = [];
  let output = '';

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--out') {
      output = argv[++index] ?? '';
    } else if (arg.startsWith('--out=')) {
      output = arg.slice('--out='.length);
    } else {
      inputs.push(arg);
    }
  }

  // Legacy positional form, still used by the merge-extract-failures action:
  // <input> <output>, a single report and no cross-phase resolution.
  if (!output && inputs.length === 2) {
    return { inputs: [inputs[0]], output: inputs[1] };
  }

  if (!output || inputs.length === 0) return null;
  return { inputs, output };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args) {
    console.error(
      'Usage: filter-failed-tests-json.ts <input-json-path> <output-json-path>\n' +
        '       filter-failed-tests-json.ts --out <output> <report.json>...  (oldest phase first)'
    );
    process.exit(1);
  }

  const inputPaths = args.inputs.map((input) => path.resolve(input));
  const outputPath = path.resolve(args.output);

  for (const inputPath of inputPaths) {
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }
  }

  const reports: PlaywrightReport[] = inputPaths.map((inputPath) => {
    console.log(`Reading Playwright report from: ${inputPath}`);
    return JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  });

  const total = reports.reduce((sum, report) => sum + countSpecs(report.suites), 0);
  console.log(
    `Read ${reports.length} report(s) containing ${total} total tests` +
      (reports.length > 1 ? ' (resolved across phases, oldest first)' : '')
  );

  const failures = selectFailures(reports);

  // Everything outside `suites` (config, errors, stats) comes from the newest
  // report — it describes the run ai-heal is about to read traces from.
  const newest = reports[reports.length - 1];
  const filtered: PlaywrightReport = { ...newest, suites: buildTree(failures) };

  fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2), 'utf-8');

  console.log(`\nFiltered report contains ${failures.length} failed tests`);
  console.log(`Filtered report written to: ${outputPath}`);

  if (failures.length === 0) console.log('No failed tests found.');
}

if (require.main === module) {
  main();
}

export { selectFailures, verdictOf, isFailure, buildTree };
