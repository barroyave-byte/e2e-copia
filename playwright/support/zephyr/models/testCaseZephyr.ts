export interface TestCaseZephyr {
  projectKey: string;
  testCaseKey: string;
  testCycleKey: string;
  statusName: string;
  executionTime?: number;
  executedById?: string;
  assignedToId?: string;
  comment?: string;
  environmentName?: string;
}

export interface TestCaseKey {
  TEST_CASE_KEY: string;
}
