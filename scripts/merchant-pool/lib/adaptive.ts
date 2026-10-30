/**
 * Runs tasks with a concurrency limit that backs off on failure (AIMD: halve on a failure, grow by
 * one after a streak of successes). Measured on staging, 20 concurrent merchant creations sustain
 * ~2600/min with p99 < 800ms (provisioning uses 8, see cli/provision.ts); the back-off keeps the provisioning job from piling onto
 * merchant-auth when it degrades, which is the failure this job exists to avoid.
 */
export interface AdaptiveOptions {
  initial: number;
  min?: number;
  /** Successes in a row before the limit grows back by one (up to `initial`). */
  growAfter?: number;
  onLimitChange?: (limit: number, reason: string) => void;
  /** Epoch ms after which no new task starts; the ones not started end as rejected. */
  stopStartingAt?: number;
  /**
   * Epoch ms after which it returns without waiting for tasks still in flight (a request hung on a
   * degraded service): they end as rejected. Whatever finished in time is kept.
   */
  giveUpAt?: number;
}

export const DEADLINE = 'deadline reached';

export async function runAdaptive<T>(
  tasks: (() => Promise<T>)[],
  {
    initial,
    min = 2,
    growAfter = 20,
    onLimitChange,
    stopStartingAt = Infinity,
    giveUpAt = Infinity,
  }: AdaptiveOptions
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let limit = initial;
  let running = 0;
  let next = 0;
  let streak = 0;
  let done = false;

  return new Promise((resolve) => {
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(giveUpTimer);
      for (let i = 0; i < tasks.length; i++) {
        results[i] ??= { status: 'rejected', reason: new Error(DEADLINE) };
      }
      resolve(results);
    };
    const giveUpTimer = Number.isFinite(giveUpAt)
      ? setTimeout(finish, Math.max(0, giveUpAt - Date.now()))
      : undefined;

    const pump = () => {
      if (done) return;
      if (Date.now() >= stopStartingAt) next = tasks.length; // stop starting new tasks
      if (next >= tasks.length && running === 0) return finish();
      while (running < limit && next < tasks.length) {
        const index = next++;
        running += 1;
        tasks[index]()
          .then(
            (value) => {
              if (done) return;
              results[index] = { status: 'fulfilled', value };
              if (++streak >= growAfter && limit < initial) {
                limit += 1;
                streak = 0;
                onLimitChange?.(limit, 'recovered');
              }
            },
            (reason) => {
              if (done) return;
              results[index] = { status: 'rejected', reason };
              streak = 0;
              const reduced = Math.max(min, Math.floor(limit / 2));
              if (reduced !== limit) {
                limit = reduced;
                onLimitChange?.(limit, 'failure');
              }
            }
          )
          .finally(() => {
            running -= 1;
            pump();
          });
      }
    };
    pump();
  });
}
