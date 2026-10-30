// Usage: npm run merchant-pool:canary -- --key KUSHKI_PROCESSOR_MX \
//          [--workers 8] [--shared-workers 8] [--repeat 2] [--baseline-report test-results.json] [--out-dir dir]
//
// Gate for a new MERCHANT_POOL entry (docs/merchant-pool-plan.md, section 4.9). Runs the specs that
// use the entry twice against the current environment:
//   1. worker mode: no manifest, each worker provisions its own pooled merchant;
//   2. shared mode: the entry's replicas provisioned first, --repeat-each over several workers,
//      so the replicas take concurrent traffic as in CI.
// The entry passes when neither run has an integrity failure, every failing spec was already
// failing in the baseline report (a merged regression JSON), and every spec took its merchant from
// the pool and passed at least once; otherwise it is INCONCLUSIVE (exit 3), never a pass.
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isMerchantPoolKey } from '@support/merchantPool';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const key = arg('key');
if (!key || !isMerchantPoolKey(key)) throw new Error('--key <MERCHANT_POOL key> is required');
const workers = arg('workers') ?? '8';
// Shared mode hits one replica from every worker: it can run wider than worker mode, where each
// worker creates its own merchant (and, for PayPal, its own webhook).
const sharedWorkers = arg('shared-workers') ?? workers;
const repeat = arg('repeat') ?? '2';
const outDir = arg('out-dir') ?? fs.mkdtempSync(path.join(os.tmpdir(), `canary-${key}-`));

function specsUsing(k: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (
        e.name.endsWith('.spec.ts') &&
        fs.readFileSync(full, 'utf8').includes(`acquire('${k}')`)
      )
        out.push(full);
    }
  };
  walk('playwright/tests');
  return out;
}

/** Never rejects: Playwright exits non-zero whenever a test fails, and the report says why. */
function run(
  cmd: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) =>
    execFile(
      cmd,
      args,
      { env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024 },
      (error, stdout, stderr) =>
        resolve({
          code: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
          stdout,
          stderr,
        })
    )
  );
}

interface Outcome {
  byFile: Map<string, { passed: number; failed: number; skipped: number }>;
  integrity: number;
  created: number;
  sources: Record<string, number>;
}

function read(report: string): Outcome {
  const r = JSON.parse(fs.readFileSync(report, 'utf8'));
  const o: Outcome = { byFile: new Map(), integrity: 0, created: 0, sources: {} };
  const walk = (n: any, file?: string) => {
    if (!n || typeof n !== 'object') return;
    const f = n.file ?? file;
    if (Array.isArray(n.results) && n.status !== undefined && !/\.setup\.ts$/.test(f)) {
      for (const x of n.results) {
        const e = o.byFile.get(f) ?? { passed: 0, failed: 0, skipped: 0 };
        // A skipped (fixme) test proves nothing either way: it is neither a pass nor a failure.
        if (x.status === 'passed') e.passed++;
        else if (x.status === 'skipped') e.skipped++;
        else e.failed++;
        o.byFile.set(f, e);
        const text = [...(x.stdout ?? []), ...(x.stderr ?? [])]
          .map((s: any) => s.text ?? '')
          .join('');
        o.created += (text.match(/^Creating basic merchant setup/gm) ?? []).length;
        for (const m of text.matchAll(/\[merchant-pool\] (\{[^\n]*\})/g)) {
          const line = JSON.parse(m[1]);
          // Only acquisitions carry a source. Release lines come from worker teardown, which the
          // JSON report does not keep: release is checked on the release.ts run below.
          if (line.source) o.sources[line.source] = (o.sources[line.source] ?? 0) + 1;
        }
        if (/changed the processors of a shared merchant/.test(x.error?.message ?? ''))
          o.integrity++;
      }
    }
    for (const k of ['suites', 'specs', 'tests']) (n[k] ?? []).forEach((c: any) => walk(c, f));
  };
  (r.suites ?? []).forEach((s: any) => walk(s));
  return o;
}

function baselineFailures(report?: string): Set<string> {
  if (!report) return new Set();
  const failing = new Set<string>();
  for (const [file, e] of read(report).byFile) if (e.failed) failing.add(file);
  return failing;
}

async function main() {
  const files = specsUsing(key!);
  if (!files.length) throw new Error(`No spec uses ${key}: migrate the group first`);
  const known = baselineFailures(arg('baseline-report'));
  const playwright = (
    extra: string[],
    report: string,
    env: NodeJS.ProcessEnv = {},
    workerCount: string = workers
  ) =>
    run(
      'npx',
      [
        'playwright',
        'test',
        ...files,
        '--project=chromium',
        `--workers=${workerCount}`,
        '--retries=0',
        '--reporter=json',
        ...extra,
      ],
      {
        PLAYWRIGHT_JSON_OUTPUT_NAME: report,
        MERCHANT_POOL_MANIFEST: '',
        ...env,
      }
    );

  console.log(`[canary] ${key}: ${files.length} specs, ${workers} workers, repeat ${repeat}`);
  const workerReport = path.join(outDir, 'worker.json');
  await playwright([], workerReport);

  const manifest = path.join(outDir, 'manifest.json');
  await run(
    'npx',
    [
      'ts-node',
      '-r',
      'tsconfig-paths/register',
      'scripts/merchant-pool/cli/provision.ts',
      '--out',
      manifest,
      '--keys',
      key!,
    ],
    {}
  );
  const sharedReport = path.join(outDir, 'shared.json');
  await playwright(
    [`--repeat-each=${repeat}`],
    sharedReport,
    { MERCHANT_POOL_MANIFEST: manifest },
    sharedWorkers
  );
  // Entries holding an external quota (PayPal webhooks) must not leave their processors behind.
  const release = await run(
    'npx',
    [
      'ts-node',
      '-r',
      'tsconfig-paths/register',
      'scripts/merchant-pool/cli/release.ts',
      '--manifest',
      manifest,
    ],
    {}
  );
  fs.rmSync(manifest, { force: true }); // it holds merchant private keys
  // release.ts logs merchant and processor ids only, never the manifest's keys.
  for (const line of release.stdout.split('\n').filter((l) => l.startsWith('[merchant-pool]')))
    console.log(`[canary] ${line}`);

  let verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE' = 'PASS';
  if (release.code !== 0) {
    // An entry whose processors cannot be released keeps its external quota: not proven.
    verdict = 'INCONCLUSIVE';
    console.log(`[canary] release.ts exited ${release.code}: processors may be left behind`);
  }
  for (const [label, report] of [
    ['worker', workerReport],
    ['shared', sharedReport],
  ] as const) {
    const o = read(report);
    const failing = [...o.byFile].filter(([, e]) => e.failed);
    const unexplained = failing.filter(
      ([f]) => ![...known].some((k) => k.endsWith(f) || f.endsWith(k))
    );
    const passed = [...o.byFile.values()].reduce((a, e) => a + e.passed, 0);
    const skipped = [...o.byFile.values()].reduce((a, e) => a + e.skipped, 0);
    const total = [...o.byFile.values()].reduce((a, e) => a + e.passed + e.failed + e.skipped, 0);
    console.log(
      `[canary] ${label}: ${passed}/${total} passed (${skipped} skipped) | integrity failures ${o.integrity} | ` +
        `merchants created by workers ${o.created} | pool ${JSON.stringify(o.sources)}`
    );
    for (const [f, e] of failing) {
      const tag = unexplained.some(([u]) => u === f) ? 'NEW' : 'known';
      console.log(`[canary]   ${tag} ${f} (${e.failed} failed, ${e.passed} passed)`);
    }
    if (o.integrity || unexplained.length) verdict = 'FAIL';
    // Every file must have taken its merchant from the pool and passed at least once, or the run
    // says nothing about the pool: all skipped, or all failing before beforeAll reached acquire().
    const acquisitions = Object.values(o.sources).reduce((a, n) => a + n, 0);
    const provenFiles = [...o.byFile.values()].filter((e) => e.passed > 0).length;
    if (verdict === 'PASS' && (acquisitions < files.length || provenFiles < files.length)) {
      verdict = 'INCONCLUSIVE';
      console.log(
        `[canary]   ${label}: only ${provenFiles}/${files.length} specs passed and ${acquisitions} used the pool`
      );
    }
  }
  console.log(`[canary] ${key}: ${verdict} (reports in ${outDir})`);
  process.exit(verdict === 'PASS' ? 0 : verdict === 'FAIL' ? 1 : 3);
}

main().catch((error) => {
  console.error('[canary] aborted:', error);
  process.exit(2);
});
