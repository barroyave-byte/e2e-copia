#!/usr/bin/env node

/**
 * Script to filter Playwright JSON report to only include passed tests
 * Usage: node scripts/filter-passed-tests-json.ts <input-json-path> <output-json-path>
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  status: string;
  [key: string]: any;
}

interface Test {
  results: TestResult[];
  [key: string]: any;
}

interface TestCase {
  tests?: Test[];
  [key: string]: any;
}

interface Suite {
  suites?: Suite[];
  specs?: TestCase[];
  [key: string]: any;
}

interface PlaywrightReport {
  suites: Suite[];
  [key: string]: any;
}

/**
 * Recursively filter suites to only include passed tests
 */
function filterPassedTests(suite: Suite): Suite | null {
  const filteredSuite: Suite = { ...suite };

  // Filter tests in current suite
  if (suite.specs) {
    const passedTests = suite.specs.filter((spec) => {
      if (!spec.tests || spec.tests.length === 0) return false;

      return spec.tests.some((test) => {
        // Include flaky tests (failed but eventually passed on retry)
        if (test.status === 'flaky') {
          return true;
        }

        // Include tests that passed
        return test.status === 'expected' || test.status === 'passed';
      });
    });

    if (passedTests.length > 0) {
      filteredSuite.specs = passedTests;
    } else {
      delete filteredSuite.specs;
    }
  }

  // Recursively filter nested suites
  if (suite.suites && suite.suites.length > 0) {
    const filteredNestedSuites = suite.suites
      .map((nestedSuite) => filterPassedTests(nestedSuite))
      .filter((nestedSuite) => nestedSuite !== null) as Suite[];

    if (filteredNestedSuites.length > 0) {
      filteredSuite.suites = filteredNestedSuites;
    } else {
      delete filteredSuite.suites;
    }
  }

  // If suite has no tests and no suites, return null to exclude it
  if (!filteredSuite.specs && !filteredSuite.suites) {
    return null;
  }

  return filteredSuite;
}

/**
 * Count total number of tests in a report
 */
function countTests(report: PlaywrightReport): number {
  let count = 0;

  function countInSuite(suite: Suite): void {
    if (suite.specs) {
      count += suite.specs.length;
    }
    if (suite.suites) {
      suite.suites.forEach(countInSuite);
    }
  }

  report.suites.forEach(countInSuite);
  return count;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node filter-passed-tests-json.ts <input-json-path> <output-json-path>');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1]);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Reading Playwright report from: ${inputPath}`);

  const rawData = fs.readFileSync(inputPath, 'utf-8');
  const report: PlaywrightReport = JSON.parse(rawData);

  console.log(`Original report contains ${countTests(report)} total tests`);

  const filteredReport: PlaywrightReport = {
    ...report,
    suites: report.suites
      .map((suite) => filterPassedTests(suite))
      .filter((suite) => suite !== null) as Suite[],
  };

  const passedCount = countTests(filteredReport);
  console.log(`\n📊 Filtered report contains ${passedCount} passed tests`);

  fs.writeFileSync(outputPath, JSON.stringify(filteredReport, null, 2), 'utf-8');
  console.log(`\n💾 Filtered report written to: ${outputPath}`);

  if (passedCount === 0) {
    console.log('⚠️  No passed tests found!');
  } else {
    console.log(`✅ Found ${passedCount} passed test(s)`);
  }
}

// Run main function
main();
