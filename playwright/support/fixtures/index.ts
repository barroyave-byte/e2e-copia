// Re-export all fixtures from a central location
// Using globalAfterEach to ensure the after hook runs for every test
export { test, expect, type ServiceFixtures } from './globalAfterEach';

// Also re-export anything else from global fixtures that might be needed
export * from './global-fixtures';
