// Usage: npm run merchant-pool:eligibility -- [--min 5] [--json out.json] [--key KUSHKI_PROCESSOR_MX]
//          [--include-rejected]
//
// Lists the specs that can share a merchant, grouped by the MerchantSpec they need
// (docs/merchant-pool-plan.md, section 4.3). Candidates for the MERCHANT_POOL catalog. Groups a
// canary already rejected (lib/rejected.ts) are listed apart, with the reason, and not proposed.
import * as fs from 'fs';
import { analyzeTree, groupEligible } from '../lib/eligibility';
import { findRejected } from '../lib/rejected';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const analyses = analyzeTree('playwright/tests');
const all = groupEligible(analyses);
const includeRejected = process.argv.includes('--include-rejected');
const groups = includeRejected ? all : all.filter((g) => !findRejected(g));
const rejected = all.filter((g) => findRejected(g));
const key = arg('key');
if (key) {
  const group = all.find((g) => g.key === key);
  if (!group) throw new Error(`No eligible group ${key}`);
  const why = findRejected(group);
  if (why) console.error(`WARNING ${key} was rejected on ${why.rejectedOn}: ${why.reason}`);
  console.log(group.files.join('\n'));
  process.exit(0);
}
const min = Number(arg('min') ?? 5);
const eligible = analyses.filter((a) => a.eligible).length;
console.log(
  `specs with basicSetup: ${analyses.length} | eligible: ${eligible} | groups: ${groups.length}`
);
const big = groups.filter((g) => g.files.length >= min);
console.log(
  `groups with >= ${min} specs: ${big.length}, covering ${big.reduce((a, g) => a + g.files.length, 0)} specs\n`
);
for (const g of big)
  console.log(
    `${String(g.files.length).padStart(4)}  ${g.key}  (${g.country}, ${g.kind}, ${g.processors.join(' + ')})`
  );
if (rejected.length && !includeRejected) {
  console.log('\nRejected, not proposed (lib/rejected.ts):');
  for (const g of rejected) {
    const why = findRejected(g)!;
    console.log(
      `${String(g.files.length).padStart(4)}  ${g.key}  rejected ${why.rejectedOn}: ${why.reason}`
    );
    console.log(`        revisit: ${why.revisit}`);
  }
}
const json = arg('json');
if (json) fs.writeFileSync(json, JSON.stringify({ analyses, groups }, null, 2));
