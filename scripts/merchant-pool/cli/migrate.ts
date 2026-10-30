// Usage: npm run merchant-pool:migrate -- --key KUSHKI_PROCESSOR_MX [--dry-run] [--force-rejected]
//
// Moves every eligible spec of one group (cli/eligibility.ts) onto the pool entry
// with that key. The entry must already be in MERCHANT_POOL; its country, kind and processors pick
// the group, so the key alone never decides what merchant a spec gets. Specs the codemod cannot
// migrate safely are listed and left untouched.
import * as fs from 'fs';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { isMerchantPoolKey, MERCHANT_POOL, type MerchantSpec } from '@support/merchantPool';
import { analyzeTree, groupEligible, type Group } from '../lib/eligibility';
import { findRejected } from '../lib/rejected';
import { migrateSpec } from '../lib/migrate';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const key = arg('key');
if (!key) throw new Error('--key is required');
const dryRun = process.argv.includes('--dry-run');

// Same config objects, not just the same names: several configs share a processor name.
const configs = processorsConfig as unknown as Record<string, object>;
const matches = (g: Group, entry: MerchantSpec) =>
  entry.country === g.country &&
  entry.kind === g.kind &&
  g.processors.length === entry.processors.length &&
  g.processors.every((name) => (entry.processors as readonly object[]).includes(configs[name])) &&
  [...g.setup].sort().join('+') ===
    Object.keys(entry.setup ?? {})
      .filter((r) => entry.setup?.[r as keyof NonNullable<MerchantSpec['setup']>])
      .sort()
      .join('+');

// A catalog entry finds its specs by what the merchant needs, not by name: the key may differ from
// the suggested one (MX_STRIPE), and two configs can suggest the same key (paymentezProcessor and
// paymentezProcessorEC both suggest PAYMENTEZ_PROCESSOR_EC). Without an entry, the suggested key
// still finds the group, so a rejected one can say why.
const groups = groupEligible(analyzeTree('playwright/tests'));
const group = isMerchantPoolKey(key)
  ? groups.find((g) => matches(g, MERCHANT_POOL[key]))
  : groups.find((g) => g.key === key);
if (!group) throw new Error(`No eligible specs for ${key}`);

// Checked before the catalog: for a rejected group the useful answer is why it was rejected, not
// "add the entry first". It takes a deliberate override to try it again.
const rejected = findRejected(group);
if (rejected && !process.argv.includes('--force-rejected')) {
  throw new Error(
    `${key} was rejected on ${rejected.rejectedOn}: ${rejected.reason}\n` +
      `Evidence: ${rejected.evidence}\nRevisit: ${rejected.revisit}\n` +
      'Use --force-rejected only to re-evaluate it with merchant-pool:canary.'
  );
}
if (!isMerchantPoolKey(key)) throw new Error(`${key} is not in MERCHANT_POOL: add the entry first`);

let migrated = 0;
for (const file of group.files) {
  const source = fs.readFileSync(file, 'utf8');
  try {
    const next = migrateSpec(source, key, group.processors, group.setup);
    if (!dryRun) fs.writeFileSync(file, next);
    migrated += 1;
    console.log(`ok    ${file}`);
  } catch (error) {
    console.log(`skip  ${file}: ${(error as Error).message}`);
  }
}
console.log(`${dryRun ? '[dry-run] ' : ''}${key}: ${migrated}/${group.files.length} migrated`);
