import { RECIPE_CALLS, recipeCall, type Recipe } from './eligibility';

/**
 * Moves an eligible spec (lib/eligibility.ts) onto the merchant pool: its basicSetup becomes
 * merchantPool.acquire(key), the processors the pooled merchant already has stop being created,
 * and imports left unused go away. Throws, leaving the source untouched, whenever the spec does
 * not match the expected shape exactly: a skipped spec is safe, a half-migrated one is not.
 */
export function migrateSpec(
  source: string,
  key: string,
  processors: string[],
  setup: Recipe[] = []
): string {
  let s = source;

  const setups = [...s.matchAll(/await\s+(\w+)\.basicSetup\(\s*'[A-Z]{2}'\s*\)/g)];
  if (setups.length !== 1) throw new Error(`expected one basicSetup, found ${setups.length}`);
  const [setupCall, setupVar] = setups[0];
  const setupAt = setups[0].index!;

  const hooks = [...s.matchAll(/test\.beforeAll\(\s*async\s*\(([^)]*)\)\s*=>/g)].filter(
    (m) => m.index! < setupAt
  );
  const hook = hooks[hooks.length - 1];
  if (!hook) throw new Error('basicSetup is not inside a beforeAll');
  const params = hook[1].trim();
  let fixtures: string;
  if (params === '' || params === '{}') fixtures = '{ merchantPool }';
  else if (params.startsWith('{') && params.endsWith('}')) {
    const inner = params.slice(1, -1).trim().replace(/,$/, '');
    fixtures = inner ? `{ ${inner}, merchantPool }` : '{ merchantPool }';
  } else throw new Error(`unexpected beforeAll parameters: ${params}`);
  // The parameter list is the parenthesis right after `async`, not the one of `beforeAll(`.
  const paramsAt = hook.index! + hook[0].indexOf('(', hook[0].indexOf('async')) + 1;
  s = s.slice(0, paramsAt) + fixtures + s.slice(paramsAt + hook[1].length);

  s = s.replace(setupCall, `await merchantPool.acquire('${key}')`);

  // The pooled merchant's processor ids come in the entry's order. With a single processor the id a
  // spec kept (Kushki refunds pass it to sendWebhookRefundIfPreprod) is processorIds[0]; with
  // several, the order of the spec's calls says nothing about the entry's: not migrated.
  const merchantVar = new RegExp(
    `(?:const|let)\\s+(\\w+)\\s*=\\s*await\\s+merchantPool\\.acquire\\('${key}'\\)`
  ).exec(s)?.[1];
  for (const processor of processors) {
    const keptId = new RegExp(
      `=\\s*await apiCallNewman\\.createPaymentProcessor\\(\\s*processorsConfig\\.${processor}\\s*,\\s*[\\w.]+\\s*,\\s*[\\w.]+\\s*,?\\s*\\);`,
      'g'
    );
    const kept = s.match(keptId)?.length ?? 0;
    if (kept) {
      if (kept !== 1 || processors.length !== 1 || !merchantVar) {
        throw new Error(`uses the id returned by createPaymentProcessor(${processor})`);
      }
      s = s.replace(keptId, `= ${merchantVar}.processorIds[0];`);
      continue;
    }
    const call = new RegExp(
      `\\n[ \\t]*await apiCallNewman\\.createPaymentProcessor\\(\\s*processorsConfig\\.${processor}\\s*,\\s*[\\w.]+\\s*,\\s*[\\w.]+\\s*,?\\s*\\);`,
      'g'
    );
    const found = s.match(call)?.length ?? 0;
    if (found !== 1)
      throw new Error(`expected one createPaymentProcessor(${processor}), found ${found}`);
    s = s.replace(call, '');
  }

  // At module level or inside the beforeAll itself (the Kueski and PayU checkout specs).
  // The configuration the entry applies when it provisions the merchant (MerchantSpec.setup).
  for (const [method, recipe] of Object.entries(RECIPE_CALLS)) {
    if (!setup.includes(recipe)) continue;
    const found = s.match(recipeCall(method))?.length ?? 0;
    if (found !== 1) throw new Error(`expected one ${method}(), found ${found}`);
    s = s.replace(recipeCall(method), '');
  }

  s = s.replace(
    new RegExp(`\\n[ \\t]*(?:export )?const ${setupVar} = new ConfigMerchant(?:Checkout)?\\(\\);`),
    ''
  );
  const dropIfUnused = (identifier: string, importLine: RegExp) => {
    const without = s.replace(importLine, '');
    if (!new RegExp(`\\b${identifier}\\b`).test(without)) s = without;
  };
  dropIfUnused(
    'ConfigMerchant',
    /import ConfigMerchant from '@support\/api_sup\/config_merchant_sup\/configMerchant';\n/
  );
  dropIfUnused(
    'ConfigMerchantCheckout',
    /import ConfigMerchantCheckout from '@support\/api_sup\/config_merchant_sup\/configMerchantCheckout';\n/
  );
  dropIfUnused(
    'apiCallNewman',
    /import \* as apiCallNewman from '@support\/newman\/apiCallNewman';\n/
  );
  dropIfUnused(
    'processorsConfig',
    /import \* as processorsConfig from '@support\/interfaces\/payment_processors';\n/
  );

  if (/\.basicSetup\(|new ConfigMerchant/.test(s)) throw new Error('leftover merchant creation');
  return s;
}
