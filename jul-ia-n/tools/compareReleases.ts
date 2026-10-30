import 'dotenv/config';

import { copyFileSync } from 'fs';
import { join } from 'path';

import { compareWithPreviousRelease, findLatestReleaseCsv, inferReleaseLabel } from '../steps/compareReleases';

/**
 * CLI wrapper around steps/compareReleases.ts — for manual, one-off runs,
 * standalone from ai-heal entirely. heal.ts also calls
 * compareWithPreviousRelease directly at the end of every run (see
 * PIPELINE.md) — this script exists for re-running the comparison in
 * isolation (e.g. against an arbitrary past CSV) without re-running the
 * whole pipeline.
 *
 * Common case — zero args, uses jul-ia-n/release.csv and auto-picks the most
 * recent file in jul-ia-n/releases/:
 *
 *   npm run ai-heal:compare-release
 *
 * Isolated/manual case — compare two arbitrary CSVs:
 *
 *   npm run ai-heal:compare-release -- \
 *     --current path/to/fresh.csv \
 *     --previous path/to/reviewed.csv \
 *     --previous-release-id v19.2
 *
 * Writes back to --current in place by default (use --output to write
 * elsewhere instead, leaving --current untouched).
 */

interface Args {
  current?: string;
  previous?: string;
  previousReleaseId?: string;
  output?: string;
  threshold?: number;
}

const DEFAULT_CURRENT = join(__dirname, '..', 'release.csv');

const parseArgs = (argv: string[]): Args => {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const next = (): string => argv[++i];
    if (argv[i] === '--current') args.current = next();
    else if (argv[i] === '--previous') args.previous = next();
    else if (argv[i] === '--previous-release-id') args.previousReleaseId = next();
    else if (argv[i] === '--output') args.output = next();
    else if (argv[i] === '--threshold') args.threshold = Number(next());
  }
  return args;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  const current = args.current ?? DEFAULT_CURRENT;
  const previous = args.previous ?? findLatestReleaseCsv() ?? undefined;
  if (!previous) {
    console.error(
      'No --previous given and no .csv found in jul-ia-n/releases/. ' +
        'Usage: ts-node jul-ia-n/tools/compareReleases.ts [--current <fresh release.csv>] ' +
        '[--previous <reviewed release.csv>] [--previous-release-id <label>] [--output <path>] [--threshold 0.75]',
    );
    process.exit(1);
  }

  const target = args.output ?? current;
  if (args.output) copyFileSync(current, args.output);

  const result = await compareWithPreviousRelease(target, previous, {
    threshold: args.threshold,
    previousReleaseId: args.previousReleaseId ?? inferReleaseLabel(previous),
  });

  console.log(`\n=== comparison summary ===`);
  console.log(`current:                   ${current}`);
  console.log(`previous:                  ${previous}`);
  console.log(`current rows:              ${result.currentRows}`);
  console.log(`previous rows (reviewed):  ${result.previousReviewedRows}`);
  console.log(`candidates (same testCaseId): ${result.candidates}`);
  console.log(`marked reiterative:        ${result.matched}`);
  console.log(`written to:                ${target}`);
};

main().catch((err) => {
  console.error('compareReleases error:', err);
  process.exit(1);
});
