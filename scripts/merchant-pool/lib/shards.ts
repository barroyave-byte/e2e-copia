import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface Selection {
  grep?: string;
  grepInvert?: string;
  project?: string;
}

/**
 * Spec files of a Playwright JSON --list report that will actually run, relative to the test dir.
 * A file whose tests are all fixme/skip (expectedStatus "skipped") never runs its beforeAll, so it
 * claims no merchant: counting it wasted ~205 merchants per regression (run 37725483883). A test
 * skipped at runtime is not visible here; it only leaves one merchant unused.
 */
export function runnableSpecFiles(report: any): string[] {
  const runnable = new Set<string>();
  const walk = (suite: any, file?: string) => {
    const current = suite.file ?? file;
    for (const spec of suite.specs ?? []) {
      const tests: any[] = spec.tests ?? [];
      if (!tests.length || tests.some((t) => t.expectedStatus !== 'skipped')) {
        runnable.add(spec.file ?? current);
      }
    }
    for (const child of suite.suites ?? []) walk(child, current);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return [...runnable].filter((f) => f && !/\.setup\.ts$/.test(f));
}

function specFiles(reportFile: string): string[] {
  return runnableSpecFiles(JSON.parse(fs.readFileSync(reportFile, 'utf8')));
}

function list(
  selection: Selection,
  shard: string | undefined,
  out: string,
  signal?: AbortSignal
): Promise<void> {
  const args = [
    'playwright',
    'test',
    '--list',
    '--reporter=json',
    `--project=${selection.project ?? 'chromium'}`,
  ];
  if (selection.grep) args.push('--grep', selection.grep);
  if (selection.grepInvert) args.push('--grep-invert', selection.grepInvert);
  if (shard) args.push(`--shard=${shard}`);
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('listing aborted'));
    // Own process group, so an abort kills npx and the Playwright process it starts.
    const child = spawn('npx', args, {
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: out },
      stdio: 'ignore',
      detached: true,
    });
    const abort = () => {
      try {
        process.kill(-child.pid!, 'SIGKILL');
      } catch {
        // already gone
      }
      reject(new Error('listing aborted'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', reject);
    child.on('exit', (code) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) return;
      // --list exits 0; a non-zero exit with no report means the selection itself failed.
      if (code !== 0 && !fs.existsSync(out)) reject(new Error(`playwright --list exited ${code}`));
      else resolve();
    });
  });
}

/**
 * Asks Playwright itself which files each shard runs, instead of re-implementing its sharding:
 * the assignment depends on test counts and grouping rules that change between versions.
 * Measured: 80 shards in ~110s with 8 in parallel on a laptop.
 */
export async function filesByShard(
  selection: Selection,
  shardTotal: number,
  concurrency = Math.max(2, os.cpus().length),
  signal?: AbortSignal
): Promise<Map<number, string[]>> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchant-pool-shards-'));
  const shards = Array.from({ length: shardTotal }, (_, i) => i + 1);
  const result = new Map<number, string[]>();
  let next = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, shardTotal) }, async () => {
        while (next < shards.length) {
          const shard = shards[next++];
          const out = path.join(dir, `shard-${shard}.json`);
          await list(selection, `${shard}/${shardTotal}`, out, signal);
          result.set(shard, specFiles(out));
        }
      })
    );
    return result;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** All selected spec files (one --list, ~15s): enough to size the stock before the shards are known. */
export async function allFiles(selection: Selection, signal?: AbortSignal): Promise<string[]> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchant-pool-all-'));
  const out = path.join(dir, 'all.json');
  try {
    await list(selection, undefined, out, signal);
    return specFiles(out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
