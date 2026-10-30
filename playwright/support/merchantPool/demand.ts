import * as fs from 'fs';
import * as path from 'path';

/**
 * How many standard merchants a spec file creates, by country, read statically from its source
 * and from the local helpers it imports and calls (one level: e.g. paypal_wallet/common's init()). Used to
 * size the single-use stock of each shard; a miss is not an error, only a merchant the spec
 * creates on the spot as before.
 */
const PATTERNS: RegExp[] = [
  // configMerchant.basicSetup('MX'), configMerchantCheckout.basicSetup('CO')
  /\.basicSetup\(\s*'([A-Z]{2})'/g,
  // merchantAuthService.createBasicMerchant({ country: 'MX' }) and the Checkout variant
  /createBasicMerchant(?:Checkout)?\(\s*\{\s*country:\s*'([A-Z]{2})'/g,
  // DSL: { action: 'setup.merchant.basicSetup' | 'setup.merchant.configureCheckout', params: { country: 'MX' } }
  /'setup\.merchant\.(?:basicSetup|configureCheckout)'\s*,\s*params:\s*\{\s*country:\s*'([A-Z]{2})'/g,
];

function countIn(source: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const pattern of PATTERNS) {
    for (const match of source.matchAll(pattern)) counts[match[1]] = (counts[match[1]] ?? 0) + 1;
  }
  return counts;
}

function add(into: Record<string, number>, from: Record<string, number>): void {
  for (const [country, n] of Object.entries(from)) into[country] = (into[country] ?? 0) + n;
}

/**
 * Demand of each top-level export of a helper. A declaration runs from its `export` to the next
 * top-level one, which is enough for helper files (functions, classes and constants, one after
 * another). A class counts when the spec calls `new Class(`.
 */
function demandByExport(source: string): Map<string, Record<string, number>> {
  const byExport = new Map<string, Record<string, number>>();
  const starts = [
    ...source.matchAll(/^export\s+(?:async\s+)?(?:const|function|let|class)\s+(\w+)/gm),
  ];
  starts.forEach((match, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : source.length;
    byExport.set(match[1], countIn(source.slice(match.index, end)));
  });
  return byExport;
}

/**
 * Demand a spec takes from one local helper: only the functions it imports and calls, once per
 * call. paypal_wallet/common exports init(), which creates a merchant, next to constants and
 * user helpers; counting the whole file charged a merchant to every spec importing paypalAccount.
 * A default or namespace import can reach anything, so it still counts the whole file.
 */
function helperDemand(specSource: string, clause: string, helperSource: string) {
  const named = clause.trim().match(/^\{([^}]*)\}$/);
  if (!named) return countIn(helperSource);
  const byExport = demandByExport(helperSource);
  const demand: Record<string, number> = {};
  for (const part of named[1].split(',')) {
    const [imported, local = imported] = part.trim().split(/\s+as\s+/);
    const exportDemand = imported && byExport.get(imported);
    if (!exportDemand || !Object.keys(exportDemand).length) continue;
    const calls = (specSource.match(new RegExp(`\\b${local}\\s*\\(`, 'g')) ?? []).length;
    for (let i = 0; i < calls; i++) add(demand, exportDemand);
  }
  return demand;
}

export function merchantDemand(specFile: string): Record<string, number> {
  const source = fs.readFileSync(specFile, 'utf8');
  const demand = countIn(source);
  for (const [, clause, relative] of source.matchAll(
    /import\s+([^;]*?)\s+from\s+'(\.{1,2}\/[^']+)'/g
  )) {
    const base = path.resolve(path.dirname(specFile), relative);
    const helper = [`${base}.ts`, path.join(base, 'index.ts')].find((f) => fs.existsSync(f));
    if (helper) add(demand, helperDemand(source, clause, fs.readFileSync(helper, 'utf8')));
  }
  return demand;
}
