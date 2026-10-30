import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { FileChange } from '../schemas/proposal';
import { pLimit } from '../util/concurrency';

export interface RunTestOptions {
  specPath: string;
  repeat?: number;
  project?: string;
  timeoutMs?: number;
  cwd?: string;
  extraArgs?: string[];
}

export interface ReRunSummary {
  passed: number;
  failed: number;
  total: number;
  durations: number[];
  errors: string[];
  rawJson: string;
  /**
   * The child process's raw stdout — separate from rawJson (which is the
   * JSON report file's content when available, not stdout). This is where a
   * test's own console.log HTTP request/response logging lands, and it's the
   * only evidence a PASSING attempt leaves behind: CI mode (forced below)
   * disables screenshot/trace/video unless a test actually fails, so there's
   * no artifact to point to otherwise. Interleaved across all `repeat`
   * attempts when repeat > 1 — callers that need per-attempt evidence, not
   * just "some passing attempt produced this ID", would need a different
   * capture strategy.
   */
  stdout: string;
}

// Legacy fallback ONLY (see runTest): finds the bounds of the JSON object
// that ENDS at stdout's last '}', by walking backward tracking brace depth.
// This is fundamentally unreliable — a failing test's error message routinely
// embeds a JSON.stringify'd API error payload (e.g. PaymentService.ts wraps
// PSP errors as `Purchase V2 failed: ${JSON.stringify(error)}`), and those
// embedded braces are indistinguishable from structural ones to a raw
// character scan. That can make the scan land on the wrong (but still
// self-balanced) inner object — e.g. just the "stats" block, which has no
// "suites" key — silently producing a false "0 total" instead of a parse
// error. Confirmed reproducing exactly this on a real PSP-decline re-run.
// Do not rely on this path in normal operation — see PLAYWRIGHT_JSON_OUTPUT_FILE below.
const findJsonBounds = (stdout: string): { start: number; end: number } | null => {
  const end = stdout.lastIndexOf('}');
  if (end === -1) return null;
  let depth = 0;
  for (let i = end; i >= 0; i--) {
    const ch = stdout[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      depth--;
      if (depth === 0) return { start: i, end };
    }
  }
  return null;
};

// Only count tests belonging to the requested project. The `chromium`
// project `dependencies: ['setup']` (playwright.config.ts), so every run
// also executes the setup project's own auth test — without this filter its
// single "passed" result gets mixed into the same passed/failed/total tally
// as the actual re-runs, corrupting verify's ready-to-pr accounting (e.g. 3
// repeats with 1 retry each can report "1 passed" from setup alongside 6
// chromium failures as if they were 7 undifferentiated attempts).
const summarizeReport = (
  data: any,
  project: string
): Omit<ReRunSummary, 'rawJson' | 'stdout' | 'errors'> & { errors: string[] } => {
  const durations: number[] = [];
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  const walkSuites = (suites: any[]): void => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          if (test.projectName !== project) {
            // A failed dependency project (e.g. `setup` with no browser
            // installed) leaves every test of `project` with no results at
            // all. Its error is the only explanation of why nothing ran, so
            // keep it even though it doesn't count toward the tally.
            for (const result of test.results ?? []) {
              if (
                result.status !== 'passed' &&
                result.status !== 'skipped' &&
                result.error?.message
              ) {
                const message = `[${test.projectName} project] ${result.error.message}`;
                if (!errors.includes(message)) errors.push(message);
              }
            }
            continue;
          }
          for (const result of test.results ?? []) {
            durations.push(result.duration ?? 0);
            if (result.status === 'passed') {
              passed++;
            } else {
              failed++;
              if (result.error?.message) errors.push(result.error.message);
            }
          }
        }
      }
      if (suite.suites?.length) walkSuites(suite.suites);
    }
  };
  walkSuites(data.suites ?? []);

  // Global report-level errors (e.g. a TypeScript/syntax error in the applied
  // file that prevented Playwright from even collecting any test) land in
  // the top-level `errors[]`, separate from per-result errors. Without this,
  // a broken file silently produces a "0 total, no errors" report — exactly
  // as unhelpful as the stdout-parsing bug this file was already fixed for.
  for (const e of data.errors ?? []) {
    const message = e?.message ?? (typeof e === 'string' ? e : JSON.stringify(e));
    if (message) errors.push(`[report-level error] ${message}`);
  }

  return { passed, failed, total: passed + failed, durations, errors };
};

/** Parses a Playwright JSON report read directly from PLAYWRIGHT_JSON_OUTPUT_FILE — no stdout noise to work around. */
const parseReportFile = (
  content: string,
  project: string,
  fallbackTotal: number
): Omit<ReRunSummary, 'rawJson' | 'stdout'> => {
  try {
    return summarizeReport(JSON.parse(content), project);
  } catch (err) {
    return {
      passed: 0,
      failed: fallbackTotal,
      total: fallbackTotal,
      durations: [],
      errors: [`Could not parse Playwright JSON report file: ${(err as Error).message}`],
    };
  }
};

/** Fallback for when the reporter never flushed a file (e.g. crash before init) — see findJsonBounds caveats above. */
const parsePlaywrightJsonFromStdout = (
  stdout: string,
  project: string,
  fallbackTotal: number
): Omit<ReRunSummary, 'rawJson' | 'stdout'> => {
  const bounds = findJsonBounds(stdout);
  if (!bounds) {
    return {
      passed: 0,
      failed: fallbackTotal,
      total: fallbackTotal,
      durations: [],
      errors: ['Playwright did not return a JSON report (no output file, no parseable stdout)'],
    };
  }
  return parseReportFile(stdout.slice(bounds.start, bounds.end + 1), project, fallbackTotal);
};

/**
 * Null when Playwright's Chromium is installed where the runner will look for
 * it (honours PLAYWRIGHT_BROWSERS_PATH), otherwise a message saying why every
 * re-run would be a 0/0 no-op. Checked before verify spends a worktree on a
 * run that cannot execute a single test — the CI ai-heal job ran for months
 * without browsers and reported every proposed fix as failed.
 */
export const missingBrowserReason = (): string | null => {
  let executable: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    executable = require('@playwright/test').chromium.executablePath();
  } catch (err) {
    return `Could not resolve the Playwright Chromium executable: ${(err as Error).message}`;
  }
  if (existsSync(executable)) return null;
  return (
    `Playwright Chromium is not installed (expected at ${executable}). ` +
    `Run \`npx playwright install chromium\` in the environment that runs ai-heal.`
  );
};

export const runTest = (opts: RunTestOptions): Promise<ReRunSummary> => {
  const {
    specPath,
    repeat = 3,
    project = 'chromium',
    timeoutMs = 5 * 60 * 1000,
    cwd = process.cwd(),
    extraArgs = [],
  } = opts;

  const args = [
    'playwright',
    'test',
    specPath,
    `--repeat-each=${repeat}`,
    `--project=${project}`,
    '--reporter=json',
    ...extraArgs,
  ];

  // Tell Playwright's json reporter to write straight to a file instead of
  // stdout. Without this, stdout also carries dotenv's banner, teardown
  // logs, and any test-level console output — all mixed in with the JSON
  // report, which the old brace-scanning parser tried (and, confirmed on a
  // real run, sometimes failed) to untangle. The file only ever contains the
  // report, so no scanning/guessing is needed.
  const reportPath = join(tmpdir(), `ai-heal-report-${randomUUID()}.json`);

  return new Promise((resolve) => {
    const proc = spawn('npx', args, {
      cwd,
      env: { ...process.env, CI: 'true', PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.on('close', async () => {
      clearTimeout(timer);

      let reportContent: string | null = null;
      try {
        reportContent = await readFile(reportPath, 'utf-8');
      } catch {
        // reporter never flushed the file (e.g. crashed before init) — fall
        // back to the best-effort stdout scan below.
      }

      const parsed = reportContent
        ? parseReportFile(reportContent, project, repeat)
        : parsePlaywrightJsonFromStdout(stdout, project, repeat);

      if (parsed.total === 0 && stderr) {
        parsed.errors.push(stderr.slice(0, 2000));
      }

      await rm(reportPath, { force: true }).catch(() => {});
      resolve({ ...parsed, rawJson: reportContent ?? stdout, stdout });
    });
  });
};

export interface WorktreeHandle {
  path: string;
  branch: string;
  cleanup: () => Promise<void>;
}

const runGit = (args: string[], cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git ${args.join(' ')} exited with ${code}`));
    });
  });

// `git worktree add` only checks out tracked files — node_modules and .env are
// both gitignored, so without this the worktree has no `playwright` binary to
// run and no credentials/env URLs for the test to hit. Symlinking (not
// copying) keeps this cheap and avoids duplicating secrets on disk.
const SHARED_RESOURCES = ['node_modules', '.env'];

const linkSharedResources = async (repoCwd: string, worktreeDir: string): Promise<void> => {
  for (const resource of SHARED_RESOURCES) {
    const source = join(repoCwd, resource);
    if (!existsSync(source)) continue;
    try {
      await symlink(source, join(worktreeDir, resource));
    } catch {
      // best-effort — a missing symlink surfaces as a normal test failure
      // (e.g. "playwright: command not found") rather than crashing verify.
    }
  }
};

export const createWorktree = async (
  baseBranch: string,
  newBranch: string,
  repoCwd: string = process.cwd()
): Promise<WorktreeHandle> => {
  const dir = await mkdtemp(join(tmpdir(), 'ai-heal-worktree-'));
  await runGit(['worktree', 'add', '-b', newBranch, dir, baseBranch], repoCwd);
  await linkSharedResources(repoCwd, dir);

  return {
    path: dir,
    branch: newBranch,
    cleanup: async () => {
      try {
        await runGit(['worktree', 'remove', '--force', dir], repoCwd);
      } catch {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
};

// Shared by steps/verify.ts (the authoritative pre-PR gate) and the run_test
// agent tool (tools/subagentTools.ts, a cheap mid-loop check) — one copy so a
// change to how a FileChange gets applied to disk can't silently diverge
// between the two.
export const applyFileChange = async (worktreeRoot: string, change: FileChange): Promise<void> => {
  const fullPath = join(worktreeRoot, change.path);
  if (change.action === 'delete') {
    try {
      await unlink(fullPath);
    } catch {
      // file might not exist; ignore
    }
    return;
  }
  if (!change.contents) {
    throw new Error(`Cannot ${change.action} ${change.path} without contents`);
  }
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, change.contents, 'utf-8');
};

export interface RunIsolatedOptions {
  fileChanges: FileChange[];
  specFile: string;
  testCaseId: string;
  baseBranch?: string;
  repoCwd?: string;
  repeat?: number;
  project?: string;
  timeoutMs?: number;
}

// Separate, smaller concurrency budget from steps/verify.ts's own
// AI_HEAL_VERIFY_CONCURRENCY — this runs INSIDE an agent's reasoning loop
// (agents/subagents/index.ts, assertFixer/testDataFixer's run_test tool),
// potentially several times per case, on top of whatever the final verify
// step is already running. Two independent, deliberately small semaphores
// bound both phases of real-Playwright-run concurrency without threading one
// shared limiter through heal.ts -> agents/subagents -> tools/subagentTools.
const AGENT_CHECK_CONCURRENCY = Math.max(
  1,
  Number(process.env.AI_HEAL_AGENT_VERIFY_CONCURRENCY || '2')
);
const agentCheckLimit = pLimit(AGENT_CHECK_CONCURRENCY);

/**
 * One-shot "apply this candidate diff to a throwaway worktree and run the
 * real test once" — the building block behind assertFixer/testDataFixer's
 * run_test tool. Not used by steps/verify.ts, which has its own repeat-count/
 * majority-vote logic; this is deliberately simpler (default repeat=1) since
 * it's meant to be called multiple times cheaply during reasoning, not to be
 * the final gate.
 */
export const runIsolated = (opts: RunIsolatedOptions): Promise<ReRunSummary> =>
  agentCheckLimit(async () => {
    const baseBranch = opts.baseBranch ?? process.env.AI_HEAL_BASE_BRANCH ?? 'develop';
    const repoCwd = opts.repoCwd ?? process.cwd();
    const branchName = `ai-heal-agent-check/${opts.testCaseId}-${randomUUID()}`;

    const worktree = await createWorktree(baseBranch, branchName, repoCwd);
    try {
      for (const change of opts.fileChanges) {
        await applyFileChange(worktree.path, change);
      }
      return await runTest({
        specPath: opts.specFile,
        repeat: opts.repeat ?? 1,
        project: opts.project ?? 'chromium',
        timeoutMs: opts.timeoutMs ?? 5 * 60 * 1000,
        cwd: worktree.path,
      });
    } finally {
      await worktree.cleanup();
    }
  });
