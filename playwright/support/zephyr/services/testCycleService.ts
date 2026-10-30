import { TestCase } from '@playwright/test/reporter';
import ZephyrService from './zephyrService';
import MetabaseService from './metabaseService';
import { TestCaseZephyr } from '../models/testCaseZephyr';
import { ZEPHYR_PROJECT_NAME, ZEPHYR_ENVIRONMENT_EXECUTION } from '../utils/config';

import {
  ZEPHYR_STATUS,
  STATUS_PRECEDENCE,
  resolveZephyrStatus,
  type ZephyrStatus,
} from '../statusMapping';

export { ZEPHYR_STATUS, type ZephyrStatus };

/** Zephyr project keys a test case ID can start with. Mirrors the list in CLAUDE.md. */
const ZEPHYR_PROJECT_KEYS = ['PI', 'ENTP1', 'PAYM', 'ADM', 'PF', 'PLAT', 'RECON', 'ECOM'];

/**
 * Anchored to real project keys on purpose. The previous `/@([^\s]+)/` returned
 * `"regression"` for a title starting with `@regression` and `null` for the
 * untagged `authenticate` setup test, which was then posted anyway.
 */
const TEST_CASE_ID_PATTERN = new RegExp(`@((?:${ZEPHYR_PROJECT_KEYS.join('|')})-T\\d+)\\b`);

class TestCycleService {
  private zephyrService: ZephyrService;
  private metabaseService: MetabaseService;
  private userId: string;

  constructor(zephyrService: ZephyrService, metabaseService: MetabaseService, userId: string) {
    this.zephyrService = zephyrService;
    this.metabaseService = metabaseService;
    this.userId = userId;
  }

  async loadTestCycleWithTestCases(queryId: string, testCycleId: string) {
    const testCases = await this.metabaseService.getTestCases(queryId);

    // One payload per case, awaited. The previous version mutated a single shared
    // object inside the loop and never awaited the calls, so the key could change
    // under a request already in flight.
    for (const testCase of testCases ?? []) {
      await this.zephyrService.publishTestCase({
        projectKey: ZEPHYR_PROJECT_NAME,
        testCaseKey: testCase.TEST_CASE_KEY,
        testCycleKey: testCycleId,
        statusName: ZEPHYR_STATUS.NOT_EXECUTED,
        executionTime: 0,
        executedById: this.userId,
        assignedToId: this.userId,
        comment: '',
        environmentName: ZEPHYR_ENVIRONMENT_EXECUTION,
      });
    }
  }

  /**
   * Adapts a live `TestCase` to the shared mapping in ../statusMapping.
   *
   * `TestCase.outcome()` is the aggregate Playwright already computed across
   * every attempt, which is why this takes the test rather than one result: a
   * per-attempt mapping let a later `skipped` attempt overwrite the real `Fail`
   * of an earlier one (see ADM-T800 in cycle QA-R3252).
   */
  resolveStatus(test: TestCase): ZephyrStatus {
    return resolveZephyrStatus({
      outcome: test.outcome(),
      expectedStatus: test.expectedStatus,
      annotationTypes: test.annotations.map((annotation) => annotation.type),
    });
  }

  /** Higher wins when two tests claim the same Zephyr case. */
  private rank(test: TestCase): number {
    return STATUS_PRECEDENCE[this.resolveStatus(test)];
  }

  private buildComment(test: TestCase, status: ZephyrStatus): string {
    const attempts = test.results.length;

    switch (status) {
      case ZEPHYR_STATUS.PASS:
        return attempts > 1
          ? `Test Case Success (flaky: passed after ${attempts - 1} retry/retries)`
          : 'Test Case Success';
      case ZEPHYR_STATUS.BLOCKED:
        return 'Blocked: the test never ran (failed hook, failed dependency, or an earlier failure in its serial group)';
      case ZEPHYR_STATUS.NOT_EXECUTED:
        return 'Skipped deliberately via test.skip()';
      default: {
        const lastError = test.results[test.results.length - 1]?.error?.message;
        return `message: ${lastError}`;
      }
    }
  }

  /** Total wall time across every attempt; 0 for a test that never ran. */
  private totalDuration(test: TestCase): number {
    return test.results.reduce((total, result) => total + result.duration, 0);
  }

  /**
   * Publishes one execution per test — not one per attempt. Called once from the
   * reporter's `onEnd`.
   *
   * Returns the test case IDs that could not be published, so the caller can
   * hand them to the reconciliation step instead of losing them.
   */
  async publishRunResults(tests: readonly TestCase[]): Promise<string[]> {
    const testCycleId = process.env.TEST_CYCLE_ID;
    if (!testCycleId) return [];

    const byTestCaseId = new Map<string, TestCase>();
    for (const test of tests) {
      const testCaseId = this.matchTestCaseId(test);
      if (!testCaseId) continue;

      const current = byTestCaseId.get(testCaseId);
      if (!current || this.rank(test) > this.rank(current)) {
        byTestCaseId.set(testCaseId, test);
      }
    }
    const publishable = [...byTestCaseId].map(([testCaseId, test]) => ({ test, testCaseId }));

    console.log(
      `[INFO] ZEPHYR SCALE - Publishing ${publishable.length} test case(s) to cycle ${testCycleId}`
    );

    const failed: string[] = [];

    for (const { test, testCaseId } of publishable) {
      const status = this.resolveStatus(test);
      const testCaseData = this.buildTestCaseData(
        testCaseId,
        status,
        this.totalDuration(test),
        this.buildComment(test, status),
        testCycleId
      );

      const result = await this.zephyrService.publishTestCase(testCaseData);

      if (!result.ok) {
        failed.push(testCaseId);
        continue;
      }

      console.log(`[INFO] ZEPHYR SCALE - ${testCaseId} published as ${status}`);

      if (result.executionId && status === ZEPHYR_STATUS.FAIL && this.isTestCaseMarkedAsBug(test)) {
        console.log(`[INFO] ZEPHYR SCALE - Adding bug to test case ${testCaseId}`);
        await this.zephyrService.linkIssueToTestCase(test, result.executionId);
      }
    }

    if (failed.length > 0) {
      console.log(
        `[ERROR] ZEPHYR SCALE - ${failed.length} test case(s) could not be published: ${failed.join(', ')}`
      );
    }

    return failed;
  }

  async prepareStepsToPublish(testCaseId: string, testSteps: string[]) {
    const body = {
      items: testSteps.map((description) => ({
        inline: { description },
      })),
      mode: 'OVERWRITE',
    };

    if (testSteps.length !== 0) {
      if (await this.overwriteTestSteps(testCaseId)) {
        await this.zephyrService.setTestSteps(testCaseId, body);
      }
    }
  }

  async overwriteTestSteps(testCaseId: string) {
    const stepsAmount = await this.zephyrService.getStepsAmount(testCaseId);
    return stepsAmount <= 2;
  }

  buildTestCaseData(
    testCaseId: string,
    status: ZephyrStatus,
    duration: number,
    comment: string,
    testCycleId: string
  ): TestCaseZephyr {
    return {
      projectKey: ZEPHYR_PROJECT_NAME,
      testCaseKey: testCaseId,
      testCycleKey: testCycleId,
      statusName: status,
      executionTime: duration,
      executedById: this.userId,
      assignedToId: this.userId,
      comment,
      environmentName: ZEPHYR_ENVIRONMENT_EXECUTION,
    };
  }

  isTestCaseMarkedAsBug(test: TestCase): boolean {
    return test?.annotations?.find((annotation) => annotation.type === 'bug') ? true : false;
  }

  matchTestCaseId(test: TestCase): string | null {
    const match = test.title.match(TEST_CASE_ID_PATTERN);
    if (match) {
      return match[1];
    }

    console.log(
      `[INFO] ZEPHYR SCALE - "${test.title}" was not published: no Zephyr test case ID in the title`
    );
    return null;
  }
}

export default TestCycleService;
