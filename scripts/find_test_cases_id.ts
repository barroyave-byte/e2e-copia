import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to extract retry selectors from a JSON file containing failed test results.
 * The selectors are printed on the last line as a space-separated list so the
 * reusable GitHub Actions workflow can pass them directly to Playwright.
 *
 * @param jsonFilePath - The path to the JSON file containing test results.
 * @returns An array of exact Playwright test location selectors.
 *
 * example execution:
 *
 * npx ts-node scripts/find_test_cases_id.ts failed_tests.json
 */

interface PlaywrightSpec {
  title?: string;
  line?: number;
}

interface PlaywrightSuite {
  file?: string;
  suites?: PlaywrightSuite[];
  specs?: PlaywrightSpec[];
}

interface PlaywrightReport {
  suites?: PlaywrightSuite[];
}

export const extractTestCaseIds = (jsonFilePath: string): string[] => {
  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  const testResults: PlaywrightReport = JSON.parse(fileContent);

  const selectors = new Set<string>();

  /**
   * A `file:line` selector only works when `file` is a test file Playwright
   * loads — that is, a `.spec.ts`. Tests registered from a shared helper
   * (`security/share/admT800.ts`, called from `ADM-T799.spec.ts`) report that
   * helper as their file, and `playwright test share/admT800.ts:66` matches no
   * test file at all: the retry round ran zero tests and the failure stood.
   *
   * For those, fall back to the spec file that loaded the helper — the outermost
   * suite's file — with no line, so the whole spec is re-run. That is also the
   * right unit for a `describe.serial` group, whose tests are meant to run in
   * order.
   */
  const isSpecFile = (file: string) => file.endsWith('.spec.ts');

  const walkSuite = (suite: PlaywrightSuite, inheritedFile?: string, rootFile?: string) => {
    const file = suite.file || inheritedFile;
    const root = rootFile ?? suite.file ?? inheritedFile;

    if (file && Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        if (isSpecFile(file)) {
          if (typeof spec.line === 'number' && spec.line > 0) {
            selectors.add(`${file}:${spec.line}`);
          }
        } else if (root && isSpecFile(root)) {
          selectors.add(root);
        }
      }
    }

    if (Array.isArray(suite.suites)) {
      for (const childSuite of suite.suites) {
        walkSuite(childSuite, file, root);
      }
    }
  };

  if (Array.isArray(testResults.suites)) {
    for (const suite of testResults.suites) {
      walkSuite(suite);
    }
  }

  // A whole-spec selector already covers every line inside that spec.
  const wholeSpecs = new Set([...selectors].filter((selector) => !selector.includes(':')));
  return [...selectors].filter(
    (selector) => !wholeSpecs.has(selector.slice(0, selector.lastIndexOf(':')))
  );
};

const main = () => {
  const args = process.argv.slice(2);
  const jsonFilePath = args[0] || path.join(process.cwd(), 'failed_tests.json');

  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Error: File not found at ${jsonFilePath}`);
    process.exit(1);
  }

  console.log(`Reading test results from: ${jsonFilePath}\n`);

  const testCaseIds = extractTestCaseIds(jsonFilePath);

  if (testCaseIds.length === 0) {
    console.log('No test case selectors found.');
    return;
  }

  console.log(`Found ${testCaseIds.length} failed test selector(s):\n`);
  console.log(testCaseIds.join(' '));
};

if (require.main === module) {
  main();
}
