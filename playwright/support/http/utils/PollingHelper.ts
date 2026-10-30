export interface PollingOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

/**
 * Repeatedly calls `fn` until `condition` returns true or the timeout is reached.
 * Errors thrown by `fn` propagate immediately — only falsy conditions trigger a retry.
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  { intervalMs = 3000, timeoutMs = 30000 }: PollingOptions = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (true) {
    attempt++;
    const result = await fn();

    if (condition(result)) {
      return result;
    }

    if (Date.now() + intervalMs > deadline) {
      throw new Error(`Polling timed out after ${timeoutMs}ms (${attempt} attempts)`);
    }

    console.log(`[Polling] Condition not met on attempt ${attempt}, retrying in ${intervalMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
