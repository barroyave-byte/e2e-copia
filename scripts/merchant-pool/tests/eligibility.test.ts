// Usage: npm run test:merchant-pool (all), or npx ts-node -r tsconfig-paths/register scripts/merchant-pool/tests/eligibility.test.ts
//
// Which specs may share a merchant (docs/merchant-pool-plan.md, section 4.3) and how the codemod
// moves them onto the pool, on hand-written spec sources.
import * as assert from 'assert';
import { analyzeSpec, groupEligible } from '../lib/eligibility';
import { migrateSpec } from '../lib/migrate';
import { findRejected, REJECTED_GROUPS, REJECTED_SPECS } from '../lib/rejected';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { MERCHANT_POOL } from '@support/merchantPool';

const spec = (
  beforeAll: string,
  extra = '',
  imports = ''
) => `import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test } from '@support/fixtures';
${imports}
const configMerchant = new ConfigMerchant();

test.describe('@regression x', () => {
  test.beforeAll(${beforeAll});

  test('@PI-T1 x', async ({ page, paymentService }) => {
    await paymentService.purchaseV2(privateKey, token, body);${extra}
  });
});
`;
const eligibleSetup = `async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
  }`;

// --- eligibility
const ok = analyzeSpec('ok.spec.ts', spec(eligibleSetup));
assert.deepStrictEqual(
  [ok.eligible, ok.country, ok.kind, ok.processors],
  [true, 'MX', 'plain', ['kushkiProcessor']],
  JSON.stringify(ok.reasons)
);

const blocked = (source: string, reason: RegExp) => {
  const a = analyzeSpec('x.spec.ts', source);
  assert.ok(!a.eligible, `should be blocked: ${reason}`);
  assert.ok(
    a.reasons.some((r) => reason.test(r)),
    `${reason} not in ${JSON.stringify(a.reasons)}`
  );
};
blocked(
  spec(eligibleSetup, '\n    await apiCallNewman.createCampaignMSI(merchantId);'),
  /createCampaignMSI/
);
blocked(
  spec(
    eligibleSetup,
    '\n    await apiCallNewman.configDynamicRoutingWithRiskified(merchantId, t);'
  ),
  /configDynamicRoutingWithRiskified/
);
blocked(
  spec(
    eligibleSetup,
    '',
    "import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';"
  ),
  /admin configuration pages/
);
blocked(spec(eligibleSetup, '', "import { init } from '../common';"), /local helpers/);
blocked(spec(eligibleSetup.replace('processorsConfig.kushkiProcessor', 'processor')), /not named/);
blocked(
  spec(eligibleSetup.replace("basicSetup('MX')", 'basicSetup(country)')),
  /exactly one literal/
);
blocked(spec(eligibleSetup).replace('test.beforeAll(', 'test.beforeEach('), /not in a beforeAll/);
blocked(
  spec(eligibleSetup, '', "import { TestingFramework } from 'playwright/framework/core';"),
  /DSL/
);
// a merchant without processors is a group of its own
const noProcessor = analyzeSpec(
  'np.spec.ts',
  spec(eligibleSetup.replace(/\n    await apiCallNewman[\s\S]*?\);/, ''))
);
assert.deepStrictEqual(
  [noProcessor.eligible, noProcessor.processors, groupEligible([noProcessor])[0]?.key],
  [true, [], 'NO_PROCESSOR_MX'],
  JSON.stringify(noProcessor.reasons)
);
blocked(
  spec(eligibleSetup, '', "import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';"),
  /admin configuration pages/
);
blocked(
  spec(eligibleSetup, '\n    await userAuthService.registerUserAndSetAddress(user, merchant);'),
  /registerUserAndSetAddress/
);
// users with a random email of their own are fine; a literal email could be another spec's too
const randomUser =
  '\n    const email = `${Math.floor(Math.random() * 9999999)}.qa@deuna.com`;' +
  '\n    await userAuthService.registerUserAndSetAddress({ email }, merchant);' +
  '\n    await apiCallNewman.setCreditCardForUser(email, card);';
assert.ok(analyzeSpec('x.spec.ts', spec(eligibleSetup, randomUser)).eligible, 'random email');
blocked(
  spec(eligibleSetup, randomUser + "\n    expect(user.email).toBe('fixed.qa@deuna.com');"),
  /registerUserAndSetAddress/
);
blocked(
  spec(eligibleSetup, '\n    await apiCallNewman.setCreditCardForUser(email, card);'),
  /setCreditCardForUser/
);
blocked(spec(eligibleSetup).replace("test('@PI-T1", "test.fixme('@PI-T1"), /skipped or fixme/);
blocked(spec(eligibleSetup).replace("test.describe('", "test.describe.skip('"), /skipped or fixme/);
// read-only admin pages are fine
assert.ok(
  analyzeSpec(
    'x.spec.ts',
    spec(
      eligibleSetup,
      '',
      "import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';"
    )
  ).eligible
);

// a spec rejected by id stays out even when its group is fine
const rejectedSpec = analyzeSpec(
  'playwright/tests/PSP/baz/PAYM-T2180.spec.ts',
  spec(eligibleSetup)
);
assert.ok(
  !rejectedSpec.eligible && rejectedSpec.reasons.some((r) => /rejected spec/.test(r)),
  JSON.stringify(rejectedSpec.reasons)
);
for (const [id, r] of Object.entries(REJECTED_SPECS)) {
  assert.ok(/^[A-Z0-9]+-T\d+$/.test(id), `${id} is a test case id`);
  assert.ok(r.reason && r.revisit && /^\d{4}-\d{2}-\d{2}$/.test(r.rejectedOn), `${id} complete`);
}

// --- recipes: configuration the entry applies once, when it provisions the merchant
const withNetwork = analyzeSpec(
  'n.spec.ts',
  spec(
    eligibleSetup.replace(
      /\n  }$/,
      '\n    await apiCallNewman.createNetwork(merchantId, merchantToken);\n  }'
    )
  )
);
assert.deepStrictEqual(
  [withNetwork.eligible, withNetwork.setup, groupEligible([withNetwork])[0]?.key],
  [true, ['network'], 'KUSHKI_PROCESSOR_NETWORK_MX'],
  JSON.stringify(withNetwork.reasons)
);
blocked(
  spec(
    eligibleSetup,
    '\n    const network = await apiCallNewman.createNetwork(merchantId, merchantToken);'
  ),
  /createNetwork/
);
blocked(
  spec(
    eligibleSetup,
    '\n    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken, theme);'
  ),
  /createCheckoutConfigVault/
);
const networkMigrated = migrateSpec(
  spec(
    eligibleSetup.replace(
      /\n  }$/,
      '\n    await apiCallNewman.createNetwork(merchantId, merchantToken);\n  }'
    )
  ),
  'K',
  ['kushkiProcessor'],
  ['network']
);
assert.ok(!/createNetwork|apiCallNewman/.test(networkMigrated), networkMigrated);
assert.ok(
  groupEligible([ok, withNetwork]).length === 2,
  'a spec with a recipe never shares the plain entry'
);

// --- grouping and suggested keys
const pe = analyzeSpec(
  'pe.spec.ts',
  spec(
    eligibleSetup.replace("'MX'", "'PE'").replace('kushkiProcessor', 'kushkiProcessorAuthorizePE')
  )
);
const groups = groupEligible([ok, { ...ok, file: 'ok2.spec.ts' }, pe]);
assert.deepStrictEqual(
  groups.map((g) => [g.key, g.files.length]),
  [
    ['KUSHKI_PROCESSOR_MX', 2],
    ['KUSHKI_PROCESSOR_AUTHORIZE_PE', 1],
  ]
);

// --- codemod
const migrated = migrateSpec(spec(eligibleSetup), 'KUSHKI_PROCESSOR_MX', ['kushkiProcessor']);
assert.ok(migrated.includes('test.beforeAll(async ({ emaService, merchantPool }) =>'));
assert.ok(migrated.includes("await merchantPool.acquire('KUSHKI_PROCESSOR_MX')"));
assert.ok(
  !/createPaymentProcessor|ConfigMerchant|basicSetup|apiCallNewman|processorsConfig/.test(migrated),
  migrated
);
assert.ok(
  migrated.includes('merchantToken = merchant.merchantToken;'),
  'the rest of the setup stays'
);

const noParams = migrateSpec(spec(eligibleSetup.replace('({ emaService })', '()')), 'K', [
  'kushkiProcessor',
]);
assert.ok(noParams.includes('test.beforeAll(async ({ merchantPool }) =>'), noParams.slice(0, 600));

const localSetupVar = migrateSpec(
  spec(eligibleSetup)
    .replace('const configMerchant = new ConfigMerchant();\n', '')
    .replace(
      '    const merchant = await configMerchant',
      '    const configMerchant = new ConfigMerchant();\n    const merchant = await configMerchant'
    ),
  'K',
  ['kushkiProcessor']
);
assert.ok(
  !/ConfigMerchant/.test(localSetupVar),
  'a setup object declared in the beforeAll goes too'
);

const keepsImports = migrateSpec(
  spec(eligibleSetup, '\n    expect(processorsConfig.kushkiProcessor.name).toBe(x);'),
  'K',
  ['kushkiProcessor']
);
assert.ok(keepsImports.includes('import * as processorsConfig'), 'an import still in use stays');

const keepsId = spec(
  eligibleSetup.replace(
    'await apiCallNewman.createPaymentProcessor',
    'processorId = await apiCallNewman.createPaymentProcessor'
  )
);
const keptId = migrateSpec(keepsId, 'K', ['kushkiProcessor']);
assert.ok(
  keptId.includes('processorId = merchant.processorIds[0];') &&
    !/createPaymentProcessor/.test(keptId),
  'a single processor id is read from the pooled merchant'
);
assert.throws(
  () => migrateSpec(keepsId, 'K', ['kushkiProcessor', 'stripeProcessor']),
  /uses the id/,
  'with several processors the id is not migrated'
);
assert.throws(
  () => migrateSpec(spec(eligibleSetup), 'K', ['stripeProcessor']),
  /expected one createPaymentProcessor/
);

// --- rejected groups: matched by what the merchant needs, never back in the catalog
assert.ok(
  findRejected({ country: 'MX', kind: 'plain', processors: ['mercadoPagoProcessorAuthorize'] }),
  'Mercado Pago authorize stays rejected'
);
assert.strictEqual(
  findRejected({ country: 'CO', kind: 'plain', processors: ['mercadoPagoProcessorAuthorize'] }),
  undefined,
  'another country is another group'
);
for (const r of REJECTED_GROUPS) {
  assert.ok(
    r.reason && r.evidence && r.revisit && /^\d{4}-\d{2}-\d{2}$/.test(r.rejectedOn),
    'complete entry'
  );
}
const exportName = new Map(
  Object.entries(processorsConfig as unknown as Record<string, object>).map(([name, cfg]) => [
    cfg,
    name,
  ])
);
for (const [key, entry] of Object.entries(MERCHANT_POOL)) {
  const processors = entry.processors.map((p) => exportName.get(p) ?? '?');
  const hit = findRejected({ country: entry.country, kind: entry.kind, processors });
  assert.ok(!hit, `MERCHANT_POOL.${key} is a rejected group: ${hit?.reason}`);
}

console.log('merchant-pool-eligibility.test.ts: all assertions passed');
