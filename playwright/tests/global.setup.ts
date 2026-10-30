import { type FullConfig } from '@support/fixtures';
import { createAndLoadTestCycle } from '@support/zephyr';
import { TEST_CYCLE_ID, PUBLISH_RESULTS_ZEPHYR } from '@support/zephyr/utils/config';

async function globalSetup(config: FullConfig) {
  if (PUBLISH_RESULTS_ZEPHYR === 'true' && !TEST_CYCLE_ID) {
    await createAndLoadTestCycle();
  }
}

export default globalSetup;
