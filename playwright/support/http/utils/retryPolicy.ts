/** Statuses retried when a request does not narrow them with `RequestConfig.retryOn`. */
export const DEFAULT_RETRY_STATUSES: readonly number[] = [408, 429, 500, 502, 503, 504];

/**
 * Statuses where the server did not process a non-idempotent request, so sending it again
 * cannot create a duplicate. A 504 or 500 leaves the outcome unknown: the backend may have
 * finished the write after the gateway gave up.
 */
export const SAFE_RETRY_STATUSES_FOR_CREATE: readonly number[] = [429, 502, 503];

/**
 * Statuses retried for a purchase. A 502 is ambiguous here too: in staging the gateway answered
 * 502 for a purchase the backend had processed, and the retry failed with `EMA-1002 order is
 * already processed`. Only statuses where the request never reached the payment are retried.
 */
export const SAFE_RETRY_STATUSES_FOR_PURCHASE: readonly number[] = [429, 503];

/** Upper bound for a single backoff wait, so a long retry chain cannot eat the test timeout. */
export const MAX_RETRY_DELAY_MS = 8000;

export function isRetryableStatus(
  status: number | undefined,
  retryOn: readonly number[] = DEFAULT_RETRY_STATUSES
): boolean {
  return status !== undefined && retryOn.includes(status);
}

/** An error without a response is retryable unless the caller cancelled the request itself. */
export function isRetryableNetworkError(code: string | undefined): boolean {
  return code !== 'ERR_CANCELED';
}

/**
 * Exponential backoff with full jitter: a random wait in [0, base * 2^(attempt-1)], capped.
 * Without the jitter, every worker that got the same 5xx retries at the same instant and
 * hits the service with a second synchronized burst.
 */
export function computeBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number = MAX_RETRY_DELAY_MS,
  random: () => number = Math.random
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
  return Math.floor(random() * ceiling);
}
