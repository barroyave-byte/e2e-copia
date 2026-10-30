import * as crypto from 'crypto';

/**
 * Amount fields an order payload must keep consistent with each other.
 * `total_amount` stays `sub_total + total_tax_amount`, so shifting the three
 * fields by the same offset preserves the relation the platform validates.
 */
interface OrderAmounts {
  items_total_amount: number;
  sub_total: number;
  total_amount: number;
}

const DEFAULT_MAX_OFFSET = 500;

/**
 * Returns a copy of an order payload with its amount shifted by a random offset.
 *
 * PSP sandboxes deduplicate on (merchant credentials + card + amount) within a
 * time window, not on the order id we generate: Fiserv answers a replayed amount
 * with processor error 5005 "Duplicate transaction" (surfaced as DP-8001 / HTTP
 * 422). Tests that authorize without ever capturing or voiding leave the
 * authorization open, so every later run with the same fixed amount collides
 * with the previous one.
 * The payload is cloned rather than mutated because specs declare it at module
 * level — mutating it in place would let offsets accumulate across repetitions
 * in the same worker.
 */
export function withUniqueOrderAmount<T extends { order: OrderAmounts }>(
  payload: T,
  maxOffset: number = DEFAULT_MAX_OFFSET
): T {
  const offset = crypto.randomInt(1, maxOffset);
  const unique = structuredClone(payload);

  unique.order.items_total_amount += offset;
  unique.order.sub_total += offset;
  unique.order.total_amount += offset;

  return unique;
}
