import ZephyrService from './services/zephyrService';
import MetabaseService from './services/metabaseService';
import TestCycleService from './services/testCycleService';
import {
  URL_API_ZEPHYR,
  ZEPHYR_ACCESS_TOKEN,
  USER_ID_ZEPHYR,
  ZEPHYR_PROJECT_NAME,
  ZEPHYR_CYCLE_NAME,
  QUERY_ID,
} from './utils/config';
import { TestCycle } from './models/testCycle';
import envConfig from '@support/envConfig';

const testCycleData: TestCycle = {
  projectKey: ZEPHYR_PROJECT_NAME,
  name: ZEPHYR_CYCLE_NAME,
  description: 'example',
  jiraProjectVersion: 10000,
  plannedStartDate: new Date().toISOString(),
  plannedEndDate: new Date().toISOString(),
};

const zephyrService = new ZephyrService(URL_API_ZEPHYR, ZEPHYR_ACCESS_TOKEN);
const metabaseService = new MetabaseService();
const testCycleService = new TestCycleService(zephyrService, metabaseService, USER_ID_ZEPHYR);

async function createAndLoadTestCycle() {
  const testCycleKey = await zephyrService.createTestCycle(testCycleData);
  console.log(
    '[INFO] ZEPHYR SCALE - The test cycle was created and the cycle key is: ',
    testCycleKey
  );
  process.env.TEST_CYCLE_ID = testCycleKey;
  if (envConfig.LOAD_TEST_CASES_ZEPHYR_SCALE === 'true') {
    await testCycleService.loadTestCycleWithTestCases(QUERY_ID, testCycleKey);
  }
}

export { testCycleService, createAndLoadTestCycle };
