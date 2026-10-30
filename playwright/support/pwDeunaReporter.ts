import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestStep,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { testCycleService } from '@support/zephyr';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';

const testResults = [];
class PwDeunaReporter implements Reporter {
  private stepDescriptionsMap = new Map<string, string[]>();
  private successfulTestCaseIds: string[] = [];
  private currentTestNumber = 0;
  private totalTests = 0;
  private rootSuite: Suite | undefined;

  constructor(options: { customOption?: string } = {}) {
    console.log(
      `Starting pw-deuna-reporter setup with customOption set to ${options.customOption}`
    );
  }
  onBegin(config: FullConfig, suite: Suite) {
    // Kept so onEnd can publish one execution per test instead of one per
    // attempt — see publishRunResults in testCycleService.
    this.rootSuite = suite;
    this.totalTests = suite.allTests().length;
    console.log(`Starting the run with ${this.totalTests} tests`);
  }

  onTestBegin(test: TestCase) {
    this.currentTestNumber++;
    console.log(`${this.currentTestNumber}/${this.totalTests} Starting test ${test.title}`);
    this.stepDescriptionsMap.set(test.id, []);
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep) {
    /* TODO - This method is comment out because it is not necessary for the current implementation
      if (step.category === 'test.step') {
      //console.log(`[Step ${this.stepCounter++}] ${step.title}`);
      const descriptions = this.stepDescriptionsMap.get(test.id) || [];
      descriptions.push(step.title); // Agrega el título del paso al array específico del test
      this.stepDescriptionsMap.set(test.id, descriptions);
    }*/
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep) {}

  onTestEnd(test: TestCase, result: TestResult) {
    // Zephyr publishing deliberately does NOT happen here: onTestEnd fires once
    // per attempt, and each publish creates a new execution, so a retry's
    // skipped attempt used to overwrite the real result of the previous one.
    // The aggregated status is published once in onEnd.

    // Immediate cleanup for orphaned processors on failure/timeout
    if (result.status !== 'passed' && result.status !== 'skipped') {
      const cleanupAnns = test.annotations.filter((a) => a.type === 'processor-cleanup');

      if (cleanupAnns.length > 0) {
        console.log(
          `\n[REPORTER] Test failed/timed out. Cleaning up ${cleanupAnns.length} processors immediately...`
        );

        const cleanupPromise = (async () => {
          try {
            const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

            for (const ann of cleanupAnns) {
              if (ann.description) {
                const data = JSON.parse(ann.description);
                await paymentService.deletePaymentProcessor(
                  data.processorId,
                  data.merchantId,
                  data.merchantToken
                );
                console.log(
                  `[REPORTER] Successfully cleaned up orphaned processor ${data.processorId}`
                );
              }
            }
          } catch (e) {
            console.warn(`[REPORTER] Failed to clean up orphaned processor:`, e);
          }
        })();

        testResults.push(cleanupPromise);
      }
    }

    // Almacenar test case IDs exitosos
    /*if (result.status === 'passed' && testCaseId) {
      this.successfulTestCaseIds.push(testCaseId);
    }*/
    //this.stepDescriptionsMap.delete(test.id);
  }

  async onEnd(result: FullResult) {
    await Promise.allSettled(testResults);
    await this.publishToZephyr();
    console.log(`Finished the run: ${result.status}`);

    // Publicar lista de test cases exitosos
    /*if (this.successfulTestCaseIds.length > 0) {
      console.log('\n=== SUCCESSFUL TEST CASES ===');
      console.log(`Total successful tests: ${this.successfulTestCaseIds.length}`);
      console.log('Test Case IDs:');
      this.successfulTestCaseIds.forEach((testCaseId) => {
        console.log(`${testCaseId}`);
      });
      console.log('=============================\n');
    }
    else {
      console.log('\nNo successful test cases found.\n');
    }*/
  }

  /**
   * Publishes one execution per test, with the status aggregated across every
   * attempt. Whatever could not be published is listed in the shard's log by
   * publishRunResults, and the reconciliation job closes the gap independently
   * from the merged reports.
   */
  private async publishToZephyr(): Promise<void> {
    if (!this.rootSuite) return;

    try {
      await testCycleService.publishRunResults(this.rootSuite.allTests());
    } catch (error) {
      // A reporting failure must not change the run's exit code, but it must be
      // loud: a silent one is what let NO EXECUTED go unnoticed for so long.
      console.error('[ERROR] ZEPHYR SCALE - Publishing run results failed:', error);
    }
  }
}
export default PwDeunaReporter;
