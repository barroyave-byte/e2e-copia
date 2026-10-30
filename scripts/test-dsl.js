#!/usr/bin/env node
/**
 * Runs every spec that drives the DSL (`TestingFramework`), which is where changes to
 * playwright/framework can actually change runtime behaviour — the rest of the suite is only
 * affected by type-level changes.
 *
 * Exists as a script because the obvious one-liner is fragile:
 *
 *   npx playwright test $(grep -rl TestingFramework playwright/tests | ...)
 *
 * depends on the shell's word-splitting rules and on `grep` not being aliased, and fails with
 * a bare "No tests found" when either assumption breaks. Collecting the ids here and passing a
 * single `--grep` argument removes both.
 *
 * Extra Playwright flags are forwarded:  npm run test:dsl -- --headed --workers=2
 */

const { readdirSync, readFileSync, statSync } = require('fs');
const { join, basename } = require('path');
const { spawnSync } = require('child_process');

const TESTS_DIR = join(__dirname, '..', 'playwright', 'tests');

function specsUsingFramework(dir) {
  const found = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      found.push(...specsUsingFramework(path));
      continue;
    }

    if (!entry.endsWith('.spec.ts')) continue;
    if (!readFileSync(path, 'utf8').includes('TestingFramework')) continue;

    found.push(basename(entry, '.spec.ts'));
  }

  return found;
}

function main() {
  const ids = [...new Set(specsUsingFramework(TESTS_DIR))].sort();

  if (ids.length === 0) {
    console.error('No specs reference TestingFramework — nothing to run.');
    process.exit(1);
  }

  console.log(`Running ${ids.length} DSL spec(s):\n  ${ids.join('\n  ')}\n`);

  const forwarded = process.argv.slice(2).filter((arg) => arg !== '--');
  const args = [
    'playwright',
    'test',
    '--project=chromium',
    `--grep=@(${ids.join('|')})`,
    ...forwarded,
  ];

  const result = spawnSync('npx', args, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

main();
