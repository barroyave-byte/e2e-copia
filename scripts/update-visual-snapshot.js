#!/usr/bin/env node
/**
 * Regenerates the visual baselines of ONE test case, never of the whole suite.
 *
 * Usage: npm run update-snapshot -- ENTP1-T2594
 *
 * Why this wrapper exists: running the raw command without a filter
 * (`playwright test --project=visual-testing --grep @visual --update-snapshots`)
 * rewrites every baseline in the repo, so a real failure gets stored as the new
 * "correct" image. Requiring the test case id keeps the blast radius at one spec,
 * and `--update-snapshots=changed` only touches the baselines that actually differ.
 */
const { spawnSync } = require('child_process');

// Valid Zephyr project keys, as documented in CLAUDE.md.
const ZEPHYR_ID = /^(PI|ENTP1|PAYM|ADM|PF|PLAT|RECON|ECOM)-T\d+$/;
const [testCaseId, ...extraArgs] = process.argv.slice(2);

if (!testCaseId || !ZEPHYR_ID.test(testCaseId)) {
  console.error(
    [
      testCaseId ? `"${testCaseId}" is not a valid Zephyr test case id.` : 'Missing test case id.',
      '',
      'Usage: npm run update-snapshot -- <TEST-CASE-ID>',
      'Example: npm run update-snapshot -- ENTP1-T2594',
      '',
      'The id is required on purpose: without it the command would rewrite the',
      'baselines of the entire visual suite.',
    ].join('\n')
  );
  process.exit(1);
}

const args = [
  'playwright',
  'test',
  testCaseId,
  '--project=visual-testing',
  '--grep',
  '@visual',
  '--update-snapshots=changed',
  ...extraArgs,
];

console.log(`> npx ${args.join(' ')}`);
const result = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
