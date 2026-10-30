/**
 * Minimal concurrency limiter (p-limit style), zero dependencies.
 *
 * `pLimit(max)` returns a function that wraps an async task and guarantees that
 * at most `max` wrapped tasks are in flight at once; the rest queue FIFO. Used
 * by the heal pipeline to run independent leaders concurrently (network/LLM
 * bound) while keeping a separate, smaller limit for the CPU/browser-heavy
 * verify step.
 *
 * The limiter does not order results; callers that need ordered output should
 * map over indices or sort afterwards.
 */
export type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

export const pLimit = (max: number): Limiter => {
  const limit = Math.max(1, Math.floor(max));
  let active = 0;
  const queue: (() => void)[] = [];

  const drain = (): void => {
    active--;
    const run = queue.shift();
    if (run) run();
  };

  return <T>(task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = (): void => {
        active++;
        // Run the task and release the slot regardless of outcome. Errors are
        // forwarded to the caller's promise; they never wedge the queue.
        task().then(resolve, reject).finally(drain);
      };
      if (active < limit) run();
      else queue.push(run);
    });
};
