import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { CardPoolCard, CardPoolFile } from '../schemas/cardPoolEntry';

/**
 * One-off generator for jul-ia-n/knowledge/card-pool/*.json.
 *
 * Scans playwright/support/interfaces/credit_cards/*.ts and classifies every
 * exported card by its variable name:
 *   - categorically out of scope for cardFixer (…3ds, …ThreeDS, …Installment*)
 *     are dropped silently — they need a challenge/frictionless flow or a
 *     specific MSI/MCI test shape a plain card swap can't replicate, so
 *     there's nothing for a human to triage here either;
 *   - cards that read as intentionally successful (…Successful, …Approved,
 *     …Clear) are written straight into the registry;
 *   - cards that read as intentionally negative (…Failed, …Fraud,
 *     …ManualReview, …Declined, …Invalid, …Expired) are dropped;
 *   - anything with no clear signal either way is EXCLUDED from the pool by
 *     default and listed in _needs-review.json for a human to triage — a card
 *     silently included by mistake (e.g. a Fraud test card) is worse than one
 *     silently missing.
 *
 * Re-run any time credit_cards/*.ts gains new cards:
 *   npm run ai-heal:bootstrap-cards
 *
 * Safe to re-run: it overwrites the per-PSP files it generates. Any manual
 * edits (notes, corrected country/brand) made directly to those files will be
 * clobbered on the next run — this is a bootstrap tool, not a sync tool.
 */

const CREDIT_CARDS_DIR = join(
  __dirname,
  '..',
  '..',
  'playwright',
  'support',
  'interfaces',
  'credit_cards',
);
const REGISTRY_DIR = join(__dirname, '..', 'knowledge', 'card-pool');
const SKIP_FILES = new Set(['baseCreditCard.ts', 'index.ts']);

// "sucess" (missing a 'c') covers the common typo "Sucessful"/"Sucessfull"
// seen across several PSP files, as a substring of "success" itself.
const SAFE_PATTERN = /success|sucess|approved|aprobad|exitos|authorized|clear/i;
const DENY_PATTERN =
  /fail|fraud|declin|deni|reject|manualreview|\breview\b|invalid|expired|blocked|\berror\b/i;
// Categorically out of scope for cardFixer's use case (a plain "successful
// purchase" card swap) regardless of whether the name also reads as
// positive: 3DS cards require a challenge/frictionless flow a swap can't
// replicate, and installment cards (MSI = "meses sin intereses", the
// Spanish-language equivalent) are tied to a specific MSI/MCI test shape.
// Checked first so these never land in _needs-review.json — they don't need
// a human to classify them, they're just never applicable here.
const OUT_OF_SCOPE_PATTERN = /3ds|threeds|installment|frictionless|challenge|msi/i;

const COUNTRY_TOKENS: Record<string, string> = {
  brasil: 'BR',
  brazil: 'BR',
  mexico: 'MX',
  colombia: 'CO',
  chile: 'CL',
  peru: 'PE',
  argentina: 'AR',
  ecuador: 'EC',
};
const COUNTRY_SUFFIXES = [
  'MX', 'CO', 'CL', 'AR', 'PE', 'EC', 'BR', 'UY', 'PA', 'GT', 'HN', 'SV', 'CR', 'DO', 'PY', 'BO',
];

const inferCountry = (name: string): string | null => {
  const lower = name.toLowerCase();
  for (const [token, code] of Object.entries(COUNTRY_TOKENS)) {
    if (lower.includes(token)) return code;
  }
  for (const code of COUNTRY_SUFFIXES) {
    if (name.endsWith(code)) return code;
  }
  return null;
};

const inferBrand = (name: string): string | null => {
  const lower = name.toLowerCase();
  if (lower.includes('mastercard') || lower.includes('master')) return 'mastercard';
  if (lower.includes('visa')) return 'visa';
  if (lower.includes('amex')) return 'amex';
  return null;
};

const pspFromFilename = (filename: string): string =>
  filename.replace(/\.ts$/, '').replace(/CreditCards?$/, '').toLowerCase();

type Classification = 'safe' | 'deny' | 'out-of-scope' | 'ambiguous';

const classify = (name: string): Classification => {
  if (OUT_OF_SCOPE_PATTERN.test(name)) return 'out-of-scope';
  if (DENY_PATTERN.test(name)) return 'deny';
  if (SAFE_PATTERN.test(name)) return 'safe';
  return 'ambiguous';
};

const isCardShaped = (value: unknown): boolean =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).number === 'string' &&
      typeof (value as Record<string, unknown>).cvv_code === 'string',
  );

interface NeedsReviewEntry {
  file: string;
  variableName: string;
  reason: string;
}

const main = (): void => {
  if (!existsSync(CREDIT_CARDS_DIR)) {
    console.error(`credit_cards dir not found: ${CREDIT_CARDS_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(CREDIT_CARDS_DIR)
    .filter((f) => f.endsWith('.ts') && !SKIP_FILES.has(f))
    .sort();

  mkdirSync(REGISTRY_DIR, { recursive: true });

  const needsReview: NeedsReviewEntry[] = [];
  let totalCards = 0;
  let totalSafe = 0;
  let totalDeny = 0;
  let totalOutOfScope = 0;
  let filesWritten = 0;

  console.log(`Scanning ${files.length} files in ${CREDIT_CARDS_DIR}...\n`);

  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: Record<string, unknown> = require(join(CREDIT_CARDS_DIR, file));
    const psp = pspFromFilename(file);
    const cards: CardPoolCard[] = [];

    for (const [variableName, value] of Object.entries(mod)) {
      if (!isCardShaped(value)) continue;
      totalCards++;

      const classification = classify(variableName);
      if (classification === 'deny') {
        totalDeny++;
        continue;
      }
      if (classification === 'out-of-scope') {
        totalOutOfScope++;
        continue;
      }
      if (classification === 'ambiguous') {
        needsReview.push({
          file,
          variableName,
          reason: 'no clear successful/decline signal in the name',
        });
        continue;
      }

      totalSafe++;
      cards.push({
        variableName,
        country: inferCountry(variableName),
        brand: inferBrand(variableName),
        notes: null,
      });
    }

    if (cards.length === 0) continue;

    const registryFile: CardPoolFile = { psp, cards };
    const outPath = join(REGISTRY_DIR, `${psp}.json`);
    writeFileSync(outPath, JSON.stringify(registryFile, null, 2) + '\n', 'utf-8');
    filesWritten++;
    console.log(`  ${file} -> knowledge/card-pool/${psp}.json (${cards.length} safe cards)`);
  }

  if (needsReview.length > 0) {
    const reviewPath = join(REGISTRY_DIR, '_needs-review.json');
    writeFileSync(reviewPath, JSON.stringify(needsReview, null, 2) + '\n', 'utf-8');
  }

  console.log(`\n=== bootstrap summary ===`);
  console.log(`files scanned:       ${files.length}`);
  console.log(`registry files:      ${filesWritten}`);
  console.log(`cards found:         ${totalCards}`);
  console.log(`safe (in pool):      ${totalSafe}`);
  console.log(`excluded (deny):     ${totalDeny}`);
  console.log(`excluded (out-of-scope, 3ds/installments): ${totalOutOfScope}`);
  console.log(`ambiguous (review):  ${needsReview.length}`);
  if (needsReview.length > 0) {
    console.log(`  -> jul-ia-n/knowledge/card-pool/_needs-review.json (excluded from pool until triaged)`);
  }
};

main();
