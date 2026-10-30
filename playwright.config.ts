import { defineConfig, devices } from '@playwright/test';
/**
 * Reading (.env) environment variables file.
 * https://github.com/motdotla/dotenv
 */
require('dotenv').config();
//dotenv.config({path: './.env'});
// @ts-check
const path = require('path');

/**
 * Chrome muestra el interstitial "The information you're about to submit is not
 * secure" cuando una pagina HTTPS envia un form a un origen HTTP plano (el stack
 * local de docker: apigw, admin-ff, explore-deuna...). Solo pasa en modo headed.
 *
 * No sirve --disable-features=InsecureFormSubmissionInterstitial: la feature ya
 * no existe en Chromium y ademas ese switch pisa la lista de --disable-features
 * que Playwright pasa por defecto. La forma soportada es marcar esos origenes
 * HTTP locales como confiables.
 */
const insecureOrigins = Array.from(
  new Set(
    [
      process.env.BASE_URL_POSTMAN,
      process.env.ADMIN_URL,
      process.env.EXPLORE_URL,
      ...(process.env.EXTRA_INSECURE_ORIGINS || '').split(','),
    ]
      .filter((url): url is string => !!url && url.startsWith('http://'))
      .map((url) => new URL(url).origin)
  )
);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  globalSetup: require.resolve('./playwright/tests/global.setup'),
  /* Directory with the test files. */
  testDir: './playwright/tests',
  // Glob patterns or regular expressions to ignore test files.
  testIgnore: ['./playwright/tests/utils.spec.ts', './playwright/tests/visual/**/*'],
  // Glob patterns or regular expressions that match test files.
  //testMatch: 'tests/*Test.spec.ts',
  // snapshotPathTemplate: "{testDir}/test-results/screenshots/{testFilePath}/{arg}{ext}",
  snapshotPathTemplate: path.join(
    __dirname,
    'playwright/visual/reference_images/{testFileName}/{testFileName}-{arg}{ext}'
  ),

  /* Maximum time one test can run for. Each test is given 300 seconds.*/
  //workers: 10,
  retries: 1,
  timeout: 4 * 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 40 * 1000,
  },
  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: './playwright/test-results',

  // Path to the global setup files. (LABR: consultar al equipo)
  // globalSetup: require.resolve('./global-setup'),

  // path to the global teardown files. (LABR: consultar al equipo)
  // globalTeardown: require.resolve('./global-teardown'),

  /** Run tests in files in parallel. Have all tests in all files to run in parallel.
   * See https://playwright.dev/docs/test-parallel for more details.
   * */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  // forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  // retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  // workers: process.env.CI ? 1 : undefined,
  //
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  //reporter: [['list','html']],
  reporter:
    process.env.CI === 'true'
      ? [['html'], ['blob'], ['./playwright/support/pwDeunaReporter.ts']]
      : [
        ['list', { printSteps: true }],
        ['line'],
        ['html'],
        ['json', { outputFile: 'playwright-report/test-results.json' }],
        ['./playwright/support/pwDeunaReporter.ts'],
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',



    launchOptions: {
      //slowMo: 1000,
      args: [
        '--disable-gpu',
        '--disk-cache-size=0',
        '--disable-background-networking',
        '--disable-default-apps',
        '--no-first-run',
        ...(insecureOrigins.length
          ? [`--unsafely-treat-insecure-origin-as-secure=${insecureOrigins.join(',')}`]
          : []),
      ],
    },

    screenshot: process.env.SCREENSHOT_OFF === 'true' ? 'off' : (process.env.CI === 'true' ? 'off' : 'only-on-failure'),
    video: process.env.VIDEO_OFF === 'true' ? 'off' : (process.env.CI === 'true' ? 'on-first-retry' : 'retain-on-failure'),
    headless: true,
    trace: process.env.TRACE_OFF === 'true' ? 'off' : (process.env.CI === 'true' ? 'on-first-retry' : 'retain-on-failure'),
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  /* Configure projects for major browsers */
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: ['playwright/tests/case-base/**/*'],
    },
    {
      name: 'only_preprod',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
      },
    },
    {
      name: 'visual-testing',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        storageState: 'playwright/.auth/user.json',
        screenshot: 'only-on-failure',
      },
      dependencies: ['setup'],
    },
    /* Files matching one of these patterns are not executed as test files.
    Matching is performed against the absolute file path.
    Strings are treated as glob patterns. */
  ],
  globalTeardown: require.resolve('./playwright/tests/global.teardown'),

  /* Run your local dev server before starting the tests */
  //webServer: {},
});
