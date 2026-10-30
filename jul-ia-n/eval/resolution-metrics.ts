import 'dotenv/config';

import { readFileSync } from 'fs';
import { resolve } from 'path';

import { computeResolutionMetrics, formatResolutionMetrics } from '../steps/metrics';
import { logResolutionMetrics } from '../util/tracing';

/**
 * Recomputes the four-tier %-resolved breakdown from an existing
 * telemetry/runs/*.json file — for historical runs (written before this
 * metric existed) or ad-hoc inspection, without re-running the pipeline.
 *
 *   npm run ai-heal:metrics -- --run jul-ia-n/telemetry/runs/<file>.json [--push]
 *
 * --push also publishes it to Langfuse (util/tracing.ts), same as heal.ts
 * does automatically on every real run. Useful for backfilling historical
 * runs into the Scores view so release-over-release charting has more than
 * one data point.
 */

interface Args {
  run?: string;
  push: boolean;
}

const parseArgs = (argv: string[]): Args => {
  const args: Args = { push: false };
  for (let i = 0; i < argv.length; i++) {
    const next = (): string => argv[++i];
    switch (argv[i]) {
      case '--run':
        args.run = next();
        break;
      case '--push':
        args.push = true;
        break;
    }
  }
  return args;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.run) {
    console.error('Usage: ts-node jul-ia-n/eval/resolution-metrics.ts --run <path-to-telemetry.json> [--push]');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(resolve(args.run), 'utf-8'));
  const releaseId: string = raw.releaseId ?? '(unknown)';
  const cases = raw.cases ?? [];
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error(`No "cases" array found in ${args.run}`);
    process.exit(1);
  }

  const metrics = computeResolutionMetrics(cases);
  console.log(`\n=== ${releaseId} ===`);
  console.log(formatResolutionMetrics(metrics));
  console.log(JSON.stringify(metrics, null, 2));

  if (args.push) {
    await logResolutionMetrics({ releaseId, ...metrics });
    console.log(`\nPushed to Langfuse (sessionId=${releaseId}).`);
  }
};

main().catch((err) => {
  console.error('resolution-metrics error:', err);
  process.exit(1);
});
