/**
 * What the regression provisions before the shard matrix (docs/merchant-pool-plan.md, section 4.18).
 * Both are on by default and have no workflow input: turning one off is a commit here, so it applies
 * to exactly the branch whose tests run, and the workflow (cli/provision.ts) needs no change.
 *
 * - shared: the MERCHANT_POOL catalog, merchants shared by the specs that declare them.
 * - presupply: single-use merchants created ahead for every other spec (the start-up burst).
 *
 * With both off the job still writes an empty manifest and the shards create every merchant
 * themselves, as before the pool.
 */
export const MERCHANT_POOL_SETTINGS = {
  shared: true,
  presupply: true,
} as const;
