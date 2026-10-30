import * as fs from 'fs';
import * as path from 'path';
import { findRejectedSpec } from './rejected';

/**
 * Decides, from a spec's source, whether it can take its merchant from the shared pool
 * (docs/merchant-pool-plan.md, section 4.3), and which MerchantSpec it needs.
 *
 * Conservative by construction: anything it does not recognise blocks the spec. A spec is
 * eligible only if its setup is exactly one basicSetup in beforeAll plus createPaymentProcessor
 * calls with named configs (or none), and everything else it calls operates on orders or shoppers, never
 * on the merchant's configuration, neither through the API nor through the admin UI.
 */

/**
 * Calls that act on orders and payments. Anything else on these objects blocks, except the user
 * calls below.
 */
const ALLOWED_CALL =
  /^(tokenize\w*|purchase\w*|capture\w*|refund\w*|void\w*|get\w*|retry\w*|assert\w*|loginAsGuest|loginGuest|validateResponse|expireOrder|sendWebhookRefundIfPreprod|simulate\w*Webhook|sendXmlWebhookByProcessorName|authorize|paymentCron)$/;
const SETUP_CALL = new Set(['basicSetup', 'createPaymentProcessor']);
/**
 * Users belong to the merchant: on a shared merchant two specs registering the same email collide.
 * They are allowed only when the spec generates its email at random and holds no literal one, so
 * every file registers a user of its own. PI-T1032 (wave 1) collided only under the canary's
 * --repeat-each, which reruns a module in the same worker and reuses its module-level email; a
 * regression runs each file once, and a retry starts a new worker that draws a new email. Entries
 * with these specs are verified with `merchant-pool:canary --repeat 1`.
 */
const USER_CALL = /^(registerUser\w*|setCreditCardForUser|setCard|deleteCard)$/;
const RANDOM_EMAIL = /Math\.random|faker\.|randomUUID|EmailGenerator\.|Date\.now/;
const LITERAL_EMAIL = /['"`][\w.+-]+@[\w-]+\.[\w.]+['"`]/;

/**
 * Merchant configuration that is the same for every spec that applies it, so a pool entry can apply
 * it once when it provisions the merchant (MerchantSpec.setup) and the spec stops calling it.
 * Only the bare two-argument call whose result nobody reads: createNetwork() creates a network and
 * moves the merchant into it, and with its defaults createCheckoutConfigVault() writes always the
 * same config. Called from several specs at once on one merchant they would race (the second
 * checkout config fails with CHKCONFIG-4106), which is why the entry applies them, not the specs.
 */
export const RECIPE_CALLS = {
  createNetwork: 'network',
  createCheckoutConfigVault: 'checkoutConfigVault',
} as const;
export type Recipe = (typeof RECIPE_CALLS)[keyof typeof RECIPE_CALLS];
export const recipeCall = (method: string) =>
  new RegExp(
    `\\n[ \\t]*await apiCallNewman\\.${method}\\(\\s*[\\w.]+\\s*,\\s*[\\w.]+\\s*,?\\s*\\);`,
    'g'
  );
const CALL = /\b(apiCallNewman|[a-z]\w*Service|configStatsig|configMerchant\w*)\.(\w+)\s*\(/g;

/**
 * Admin pages that only read (login, home, the detail of one order). Every other admin page
 * configures. The orders list is not here: on a shared merchant it shows the orders of every spec
 * using it (ADM-T505 takes a screenshot of it).
 */
const READ_ONLY_ADMIN =
  /^@pages\/admin\/(adminLoginPage|adminHomePage|orders\/adminOrderDetailsPage|authentication)$/;

export interface SpecAnalysis {
  file: string;
  eligible: boolean;
  reasons: string[];
  country?: string;
  kind?: 'plain' | 'checkout';
  processors: string[];
  /** Merchant configuration the pool entry must apply (RECIPE_CALLS). */
  setup: Recipe[];
}

export function analyzeSpec(file: string, source: string): SpecAnalysis {
  const reasons: string[] = [];
  const processors: string[] = [];

  if (/TestingFramework/.test(source)) reasons.push('DSL spec (migrated separately)');
  if (/merchantPool\.acquire|acquirePooled/.test(source)) reasons.push('already uses the pool');
  const rejectedSpec = findRejectedSpec(file);
  if (rejectedSpec) reasons.push(`rejected spec (lib/rejected.ts): ${rejectedSpec.reason}`);
  // A spec that does not run cannot be verified by the canary: it stays out until it runs again.
  if (/\btest\.(?:fixme|skip)\(|\.describe\.(?:fixme|skip)\(/.test(source)) {
    reasons.push('skipped or fixme (cannot be verified)');
  }

  const setups = [...source.matchAll(/await\s+(\w+)\.basicSetup\(\s*'([A-Z]{2})'\s*\)/g)];
  const anySetup = (source.match(/\.basicSetup\(/g) ?? []).length;
  if (setups.length !== 1 || anySetup !== 1) {
    reasons.push(`expected exactly one literal basicSetup, found ${anySetup}`);
  }
  const [setupCall, setupVar, country] = setups[0] ?? [];
  let kind: SpecAnalysis['kind'];
  if (setupVar) {
    const checkout = new RegExp(`\\b${setupVar}\\s*=\\s*new ConfigMerchantCheckout\\(`).test(
      source
    );
    const plain = new RegExp(`\\b${setupVar}\\s*=\\s*new ConfigMerchant\\(`).test(source);
    if (checkout === plain) reasons.push(`cannot tell the merchant kind of ${setupVar}`);
    kind = checkout ? 'checkout' : 'plain';
    const setupAt = source.indexOf(setupCall);
    const hook = source.lastIndexOf('test.before', setupAt);
    const between = hook === -1 ? '' : source.slice(hook, setupAt);
    if (hook === -1 || !source.startsWith('test.beforeAll', hook) || /\n\s*test\(/.test(between)) {
      reasons.push('basicSetup is not in a beforeAll (one merchant per test)');
    }
  }

  for (const match of source.matchAll(/createPaymentProcessor\(\s*([^,)]+)/g)) {
    const named = /^processorsConfig\.(\w+)$/.exec(match[1].trim());
    if (named) processors.push(named[1]);
    else reasons.push(`processor config not named: ${match[1].trim()}`);
  }

  const blocked = new Set<string>();
  const ownUsers = RANDOM_EMAIL.test(source) && !LITERAL_EMAIL.test(source);
  const setup = new Set<Recipe>();
  for (const [, , method] of source.matchAll(CALL)) {
    if (SETUP_CALL.has(method) || ALLOWED_CALL.test(method)) continue;
    if (USER_CALL.test(method) && ownUsers) continue;
    const recipe = RECIPE_CALLS[method as keyof typeof RECIPE_CALLS];
    const calls = (source.match(new RegExp(`\\.${method}\\(`, 'g')) ?? []).length;
    if (recipe && calls === 1 && (source.match(recipeCall(method)) ?? []).length === 1) {
      setup.add(recipe);
      continue;
    }
    blocked.add(method);
  }
  if (blocked.size) reasons.push(`merchant-level calls: ${[...blocked].sort().join(', ')}`);

  const adminPages = [...source.matchAll(/from '(@pages\/admin\/[^']+)'/g)]
    .map((m) => m[1])
    .filter((p) => !READ_ONLY_ADMIN.test(p));
  if (adminPages.length) reasons.push(`admin configuration pages: ${adminPages.join(', ')}`);

  // Helpers that live with the tests, relative or through the @tests alias: ENTP1-T2105 imported
  // setElementsConfig from another folder as @tests/... and wrote a checkout config on a shared merchant.
  const local = [...source.matchAll(/from '((?:\.{1,2}|@tests)\/[^']+)'/g)].map((m) => m[1]);
  if (local.length) reasons.push(`local helpers (not analysed): ${local.join(', ')}`);

  return {
    file,
    eligible: reasons.length === 0,
    reasons,
    country,
    kind,
    processors: [...new Set(processors)].sort(),
    setup: [...setup].sort(),
  };
}

export interface Group {
  country: string;
  kind: 'plain' | 'checkout';
  processors: string[];
  setup: Recipe[];
  files: string[];
  /** Suggested MERCHANT_POOL key, e.g. KUSHKI_PROCESSOR_MX. */
  key: string;
}

const snake = (name: string) =>
  name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toUpperCase();

/**
 * kushkiProcessorAuthorizePE + PE -> KUSHKI_PROCESSOR_AUTHORIZE_PE, not ..._PE_PE. A merchant
 * without processors (specs that only create orders or payment links) -> NO_PROCESSOR_MX.
 */
function suggestKey(
  country: string,
  kind: 'plain' | 'checkout',
  processors: string[],
  setup: Recipe[] = []
): string {
  const parts = processors.length
    ? processors.map((p) => snake(p).replace(new RegExp(`_${country}$`), ''))
    : ['NO_PROCESSOR'];
  return [
    ...parts,
    ...(kind === 'checkout' ? ['CHECKOUT'] : []),
    ...setup.map((r) => snake(r)),
    country,
  ].join('_');
}

export function groupEligible(analyses: SpecAnalysis[]): Group[] {
  const groups = new Map<string, Group>();
  for (const a of analyses) {
    if (!a.eligible || !a.country || !a.kind) continue;
    const id = `${a.country}|${a.kind}|${a.processors.join('+')}|${a.setup.join('+')}`;
    const group = groups.get(id) ?? {
      country: a.country,
      kind: a.kind,
      processors: a.processors,
      setup: a.setup,
      files: [],
      key: suggestKey(a.country, a.kind, a.processors, a.setup),
    };
    group.files.push(a.file);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => b.files.length - a.files.length);
}

export function analyzeTree(root: string): SpecAnalysis[] {
  const out: SpecAnalysis[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.spec.ts')) {
        const source = fs.readFileSync(full, 'utf8');
        if (/\.basicSetup\(/.test(source)) out.push(analyzeSpec(full, source));
      }
    }
  };
  walk(root);
  return out;
}
