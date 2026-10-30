import type { FreshMerchant } from '@support/merchantPool/fresh';

export type Plan = Map<number, Record<string, number>>;

/**
 * Merchants each shard gets, by country: the static demand of its files plus a margin for what the
 * static read misses (a country held in a variable, a merchant created per test in beforeEach) and
 * for Playwright retries, which run beforeAll again. At least one MX spare per shard: MX is where
 * the unread demand concentrates. Whatever is still missing is created on the spot, as before.
 */
export function planStock(
  filesByShard: Map<number, string[]>,
  demandOf: (file: string) => Record<string, number>,
  spareRatio = 0.05
): Plan {
  const plan: Plan = new Map();
  for (const [shard, files] of filesByShard) {
    const counts: Record<string, number> = {};
    for (const file of files) {
      for (const [country, n] of Object.entries(demandOf(file))) {
        counts[country] = (counts[country] ?? 0) + n;
      }
    }
    for (const country of Object.keys(counts)) {
      counts[country] += Math.ceil(counts[country] * spareRatio);
    }
    counts.MX = Math.max(counts.MX ?? 0, 1);
    plan.set(shard, counts);
  }
  return plan;
}

export function totalsByCountry(plan: Plan): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const counts of plan.values()) {
    for (const [country, n] of Object.entries(counts)) totals[country] = (totals[country] ?? 0) + n;
  }
  return totals;
}

/** Hands the created merchants out to the shards; a shortfall leaves the last shards short. */
export function distribute(
  plan: Plan,
  created: Record<string, FreshMerchant[]>
): Record<string, Record<string, FreshMerchant[]>> {
  const remaining: Record<string, FreshMerchant[]> = Object.fromEntries(
    Object.entries(created).map(([country, merchants]) => [country, [...merchants]])
  );
  const byShard: Record<string, Record<string, FreshMerchant[]>> = {};
  for (const [shard, counts] of [...plan].sort(([a], [b]) => a - b)) {
    for (const [country, n] of Object.entries(counts)) {
      const taken = (remaining[country] ?? []).splice(0, n);
      if (taken.length) (byShard[String(shard)] ??= {})[country] = taken;
    }
  }
  return byShard;
}

/**
 * Fallback when the per-shard lists did not finish in time: deal each country's merchants round
 * robin over the shards. Some shards end up short (they create the rest on the spot) and some
 * with leftovers, which beats throwing away a stock that was already created.
 */
export function distributeEvenly(
  created: Record<string, FreshMerchant[]>,
  shardTotal: number
): Record<string, Record<string, FreshMerchant[]>> {
  const byShard: Record<string, Record<string, FreshMerchant[]>> = {};
  for (const [country, merchants] of Object.entries(created)) {
    merchants.forEach((merchant, i) => {
      const shard = String((i % shardTotal) + 1);
      ((byShard[shard] ??= {})[country] ??= []).push(merchant);
    });
  }
  return byShard;
}
