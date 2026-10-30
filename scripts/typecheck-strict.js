#!/usr/bin/env node
/**
 * Incremental `strict` gate.
 *
 * TypeScript has no per-file strictness: `tsconfig.strict.json` necessarily typechecks the
 * whole program, including the ~1.9k pre-existing errors in directories that have not been
 * migrated yet. This script runs that compile and fails ONLY on errors originating in the
 * directories listed in STRICT_PATHS.
 *
 * Migrating a directory is a two-step PR: fix its strict errors, then add it below. Adding a
 * path before its errors are gone turns the gate red, which is the intended feedback.
 *
 * Rollback for any migration is removing its line from STRICT_PATHS.
 */

const { spawnSync } = require('child_process');
const path = require('path');

/** Directories held to `strict`. Grows one migrated directory at a time. */
const STRICT_PATHS = ['playwright/framework/'];

const ERROR_LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

function main() {
  const projectRoot = path.resolve(__dirname, '..');

  const result = spawnSync(
    'npx',
    ['tsc', '--noEmit', '-p', path.join(projectRoot, 'tsconfig.strict.json')],
    { cwd: projectRoot, encoding: 'utf8' }
  );

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  const gated = output
    .split('\n')
    .map((line) => line.match(ERROR_LINE))
    .filter(Boolean)
    .map((match) => ({ file: match[1].replace(/\\/g, '/'), line: match[0] }))
    .filter(({ file }) => STRICT_PATHS.some((dir) => file.includes(dir)));

  console.log(`strict gate — covering ${STRICT_PATHS.length} path(s):`);
  for (const dir of STRICT_PATHS) console.log(`  ${dir}`);

  if (gated.length === 0) {
    console.log('\n✓ no strict errors in gated paths');
    return;
  }

  console.error(`\n✗ ${gated.length} strict error(s) in gated paths:\n`);
  for (const { line } of gated) console.error(`  ${line}`);
  console.error('\nFix them, or remove the path from STRICT_PATHS in scripts/typecheck-strict.js.');
  process.exit(1);
}

main();
