#!/usr/bin/env node
/**
 * Pre-commit type gate.
 *
 * Runs `tsc --noEmit` over the whole program and aborts the commit on the first error.
 * TypeScript has no per-file typecheck: a change in one file can only break another through
 * the program graph, so checking just the staged files would miss exactly the errors this
 * gate exists to catch. The cost is kept down two ways:
 *
 *   - the run is skipped entirely when no staged file can affect types (docs, snapshots, …);
 *   - `incremental` + `tsBuildInfoFile` (tsconfig.json) reuse the previous run's state, so a
 *     warm check is a fraction of a cold one.
 *
 * Escape hatch for an emergency commit: `git commit --no-verify` (or `HUSKY=0 git commit`).
 */

const { spawnSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

/** A staged path matching any of these can change the result of the typecheck. */
const TYPE_RELEVANT = [/\.tsx?$/, /\.json$/, /^tsconfig.*\.json$/, /^package(-lock)?\.json$/];

function stagedFiles() {
  const result = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    // Cannot read the index — fall back to running the check rather than skipping it.
    return null;
  }

  return result.stdout.split('\n').filter(Boolean);
}

function main() {
  const staged = stagedFiles();

  if (staged && !staged.some((file) => TYPE_RELEVANT.some((pattern) => pattern.test(file)))) {
    console.log('typecheck — skipped: no staged file affects TypeScript');
    return;
  }

  console.log('typecheck — tsc --noEmit …');
  const started = Date.now();

  const result = spawnSync('npx', ['--no-install', 'tsc', '--noEmit', '-p', PROJECT_ROOT], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (result.status === 0) {
    console.log(`✓ typecheck passed in ${elapsed}s`);
    return;
  }

  const errors = output.split('\n').filter((line) => / error TS\d+/.test(line));

  console.error('\n──────────────────────────────────────────────────────────────');
  console.error(`✗ COMMIT ABORTADO — ${errors.length || 'se detectaron'} error(es) de TypeScript`);
  console.error('──────────────────────────────────────────────────────────────\n');
  console.error(output);
  console.error('\nCorrígelos y vuelve a commitear. Para reproducirlo: npm run typecheck');
  process.exit(1);
}

main();
