// Usage: npm run test:merchant-pool
//
// Runs every merchant-pool test file, each in its own process: they set process.env and module
// state (manifest path, admin token file) that must not leak from one file to the next.
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort();

let failed = 0;
for (const file of files) {
  const started = Date.now();
  const result = spawnSync(
    'npx',
    ['ts-node', '-r', 'tsconfig-paths/register', path.join(dir, file)],
    { encoding: 'utf8' }
  );
  const ok = result.status === 0;
  if (!ok) failed += 1;
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file} (${secs}s)`);
  if (!ok)
    console.log(`${result.stdout}\n${result.stderr}`.trim().split('\n').slice(-25).join('\n'));
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
