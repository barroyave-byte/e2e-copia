// Usage: npm run merchant-pool:report -- <test-results.json> [more.json ...]
//
// Summarizes how a regression provisioned merchants, from the merged Playwright JSON report
// (artifact `playwright-json-report-all` of regression_tests.yml). Works on runs from before
// phase 0 too: the admin-login and merchant-attempt counts come from log lines that already
// existed. See docs/merchant-pool-plan.md, section 3.5.
import * as fs from 'fs';

interface Output {
  text?: string;
  buffer?: string;
}
interface ProvisioningLine {
  outcome: 'created' | 'failed';
  failedStep?: string;
  totalMs: number;
  stepsMs: Record<string, number>;
}

const MERCHANT_URL = /^\/merchants(\/[^/]+\/(stores|applications))?$|^\/merchants\/login$/;

function outputText(entries: Output[] | undefined): string {
  return (entries ?? [])
    .map((e) => e.text ?? (e.buffer ? Buffer.from(e.buffer, 'base64').toString('utf8') : ''))
    .join('');
}

function percentile(sorted: number[], p: number): number | null {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : null;
}

function* results(node: any): Generator<any> {
  if (Array.isArray(node)) {
    for (const child of node) yield* results(child);
  } else if (node && typeof node === 'object') {
    if (Array.isArray(node.results) && node.status !== undefined) {
      for (const result of node.results) yield result;
    }
    for (const key of ['suites', 'specs', 'tests']) if (node[key]) yield* results(node[key]);
  }
}

function summarize(file: string) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const counts = {
    attempts: 0,
    adminLogins: 0,
    merchantsAttempted: 0,
    httpRetries: 0,
    setupFailuresInErrors: 0,
    poolAcquisitions: 0,
    poolIntegrityFailures: 0,
  };
  const poolBySource: Record<string, number> = {};
  const poolMerchants = new Set<string>();
  const lines: ProvisioningLine[] = [];
  const merchantHttpErrors = new Map<string, number>();

  for (const result of results(report.suites)) {
    counts.attempts += 1;
    const out = outputText(result.stdout) + outputText(result.stderr);
    for (const line of out.split('\n')) {
      if (line.startsWith('Getting merchant token')) counts.adminLogins += 1;
      else if (line.startsWith('Creating basic merchant setup')) counts.merchantsAttempted += 1;
      else if (line.startsWith('[HTTP Retry]')) counts.httpRetries += 1;
      else if (line.startsWith('[merchant-pool] {')) {
        const acquired = JSON.parse(line.slice('[merchant-pool] '.length));
        counts.poolAcquisitions += 1;
        poolBySource[acquired.source] = (poolBySource[acquired.source] ?? 0) + 1;
        poolMerchants.add(acquired.merchantId);
      } else if (line.startsWith('[merchant-provisioning] ')) {
        lines.push(JSON.parse(line.slice('[merchant-provisioning] '.length)));
      }
    }
    // "[HTTP Response Error] { ... status ..., url ... }" is a multi-line JSON block.
    for (const block of out.split('[HTTP Response Error]').slice(1)) {
      const status = /"status":\s*(\d+)/.exec(block)?.[1];
      const url = /"url":\s*"([^"]+)"/.exec(block)?.[1];
      if (!status || !url) continue;
      const path = url.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '{id}');
      if (!MERCHANT_URL.test(path.replace('{id}', 'x'))) continue;
      const key = `${status} ${path}`;
      merchantHttpErrors.set(key, (merchantHttpErrors.get(key) ?? 0) + 1);
    }
    const errorText = [result.error?.message, ...(result.errors ?? []).map((e: any) => e.message)]
      .filter(Boolean)
      .join('\n');
    if (errorText.includes('changed the processors of a shared merchant')) {
      counts.poolIntegrityFailures += 1;
    }
    if (errorText.includes('Failed to create basic merchant setup')) {
      counts.setupFailuresInErrors += 1;
    }
  }

  const created = lines.filter((l) => l.outcome === 'created');
  const stepMs = (step: string) => {
    const values = created
      .map((l) => (step === 'total' ? l.totalMs : l.stepsMs[step]))
      .filter((v) => v !== undefined)
      .sort((a, b) => a - b);
    return {
      p50: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      max: values.at(-1) ?? null,
    };
  };
  const failedByStep: Record<string, number> = {};
  for (const l of lines.filter((l) => l.outcome === 'failed')) {
    failedByStep[l.failedStep ?? 'unknown'] = (failedByStep[l.failedStep ?? 'unknown'] ?? 0) + 1;
  }

  return {
    file,
    ...counts,
    poolBySource,
    poolDistinctMerchants: poolMerchants.size,
    provisioningLines: lines.length,
    created: created.length,
    failedByStep,
    msPerStep: lines.length
      ? {
          total: stepMs('total'),
          create: stepMs('create'),
          store: stepMs('store'),
          applications: stepMs('applications'),
        }
      : null,
    merchantHttpErrors: Object.fromEntries(
      [...merchantHttpErrors.entries()].sort((a, b) => b[1] - a[1])
    ),
  };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: npx ts-node scripts/merchant-pool/cli/report.ts <test-results.json> ...');
  process.exit(1);
}
for (const file of files) console.log(JSON.stringify(summarize(file), null, 2));
