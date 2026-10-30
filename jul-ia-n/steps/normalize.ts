import { posix } from 'path';

export interface NormalizedFailure {
  testCaseId: string | null;
  title: string;
  /** Repo-root-relative (e.g. "playwright/tests/PSP/.../PI-T629.spec.ts") — resolvable by read_file/run_test/verify and the allowlist, unlike Playwright's raw report `file`, which is testDir-relative. */
  file: string;
  line: number;
  tags: string[];
  duration: number;
  retry: number;
  totalAttempts: number;
  allAttemptsFailed: boolean;
  failedStep: string;
  failureLocation: 'test' | 'beforeAll' | 'beforeEach';
  error: string;
  errorCode: string | null;
  httpStatus: number | null;
  /** Absolute path to trace.zip extracted from attachments[name=='trace'] of the last failed result. Null if not present. */
  tracePath: string | null;
  /** Absolute path to error-context.md extracted from attachments[name=='error-context'] of the last failed result. Null if not present. */
  errorContextPath: string | null;
  /** Concatenated text from results[].stdout[].text of the last failed result. Empty string if absent. */
  stdoutText: string;
  /** Concatenated text from results[].stderr[].text of the last failed result. Empty string if absent. */
  stderrText: string;
}

export interface NormalizeResult {
  failedTests: NormalizedFailure[];
  output: string;
}

// Playwright's JSON reporter emits spec.file relative to playwright.config.ts's
// testDir, not the repo root — must be re-anchored before it's usable by
// read_file/run_test/verify/the path allowlist (all of which are repo-root-relative).
const TEST_DIR = 'playwright/tests';

// Prefix is letters with optional digits (e.g. PI, ADM, PAYM, ENTP1, PLAT, CHKOUT, PF, QA)
const TEST_CASE_ID_REGEX = /@([A-Z][A-Z0-9]*-T\d+)/;
// Same shape but @ optional, used to extract from filenames like "ENTP1-T2453.spec.ts"
const TEST_CASE_ID_LOOSE_REGEX = /\b([A-Z][A-Z0-9]*-T\d+)\b/;
const DEUNA_ERROR_CODE_REGEX = /\bDP-\d{4}\b/;
const HTTP_STATUS_REGEX = /\b(?:status(?:\s+code)?|received|got|HTTP)\s*[:=]?\s*(\d{3})\b/i;
const PARENS_HTTP_REGEX = /\((\d{3})\)/;

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

const cleanTitle = (title: string): string => {
  if (!title) return '';
  // Drop leading "@TAG-T123 " token if present, then trim leading separators (" - ", ": ", etc.)
  return title
    .replace(/^@[A-Z][A-Z0-9]*-T\d+\s*/, '')
    .replace(/^[\s\-:|·•]+/, '')
    .trim();
};

const extractTestCaseId = (title: string, file: string): string | null => {
  // Primary source: @ID embedded in spec.title (e.g. "@PI-T123 Some test")
  const titleMatch = title?.match(TEST_CASE_ID_REGEX);
  if (titleMatch) return titleMatch[1];
  // Fallback: filename convention — each spec file is named after its test case ID
  // (e.g. "playwright/tests/.../ENTP1-T2453.spec.ts")
  const fileMatch = file?.match(TEST_CASE_ID_LOOSE_REGEX);
  return fileMatch ? fileMatch[1] : null;
};

const findStepErrorMessage = (steps: any[] | undefined): string | null => {
  if (!steps?.length) return null;
  // Walk in reverse: deepest/last failure carries the most signal
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.error?.message) return step.error.message;
    const nested = findStepErrorMessage(step.steps);
    if (nested) return nested;
  }
  return null;
};

const HOOK_TITLE_TO_LOCATION: Record<string, 'beforeAll' | 'beforeEach'> = {
  'before all': 'beforeAll',
  beforeall: 'beforeAll',
  'before each': 'beforeEach',
  beforeeach: 'beforeEach',
};

const detectHookLocation = (
  steps: any[] | undefined,
): 'beforeAll' | 'beforeEach' | null => {
  if (!steps?.length) return null;
  for (const step of steps) {
    if (step.category === 'hook' || step.title) {
      const normalized = (step.title || '').toString().trim().toLowerCase();
      const mapped = HOOK_TITLE_TO_LOCATION[normalized];
      if (mapped && stepHasError(step)) return mapped;
    }
  }
  return null;
};

const stepHasError = (step: any): boolean => {
  if (step?.error) return true;
  if (!step?.steps?.length) return false;
  return step.steps.some(stepHasError);
};

const findDeepestFailingStepTitle = (steps: any[] | undefined): string | null => {
  if (!steps?.length) return null;
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    const nested = findDeepestFailingStepTitle(step.steps);
    if (nested) return nested;
    if (step.error && step.title) return step.title;
  }
  return null;
};

const extractErrorCode = (text: string): string | null => {
  const match = text.match(DEUNA_ERROR_CODE_REGEX);
  return match ? match[0] : null;
};

const extractHttpStatus = (text: string): number | null => {
  const explicit = text.match(HTTP_STATUS_REGEX);
  if (explicit) return Number(explicit[1]);
  const parens = text.match(PARENS_HTTP_REGEX);
  if (parens) {
    const code = Number(parens[1]);
    if (code >= 100 && code < 600) return code;
  }
  return null;
};

const extractAttachmentPath = (
  attachments: any[] | undefined,
  name: string,
): string | null => {
  if (!attachments?.length) return null;
  const att = attachments.find((a) => a?.name === name);
  return att?.path ?? null;
};

const joinIoChunks = (chunks: any[] | undefined): string => {
  if (!chunks?.length) return '';
  return chunks
    .map((c) => (typeof c === 'string' ? c : (c?.text ?? '')))
    .join('');
};

const findAllSpecs = (suites: any[]): any[] => {
  const allSpecs: any[] = [];
  for (const suite of suites) {
    if (suite.specs?.length) allSpecs.push(...suite.specs);
    if (suite.suites?.length) allSpecs.push(...findAllSpecs(suite.suites));
  }
  return allSpecs;
};

export const normalize = (jsonInput: string): NormalizeResult => {
  const data = JSON.parse(jsonInput);
  const allSpecs = findAllSpecs(data.suites || []);

  const failedTests: NormalizedFailure[] = allSpecs
    .filter((spec) => {
      if (spec.ok === true) return false;
      return spec.tests?.some((t: any) => (t.results || []).length > 0);
    })
    .map((spec): NormalizedFailure => {
      const test = spec.tests[0];
      // Prefer the LAST failed result (after retries) — that's the most representative error
      const failedResults = test.results.filter((r: any) => r.status === 'failed');
      const failedResult = failedResults[failedResults.length - 1] || test.results[test.results.length - 1];
      const allFailed = test.results.every((r: any) => r.status === 'failed');

      let failedStep: any = null;
      let failureLocation: NormalizedFailure['failureLocation'] = 'test';

      if (failedResult?.steps?.length) {
        // Playwright wraps hook failures in a top-level step with category === 'hook'
        // and title "before all" / "before each". Detect that first.
        const hookLocation = detectHookLocation(failedResult.steps);
        if (hookLocation) {
          failureLocation = hookLocation;
        } else {
          failedStep =
            failedResult.steps.find((step: any) => step.error) ||
            failedResult.steps[failedResult.steps.length - 1];
        }
      } else {
        const errorStack = failedResult?.error?.stack || '';
        if (errorStack.includes('test.beforeAll') || errorStack.includes('beforeAll')) {
          failureLocation = 'beforeAll';
        } else if (errorStack.includes('beforeEach')) {
          failureLocation = 'beforeEach';
        }
      }

      const rawError =
        failedStep?.error?.message ||
        findStepErrorMessage(failedResult?.steps) ||
        failedResult?.error?.message ||
        failedResult?.error?.stack ||
        'No error message';
      const cleanError = stripAnsi(rawError).replace(/\s+/g, ' ').trim();
      const tags: string[] = spec.tags || [];

      return {
        testCaseId: extractTestCaseId(spec.title, spec.file),
        title: cleanTitle(spec.title),
        file: posix.join(TEST_DIR, spec.file),
        line: spec.line,
        tags,
        duration: failedResult?.duration || 0,
        retry: failedResult?.retry || 0,
        totalAttempts: test.results.length,
        allAttemptsFailed: allFailed,
        failedStep: failedStep
          ? failedStep.title
          : failureLocation !== 'test'
            ? `Hook: ${failureLocation}`
            : 'N/A',
        failureLocation,
        error: cleanError,
        errorCode: extractErrorCode(cleanError),
        httpStatus: extractHttpStatus(cleanError),
        tracePath: extractAttachmentPath(failedResult?.attachments, 'trace'),
        errorContextPath: extractAttachmentPath(
          failedResult?.attachments,
          'error-context',
        ),
        stdoutText: joinIoChunks(failedResult?.stdout),
        stderrText: joinIoChunks(failedResult?.stderr),
      };
    });

  let output = `FAILED TESTS: ${failedTests.length}\n\n`;
  failedTests.forEach((t, i) => {
    output += `${i + 1}. ${t.title}\n`;
    output += `TestCaseId: ${t.testCaseId ?? 'UNKNOWN'}\n`;
    output += `File: ${t.file}:${t.line}\n`;
    output += `Tags: ${t.tags.join(', ')}\n`;
    output += `Attempts: ${t.totalAttempts} ${t.allAttemptsFailed ? '(all failed)' : '(mixed — possibly flaky)'}\n`;
    if (t.errorCode) output += `DeunaErrorCode: ${t.errorCode}\n`;
    if (t.httpStatus !== null) output += `HttpStatus: ${t.httpStatus}\n`;
    if (t.failedStep !== 'N/A') output += `Step: ${t.failedStep}\n`;
    output += `Error: ${t.error}\n---\n\n`;
  });

  return { failedTests, output };
};

export const normalizeToString = (jsonInput: string): string => normalize(jsonInput).output;
