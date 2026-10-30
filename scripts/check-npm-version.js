#!/usr/bin/env node
/**
 * Pre-commit guard: a staged package-lock.json must come from the npm major pinned in
 * package.json "engines.npm" (npm 11, bundled with the Node version in .nvmrc).
 *
 * `.npmrc` (engine-strict) already makes `npm install`/`npm ci` fail on another npm, but a lock
 * can still be rewritten with `--engine-strict=false`, `--force` or another tool. Each npm major
 * writes the lock differently (npm 10 keeps optional peer entries npm 11 drops), which shows up as
 * unrelated lockfile diffs in feature PRs. Merges are skipped: the incoming lock comes from the other branch, not from this npm.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function git(args) {
  const result = spawnSync('git', args, { cwd: PROJECT_ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function main() {
  const mergeHead = git(['rev-parse', '--git-path', 'MERGE_HEAD']);
  if (mergeHead && fs.existsSync(path.resolve(PROJECT_ROOT, mergeHead))) return;

  const staged = (git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']) || '').split('\n');
  if (!staged.includes('package-lock.json')) return;

  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const range = (pkg.engines && pkg.engines.npm) || '';
  const requiredMajor = (range.match(/\d+/) || [])[0];
  if (!requiredMajor) return;

  const actual = execSync('npm --version', { encoding: 'utf8' }).trim();
  if (actual.split('.')[0] === requiredMajor) return;

  console.error(
    [
      '',
      `✗ package-lock.json is staged but your npm is ${actual}; this repo uses npm ${range} (package.json "engines").`,
      '  Another npm major rewrites the lockfile with changes unrelated to your PR.',
      '',
      '  Fix (Node from .nvmrc bundles the right npm):',
      '    nvm install && nvm use',
      `    # or, keeping your Node: npm install -g npm@${requiredMajor}`,
      '    git checkout origin/develop -- package-lock.json   # if you did not change dependencies',
      '    npm ci',
      '',
    ].join('\n')
  );
  process.exit(1);
}

main();
