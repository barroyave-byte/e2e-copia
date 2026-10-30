# AGENTS.md

This file provides guidance to any AI coding agent working in this repository — Codex,
Cursor, OpenHands, Claude Code and the rest. `CLAUDE.md` is a symlink to it, which is how
Claude Code picks it up; the others read `AGENTS.md` directly. Edit this file, never the
symlink.

## Working on a qa-testgen pull request

A branch named `qa-testgen/*` was opened by qa-testgen's codegen agent as a draft PR.
**Before changing anything on it, read the pull request's description** (`gh pr view`):
it is the handoff — which Zephyr test cases were automated and which were not and why,
the assumptions and limitations of the automation (e.g. a check that is not observable
from the browser), and the PR Reviewer findings the agent left on purpose, each with its
reason. The repository has no notes file for this; the description is the only copy.

This is for whoever continues the work. qa-testgen's own agent, the one opening the PR,
skips it: there is no PR yet, and its task says what to do.

# Project Rules

## Testing

- **All Playwright tests MUST be written using the DSL testing framework.** Before writing or modifying any test file, always invoke the `dsl-test` skill first. Never write raw Playwright interactions (page.click, page.fill, etc.) directly in test files — use the `TestingFramework` DSL with action steps instead.
- Never guess action names or parameter shapes. Always use `npm run list-actions` and `npm run describe-actions` to discover available actions and their signatures before writing a test.
- **To diagnose a flaky test, invoke the `flaky-rca` skill first.** It carries the RCA
  procedure that has been used to find the actual root causes in this repo (read the
  report's step timings and stdout, mine the trace's network layer, isolate the variable
  in a standalone script, measure timing gaps, A/B the fix, audit the blast radius). Never
  report a suspected cause as a conclusion, and never "fix" a flaky by raising a timeout
  or adding a retry over a real failure.
- **Before writing or reviewing any test file, check [`docs/flaky-test-patterns.md`](docs/flaky-test-patterns.md).** It catalogs confirmed root causes of flaky tests in this repo (network listener ordering, unbounded waits, merchant credential leaks via `saveConfig`, ambiguous locators, unchecked `.find()` results, visual-test timing, headed-only browser behavior, `sec-ch-ua` antibot blocks, Statsig flag propagation, floating promises from a missing `await`, non-waiting `isVisible()` checks, unbounded Metabase polling behind a static sleep) with wrong-vs-right code for each. New tests that reproduce these patterns will be flaky.

## HTTP response validation standard

**Any `api.*` plugin action that validates an HTTP response (status and/or body) MUST go through `assertHttpResponse` / `checkHttpResponse` from [`playwright/framework/httpContract.ts`](playwright/framework/httpContract.ts).** Never call `expect(response.status).toBe(...)` or hand-roll a body comparison directly inside a plugin action or a spec — that is how `apiCallNewman.ts` ended up with a dozen slightly different mismatch messages, some of them dumping an unredacted response body into the failure output.

- `playwright/framework/httpContract.ts` — the contract: `HttpRequest` (`method`, required `operation`, optional `body`) and `ExpectedResponse` (`status`, optional `body`, optional `bodyMatcher`). `assertHttpResponse(request, response, expected)` throws with a single formatted message on mismatch; `checkHttpResponse(...)` returns a `{ passed, failures, trace }` result instead of throwing, for callers that need to decide how to surface a failure themselves.
- `playwright/framework/matchers.ts` — the comparison logic (`equals` for subset/structural body matching, `equalsScalar` for status codes and other primitives). Exposed as `Matchers`; pass a custom `Matcher` via `expected.bodyMatcher` only when `equals` genuinely doesn't fit.
- `playwright/framework/diff.ts` — produces the structural diff (`diff()` / `formatDiff()`) that `equals` uses to explain _what_ mismatched instead of dumping both full objects.
- `request.operation` is **required** and must be a real, non-empty name (e.g. `"purchaseWithCreditCard"`) — `checkHttpResponse` throws at runtime if it's missing, because every failure/report entry is keyed by it.
- Response bodies are redacted (via `playwright/framework/redact.ts`) before being included in any trace or failure message — never bypass this by logging `response.data`/`response.body` directly.
- See `$tf_assertPurchaseStatus` in [`playwright/framework/plugins/api/api.payment.ts`](playwright/framework/plugins/api/api.payment.ts) for the reference usage inside a plugin action.
- This does not replace `apiCallNewman.ts` — it wraps whatever response shape those calls already return. Migrating its remaining ad-hoc `expect()` calls (`captureV2`, `refundOrderV2`, `voidOrder`, etc.) to this standard is in-progress work, not yet done everywhere — don't assume every existing `api.*` call already complies.

## Testing standard enforced on every PR

The PR Reviewer Agent audits the added lines of every pull request against these
rules and **fails the check** on any `error`. Write tests that comply from the
start instead of fixing them after CI reports them. Details and exemptions in
[`scripts/pr-review-agent/README.md`](scripts/pr-review-agent/README.md).

**Run it yourself before you finish** — it reviews your uncommitted changes, the
same way CI will review the pull request, in a couple of seconds:

```bash
npm run pr-review -- --worktree --no-llm          # human-readable
npm run pr-review -- --worktree --no-llm --json   # one JSON document on stdout
```

Fix every `error` and `warning` it reports. When you believe a finding is a false
positive, or that the context justifies it, leave the code as it is and say why in
the pull request — never edit the agent, and never add a marker such as
`// migration-or` only to silence a rule.

| Rule                               | Severity                                      | Never do this                                                                                                            |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `no-static-wait`                   | error                                         | `waitForTimeout`, `sleep`, `setTimeout(resolve, n)`. Wait for an event instead                                           |
| `no-locators-in-spec`              | error                                         | Declare a locator inside a `.spec.ts`. It belongs in the DSL plugin or the Page Class                                    |
| `no-raw-interaction-in-spec`       | error in DSL, warning in legacy               | `page.click/fill/type…` in the test body                                                                                 |
| `locators-in-constructor`          | error in Page Classes, warning in DSL plugins | Declare a locator inside a method rather than the `constructor`                                                          |
| `fragile-selector`                 | error                                         | XPath, `:nth-child`, `Mui-`/`css-` classes, 3+ level CSS chains                                                          |
| `no-swallowed-error`               | error                                         | A `catch` that neither rethrows nor fails. The test passes while broken                                                  |
| `test-without-assertion`           | error                                         | A test with no `expect`, no `assert*` call and no assertion action step                                                  |
| `no-commented-out-code`            | error                                         | Leave commented-out code. Git history already keeps it                                                                   |
| `no-hardcoded-secrets`             | error (URLs: warning)                         | JWTs, `Bearer`, `sk_live_*`, AWS keys. Base URLs come from `envConfig`                                                   |
| `no-saveconfig-credentials`        | error                                         | `saveConfig` merchant getters. The globals are gone; pass credentials explicitly from the test                           |
| `dsl-action-requires-ordertoken`   | error                                         | A DSL step whose action needs an order token without passing one. `tsc` cannot see it: the param is optional             |
| `dsl-action-requires-merchant`     | error                                         | A DSL step whose action needs a merchant credential without passing one. Same blind spot as the order token              |
| `unused-tokenize-result`           | warning                                       | Capture a `tokenize` result nobody reads. The order is created and then unreachable                                      |
| `no-focused-tests`                 | error                                         | `test.only`, `describe.only`, `fit`. The rest of the suite silently stops running                                        |
| `no-deprecated-type`               | error                                         | `.type()`. Use `.fill()` or `.pressSequentially()`                                                                       |
| `no-networkidle`                   | error                                         | `waitForLoadState('networkidle')`. Playwright documents it as discouraged                                                |
| `wrong-test-import`                | error                                         | Import `test`/`expect` from `@playwright/test`. Use `@support/fixtures`                                                  |
| `testcase-id`                      | error                                         | A missing ID, an ID whose prefix is not a Zephyr project key, an ID that does not match the file name, or a duplicate ID |
| `describe-requires-regression-tag` | error                                         | Omit `@regression` from a `test.describe()` that declares cases. Without it the regression suite never runs them         |
| `team-tag-required`                | error                                         | Add a spec under `playwright/tests/` without a team tag from `VALID_TAGS` in `team-tag-validation.yml`. CI blocks it too |
| `no-testcase-id-in-describe`       | error                                         | Put the test case ID in `test.describe()`. It goes on the `test()`                                                       |
| `assert-without-expect`            | warning                                       | Name a method `assert*` when its body cannot fail                                                                        |
| `no-adhoc-retry`                   | warning                                       | Hand-write a retry loop. Use `playwright/support/utils/retries.ts`                                                       |
| `duplicate-selector`               | warning                                       | Declare the same selector in a second Page Class                                                                         |
| `duplicate-function`               | warning                                       | Add a method whose name already exists in another locator layer                                                          |
| `zephyr-title-match`               | warning                                       | Let the `test()` title drift from the Zephyr Scale test case name                                                        |
| `new-spec-framework`               | warning                                       | Write a new spec against the legacy framework instead of the DSL                                                         |
| `mixed-framework`                  | warning                                       | Import both the DSL and `@pages/*` in the same spec                                                                      |
| `prefer-testid`                    | info                                          | Prefer `getByTestId` over CSS or visible text for new locators                                                           |
| `shared-method-impact`             | info                                          | Informational: lists the test cases affected by a shared method you changed                                              |
| `spanish-message`                  | info                                          | Report messages and code comments go in English; locator strings stay in Spanish                                         |

## Project Overview

This is a large-scale Playwright + TypeScript E2E testing framework for the DEUNA payment platform, covering 100+ payment processors, checkout flows, admin dashboards, fraud detection, analytics, and more.

## Setup

```bash
nvm install && nvm use  # Node 24 LTS from .nvmrc, which bundles npm 11
npm ci                  # recommended; `npm install` also works and leaves the lockfile as is with npm 11
npx playwright install
# Obtain .env file from Notion (required for credentials and environment URLs)
```

Node and npm are pinned: **Node 24 LTS** (`.nvmrc`, also read by every CI workflow and matched by the Docker image) with its bundled **npm 11** (`package.json` → `engines`, enforced by `engine-strict` in `.npmrc` and by the pre-commit hook). Another npm major rewrites `package-lock.json` differently, so it is rejected. If `npm ci` fails with `EBADENGINE`, run `nvm install && nvm use` (or `npm install -g npm@11`). Never commit a `package-lock.json` change in a PR that does not change dependencies.

## Common Commands

```bash
# Run all tests (Chromium)
npx playwright test --project=chromium

# Run a single test by test case ID (headed)
npx playwright test PI-T629 --headed --project=chromium

# Run regression suite
npx playwright test --grep @regression

# Run by tag
npx playwright test --grep @checkout_base --project=chromium
npx playwright test --grep @elements_link --project=chromium
npx playwright test --grep @checkout_qsr --project=chromium


# Run visual regression tests
npx playwright test --project=visual-testing --grep @visual

# Update visual snapshots for ONE test case (the id is required on purpose:
# without it the command rewrites every baseline in the repo)
npm run update-snapshot -- ENTP1-T2594

# Format code
npm run format-code

# AI test summarization
npm run ai-summarize
```

## Test Naming and File Conventions

- Each `.spec.ts` file corresponds to exactly one Zephyr Scale test case ID (e.g., `PI-T629.spec.ts`)
- The filename must match the `@testcaseid` inside the file (e.g., `@PI-T629`)
- Test case IDs are unique across the entire test suite
- Commit hooks (Husky + lint-staged) enforce ID format, uniqueness, and Zephyr Scale existence

Valid Zephyr project keys: `PI`, `ENTP1`, `PAYM`, `ADM`, `PF`, `PLAT`, `RECON`, `ECOM`.
The ID is the key plus the case number: `@PI-T629`, `@ADM-T1`, `@ENTP1-T2576`.
A Jira key cannot start with a digit, so a tag such as `@3DS-T0001` resolves to no
test case in Zephyr and the agent blocks it.

## Test Structure Pattern

```typescript
import { test } from '@support/fixtures';

test.describe('@regression Feature description', () => {
  test.beforeAll(async ({ emaService }) => {
    // Global setup: configure merchant, create processor via API
    await configMerchantCheckout.basicSetup('MX');
    await apiCallNewman.createPaymentProcessor(processorsConfig.someProcessor);
  });

  test(
    '@PI-T629 Test description',
    { tag: ['@tag1', '@team_payment_integration'] },
    async ({ page }) => {
      await test.step('Step description', async () => {
        // implementation
      });
    }
  );
});
```

## Architecture

### Path Aliases (tsconfig.json)

| Alias             | Maps to                                       |
| ----------------- | --------------------------------------------- |
| `@pages/*`        | `playwright/pages/*`                          |
| `@support/*`      | `playwright/support/*`                        |
| `@tests/*`        | `playwright/tests/*`                          |
| `@visual/*`       | `playwright/visual/*`                         |
| `@translations/*` | `playwright/support/translations/*`           |
| `@deuna/test`     | `playwright/support/fixtures/global-fixtures` |

### Key Layers

**`playwright/tests/`** — Test files organized by domain:

- `PSP/` — Payment processors (adyen, stripe, conekta, bamboo, etc.), each with subdirs for `authorize/`, `capture/`, `refund/`, `void/`, `purchase_directo/`, `msi/`, `3ds/`, etc.
- `admin/` — Admin portal (auth, orders, config)
- `checkout/` — Checkout flows
- `APM/` — Alternative payment methods
- `BNPL/` — Buy Now Pay Later
- `case-base/` — Standardized base cases (uses separate Playwright project)
- `visual/` — Visual regression (ignored by main project, use `visual-testing` project)

**`playwright/pages/`** — Page Object Model classes mirroring the test domain structure (admin, checkout, payments_integrations, etc.)

**`playwright/support/`**:

- `fixtures/global-fixtures.ts` — Extended `test` fixture; grants permissions, injects mock requests, optionally sets `window.devUrl` for local execution
- `api_sup/config_merchant_sup/` — Merchant configuration helpers (`ConfigMerchant`, `ConfigMerchantCheckout`)
- `newman/apiCallNewman.ts` — Runs Postman collections via Newman for API-level setup (creating processors, orders, etc.)
- `interfaces/` — Shared TypeScript interfaces and test data (credit cards, user data, addresses, payment processor configs)
- `zephyr/zephyrService.ts` — Zephyr Scale integration for test management and results publishing
- `mocks/requests/mockRequests.ts` — Request interception applied globally to all test contexts
- `pwDeunaReporter.ts` — Custom Playwright reporter
- `envConfig.ts` — Centralizes environment variable access

### Playwright Projects

| Project          | Purpose              | Auth                         | Notes                   |
| ---------------- | -------------------- | ---------------------------- | ----------------------- |
| `chromium`       | Main test suite      | `playwright/.auth/user.json` | Depends on `setup`      |
| `setup`          | Auth setup           | —                            | Runs `*.setup.ts` files |
| `visual-testing` | Visual regression    | `playwright/.auth/user.json` |                         |
| `only_preprod`   | Pre-production tests | —                            | No auth dependency      |

### Test Tags

- `@regression` — Full regression suite
- `@smoke` — Smoke tests
- `@visual` — Visual regression
- `@checkout_base`, `@checkout_qsr`, `@elements_link` — Checkout domain suites
- `@team_*` — Team ownership. **Every new spec needs one**; the valid list is `VALID_TAGS` in `.github/workflows/team-tag-validation.yml`, which CI enforces and the reviewer's `team-tag-required` reads (`@team_payconnect`, not `@payconnect`)
- `@preprod`, `@staging` — Environment-specific

### CI/CD

GitHub Actions workflows in `.github/workflows/`. Tests run with `CI=true` which changes reporters (blob + html only) and media capture behavior (video on first retry, no screenshots).

## Tooling

- **`make setup-processor-folder`** — Scaffolds folder structure for a new payment processor (`brew install jq` required on macOS)
- **`make create-basic-test`** — Creates a test from templates in `test_case_templates/`
- **`npm run generate-test-cases`** — Generates test cases from Jira
- **`npm run ai-summarize`** — OpenAI-powered test report summarization (`jul-ia-n/`)
