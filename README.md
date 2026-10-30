<br />
<br />
<div id="top" align="center">
  <img src="https://assets.website-files.com/61ef494dd91ec340af6b0a89/61ef494dd91ec3528b6b0b57_Frame.svg" alt="DEUNA Logo" />
  <h3>e2e Testing</h3>
</div>

<br />
<br />

This repository is dedicated to creating, maintaining, and running automated end-to-end (E2E) tests using Playwright with TypeScript. These tests are designed to guarantee the quality and stability of the applications developed by DEUNA.

All information relevant to this E2E testing framework can be found in the following Notion [New process to automate e2e test cases](https://www.notion.so/deuna/Nuevo-proceso-para-automatizar-casos-de-prueba-E2E-317a21a4aaf949608fae1e0e437f814c?pvs=4)

In this document you will find the step by step to create automated test cases, test case execution, structure, design patterns among many other things.

<details>
  <summary>Table of contents</summary>
  <ol>
    <li>
      <a href="#description">Description</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
    </li>
        <li>
      <a href="#setup">Setup</a>
    </li>
    <li>
      <a href="#execution-commands">Execution commands</a>
    </li>
    <li>
      <a href="#commit-validation-script">Commit Validation Script</a>
    </li>  
    <li>
      <a href="#folder-structure">Folder Structure</a>
    </li>
  </ol>
</details>
<br />

<h2 id="description">Description</h2>

E2E testing is essential to ensure that DEUNA applications work efficiently and error-free in all possible scenarios. In this repository, we have implemented an E2E test suite using Playwright, a powerful browser automation library that allows you to interact with web applications in a realistic and reliable way.

<p align="right"><a href="#top">🔝</a></p>

<h2 id="getting-started">Getting Started</h2>

Technologies used and that are necessary prior to installation:

- [Node](https://nodejs.org/) <small>JavaScript runtime (I recommend using [nvm](https://github.com/nvm-sh/nvm) to manage multiple versions of node).</small>
- [TypeScript](https://www.typescriptlang.org/) <small>TypeScript compiler.</small>

<p align="right"><a href="#top">🔝</a></p>

<h2 id="setup">Setup</h2>

To run project you need to follow below steps:

1. run `nvm install && nvm use` (Node 24 LTS from `.nvmrc`, which bundles **npm 11**; the repo rejects other Node/npm majors with `EBADENGINE`).
2. run command `npm ci` (recommended; `npm install` also works, see [Dependencies](#dependencies)).
3. run command `npx playwright install`.
4. get .env file - go to the following link: https://www.notion.so/deuna/Nuevo-proceso-para-automatizar-casos-de-prueba-E2E-317a21a4aaf949608fae1e0e437f814c?pvs=4#ff163e5252d547a2ba85b99c54afa79b

<h3 id="dependencies">Dependencies</h3>

| I want to…                                          | Command                                                  |
| --------------------------------------------------- | -------------------------------------------------------- |
| Install after a clone or a `git pull` (recommended) | `npm ci`                                                 |
| Same, the old way                                   | `npm install` (with npm 11 it leaves the lockfile as is) |
| Add a dependency                                    | `npm install <pkg>` or `npm install -D <pkg>`            |
| Upgrade a dependency                                | `npm install <pkg>@<version>`                            |
| Remove a dependency                                 | `npm uninstall <pkg>`                                    |

- `npm ci` installs exactly what `package-lock.json` says, starting from a clean `node_modules`, and fails instead of changing the lockfile. It is what CI and the Docker image run.
- When you add, upgrade or remove a dependency, commit `package.json` and `package-lock.json` together.
- If `package-lock.json` shows up as modified and you did not touch dependencies, discard it (`git checkout -- package-lock.json`) and check `npm --version` is 11. It usually means another npm version rewrote it.
- `EBADENGINE` means you are on another Node/npm: run `nvm install && nvm use`.

<h2 id="execution-commands">Execution commands</h2>

Note: If you execute the commands "make" and it does not work, you must install jq on your computer, the command is: `brew install jq` (for MacOS users).

| Command                     | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| make setup-processor-folder | Creating the folder structure for a new payment processor               |
| make create-basic-test      | Create a basic test depending on the functionality you want to automate |

To run an allowlisted test locally against the regional production environment in Oregon:

```bash
npm run test:oregon -- path/to/test.spec.ts --project=chromium
```

The environment uses Oregon domains for every DEUNA-owned endpoint; those DNS records must be enabled before their tests can run. Do not run the full regression or `@healthcheck` suites against this target until they have a production-safe allowlist; those suites create merchants, configuration, orders, and payment transactions.

<p align="right"><a href="#top">🔝</a></p>

<h2 id="commit-validation-script">Commit Validation Script</h2>

To ensure the consistency and integrity of our test cases, we've implemented a commit validation script that runs automatically via Husky upon attempting to commit changes. This script performs several checks:

1. Test Case ID Validation: Verifies that each .spec.ts file contains a valid @testcaseid that matches our predefined format (e.g., @PI-T629).
2. Filename Matching: Ensures the filename of the .spec.ts file matches the @testcaseid mentioned within the file.
3. Unique Test Case ID: Checks that the @testcaseid is unique across all .spec.ts files within the playwright/tests directory.
4. Zephyr Scale Verification: Confirms the existence of the test case ID within Zephyr Scale, ensuring that only valid test cases are committed.

<h3 id="commit-configuration">Configuration</h3>
This script is integrated with Husky and lint-staged to run automatically before each commit. The necessary configurations are included in the project's package.json.
<br />
<h3 id="commit-troubleshooting">Troubleshooting</h3>
If you encounter any issues or the commit is blocked by the script, ensure that:

1. The @testcaseid follows the correct format and is included at the beginning of the test description.
2. The filename matches the @testcaseid without the leading @.
3. There are no duplicate @testcaseids across .spec.ts files.
4. The @testcaseid exists in Zephyr Scale.

For more detailed information on automated E2E test cases and their management, refer to our comprehensive guide in Notion: [New process to automate e2e test cases](https://www.notion.so/deuna/Nuevo-proceso-para-automatizar-casos-de-prueba-E2E-317a21a4aaf949608fae1e0e437f814c?pvs=4)

<h2 id="folder-structure">Folder structure</h2>

```bash
├───📁 makefiles/
│   ├───📄 admin.mk
│   ├───📄 checkout.mk
│   └───📄 payment.mk
├───📁 playwright/
│   ├───📁 pages/
│   │   ├───📁 admin/
│   │   │   ├───📁 auth/
│   │   │   │   └───📄 loginAdminPage.ts
│   │   ├───📁 checkout/
│   │   │   ├───📁 3ds/
│   │   │   │   └───📄 challenge3dsPage.ts
│   │   │   ├───📁 payment/
│   │   │   │   └───📄 paymentPage.ts
│   │   │   ├───📁 post_transaction/
│   │   │   │   └───📄 postTransactionPage.ts
│   │   ├───📁 checkout_tester/
│   │   │   └───📄 checkoutTesterPage.ts
│   │   ├───📁 deuna_now/
│   │   │   └───📄 deunaNowPage.ts
│   │   └───📁 payments_integrations/
│   │       ├───📄 amex3dsPage.ts
│   │       └───📄 paymentez3dsPage.ts
│   ├───📁 support/
│   │   ├───📁 api_sup/
│   │   │   └───📁 config_merchant_sup/
│   │   │       ├───📄 configMerchant.ts
│   │   │       └───📄 configMerchantCheckout.ts
│   │   ├───📁 interfaces/
│   │   │   ├───📁 address_user/
│   │   │   │   ├───📄 baseUserAddress.ts
│   │   │   │   ├───📄 index.ts
│   │   │   │   └───📄 userAddress.ts
│   │   │   ├───📄 checkoutTesterInterface.ts
│   │   ├───📁 newman/
│   │   │   ├───📄 apiCallNewman.ts
│   │   ├───📁 zephyr/
│   │   │   └───📄 zephyrService.ts
│   │   ├───📄 envConfig.ts
│   │   ├───📄 loggerSup.ts
│   │   └───📄 pwDeunaReporter.ts
│   └───📁 tests/
│       ├───📁 admin/
│       │   ├───📁 auth/
│       │   │   └───📄 ADM-T1.spec.ts
│       │   ├───📁 orders/
│       │   │   ├───📄 ADM-T57.spec.ts
│       ├───📁 checkout/
│       │   ├───📁 address/
│       │   │   ├───📄 CHKOUT-T732.spec.ts
│       │   └───📁 user_data/
│       │       ├───📄 CHKOUT-T729.spec.ts
│       ├───📁 forms/
│       │   ├───📁 failed_purchase/
│       │   │   ├───📄 PLAT-T1328.spec.ts
│       ├───📁 payment/
│       │   ├───📁 dynamic_routing/
│       │   │   ├───📄 PAYM-T1426.spec.ts
│       ├───📁 payments_integrations/
│       │   ├───📁 3ds_from_payment_widget/
│       │   │   ├───📄 PI-T1001.spec.ts
│       ├───📄 global.setup.ts
│       └───📄 global.teardown.ts
├───📄 README.md
├───📄 package-lock.json
├───📄 package.json
└───📄 playwright.config.ts
```
