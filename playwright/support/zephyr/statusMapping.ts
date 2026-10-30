/**
 * The single mapping from a Playwright outcome to a Zephyr execution status.
 *
 * It lives on its own because two callers need it and they see different shapes:
 * the reporter holds a live `TestCase`, while `scripts/zephyr/reconcile-cycle.ts`
 * reads a merged JSON report. When each kept its own copy they drifted, and the
 * reconciler rewrote 177 correctly-published `Fail` executions to `Not Executed`
 * in cycle QA-R3254. Add a rule here, never in a caller.
 */

export const ZEPHYR_STATUS = {
  PASS: 'Pass',
  FAIL: 'Fail',
  /** The test never ran because something upstream stopped it. */
  BLOCKED: 'Blocked',
  /** A deliberate `test.skip()` — the only legitimate reason to leave a case unexecuted. */
  NOT_EXECUTED: 'Not Executed',
} as const;

export type ZephyrStatus = (typeof ZEPHYR_STATUS)[keyof typeof ZEPHYR_STATUS];

/** Higher wins when the same case is resolved more than once. */
export const STATUS_PRECEDENCE: Record<ZephyrStatus, number> = {
  [ZEPHYR_STATUS.PASS]: 4,
  [ZEPHYR_STATUS.FAIL]: 3,
  [ZEPHYR_STATUS.BLOCKED]: 2,
  [ZEPHYR_STATUS.NOT_EXECUTED]: 1,
};

/**
 * What both callers can supply. `outcome` uses Playwright's own vocabulary,
 * which `TestCase.outcome()` and the JSON reporter's per-test `status` share.
 */
export interface TestOutcomeFacts {
  outcome: string | undefined;
  expectedStatus?: string;
  annotationTypes: readonly string[];
}

export function resolveZephyrStatus(facts: TestOutcomeFacts): ZephyrStatus {
  const { outcome, expectedStatus, annotationTypes } = facts;

  // A test annotated with a known bug reports Fail even when it never ran, so
  // the linked Jira issue still shows up against a red case. This predates the
  // rewrite and is deliberate — it also covers the ~177 `test.fixme` specs,
  // which all carry a bug annotation.
  if (outcome === 'skipped' && annotationTypes.includes('bug')) {
    return ZEPHYR_STATUS.FAIL;
  }

  switch (outcome) {
    case 'expected':
    case 'passed':
      return ZEPHYR_STATUS.PASS;
    // Failed at least once but ended green.
    case 'flaky':
      return ZEPHYR_STATUS.PASS;
    case 'unexpected':
      return ZEPHYR_STATUS.FAIL;
    case 'skipped': {
      // A deliberate skip leaves expectedStatus as 'skipped' (or a skip/fixme
      // annotation). Anything else that ends up skipped was stopped by a failed
      // hook, a failed project dependency, or an earlier failure in a
      // `describe.serial` group: the test never got to run, so it is blocked.
      const deliberate =
        expectedStatus === 'skipped' ||
        annotationTypes.includes('skip') ||
        annotationTypes.includes('fixme');
      return deliberate ? ZEPHYR_STATUS.NOT_EXECUTED : ZEPHYR_STATUS.BLOCKED;
    }
    default:
      return ZEPHYR_STATUS.FAIL;
  }
}
