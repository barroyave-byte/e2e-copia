---
name: incident-to-test
description: Automates a Zephyr test case as regression coverage for an incident (RIS/INCS/EMA) using the DSL Framework of the e2e-testing repo. Use it when the user provides an incident file and a Zephyr CSV and asks to automate the case, reproduce a production bug in a test, cover an incident with a spec, or says "automate RIS-XXX with PLAT-TXXXX" ("automatiza RIS-XXX con PLAT-TXXXX"). Also applies when asked to assess whether the Zephyr steps are enough to prevent the regression.
---

# Incident → regression test (DSL)

## Variables

They are passed as arguments when invoking the skill, in any order. Resolve whatever is
missing with the default rule. If `INCIDENT_FILE` or `ZEPHYR_CSV` is missing and cannot be
deduced from the files in the directory, ask before starting.

| Variable        | How it is recognized in the arguments  | Default if missing                                                                                                        |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `INCIDENT_FILE` | path or name of a `.md` file           | look in the repo root for a `.md` named after an incident (`RIS-*`, `INCS-*`, `EMA-*`)                                    |
| `ZEPHYR_CSV`    | path or name of a `.csv` file          | look in the repo root for a `.csv` named after a test case                                                                |
| `TEST_CASE_ID`  | token like `PLAT-T1624`                | deduce it from the CSV `Key` column                                                                                       |
| `TEST_DIR`      | path starting with `playwright/tests/` | pick the folder by the service under test (`api_ema/`, `api_cards/`, `PSP/`, `admin/`) and justify the choice in one line |
| `TEAM_TAG`      | token starting with `@team_`           | deduce it from the case's domain; if in doubt, ask                                                                        |
| `EXTRA_TAGS`    | other tokens starting with `@`         | `@api` if the flow is 100% API; none if it is UI                                                                          |
| `TARGET_ENV`    | `staging`, `preprod`, `dev`            | `staging`                                                                                                                 |
| `RUN_TEST`      | `--no-run` to disable it               | yes — run the spec and paste the real output                                                                              |

Before starting, print the table of resolved variables so the user can confirm or correct
it at a glance.

## Goal

Automate the Zephyr test case `TEST_CASE_ID` (`ZEPHYR_CSV`) as regression coverage for the
incident described in `INCIDENT_FILE`, using the DSL Framework and reusing what the repo
already has.

## Context to read before writing code

- `INCIDENT_FILE` — it tells you WHAT failed, the exact error and what the fix was. The
  test's central assertion must prove that fix, not a neighboring happy path.
- `ZEPHYR_CSV` — it gives the step sequence, its test data and its expected result.
- Repo rules: `CLAUDE.md`, `.claude/skills/dsl-test/SKILL.md`,
  `scripts/pr-review-agent/README.md`, `docs/flaky-test-patterns.md`.

## Precedents — this work already has a mold, follow it

The repo has already automated incidents with this same pattern. Read them first and copy
their structure; do not invent a new one:

- `playwright/tests/api_cards/v2/cards/PI-T2185.spec.ts` (incident RIS-132) + its actions
  in `playwright/framework/plugins/setup/setup.user.ts` (`createCard`, `getCards`,
  `assertCardCreationRejected`, `assertCardsListHealthy`).
- `playwright/tests/api_ema/orders-pagination/PLAT-T1623.spec.ts` (incident EMA-9999)
  - `api.orders.listOrders` / `assertOrdersResponse` / `assertOrdersPagesCoverOrderIds`.

The standard that follows from them, which you must respect:

- 100% DSL spec (`TestingFramework` + `ref()`), no imperative `beforeAll`, no `expect()`
  and no locators in the spec.
- Header JSDoc in the spec: which incident it covers, what the bug was, what the fix was
  (with the reference to the service code if `INCIDENT_FILE` or the CSV include it), what
  the spec covers and what the coverage extension covers.
- Every new assertion is implemented as an `assert*` action in the plugin and invoked as a
  step. If it validates an HTTP response, it MUST go through `assertHttpResponse` /
  `checkHttpResponse` from `playwright/framework/httpContract.ts` with a real `operation`;
  never a hand-written `expect(response.status).toBe(...)`.
- Anomalies in the Zephyr CSV (pasted step text, broken references, steps without data)
  are resolved by documenting the interpretation in a comment, as PI-T2185 did with its
  duplicated step. Do not silently ignore them.

## Step 1 — Discovery (do not audit the repo blindly)

Use the tools that already exist instead of walking folders:

```bash
npm run list-actions
npm run describe-actions <action> [...]
```

Deliver a table: CSV step | existing DSL action that covers it | params | gap.

- Never invent action names or parameter shapes; confirm them with `describe-actions`.
- Before creating something, check that it does not exist: several actions do more than
  their name suggests (e.g. `api.payment.purchaseWithCreditCard` already performs the
  guest login).
- Prefer `setup.*` over imperative setup: merchant, processor, order, shopper, login and
  checkout config already have an action.
- Report utilities outside the DSL (`EmaService`, fixtures from
  `playwright/support/interfaces/**`, models from `playwright/support/http/models/`) only
  if you are actually going to use them. No decorative inventories.

## Step 2 — Gap analysis (this is usually where the real work is)

Before writing the spec, determine and report:

1. **Is the payload that reproduces the incident expressible today?** Check the models in
   `playwright/support/http/models/`. It is common for the repo's type to prevent sending
   exactly the value that caused the bug (a field typed as `string` when the bug was that
   a number arrived, a required field that the real merchant does not send). If the type
   blocks the reproduction, resolve it and explain the decision: widen the type? a raw
   override like the `cardOverrides` of `api.payment.purchaseWithCreditCard`? The
   criterion is that the type reflects what the service really accepts, without opening
   the door for any spec to send garbage.
2. **Does the assertion that proves the fix exist?** If not, create it as an action in its
   plugin, with a `@description` in the JSDoc. The assertion must fail if the bug returns:
   validate the value AND its shape when the bug was about format (type, serialization,
   precision), not just that the field is present.
3. After touching any plugin: `npm run generate-action-types` and `npm run typecheck`.

## Step 3 — Delivery

1. `TEST_DIR/TEST_CASE_ID.spec.ts`
   - `test.describe('@regression <description>')`,
     `test('@TEST_CASE_ID <exact name from the CSV>', { tag: ['TEAM_TAG', 'EXTRA_TAGS'] }, ...)`.
   - File name = test case ID. No `@preprod` (QA adds that tag).
   - If the CSV includes a baseline or control step, decide whether it goes in the same
     spec or a separate one and justify it in one line; if separate, say which Zephyr ID
     it needs.
2. The new actions in their corresponding plugin.
3. If `RUN_TEST` = yes: run against `TARGET_ENV` and paste the real output:
   ```bash
   npx playwright test TEST_CASE_ID --project=chromium
   ```
   If it fails because of environment or credentials, say so explicitly; do not report
   green without evidence and do not mark as "passing" something you did not run.
4. **Coverage extension**, grounded as in PI-T2185: are the Zephyr steps enough to keep
   the incident from coming back? Derive the edge cases from the real mechanism of the bug
   described in `INCIDENT_FILE` (boundary values, the same data in other payload fields,
   race conditions, 4xx/5xx, timeouts). For each case you propose: why the Zephyr test
   does not catch it, what concrete regression it prevents, and its DSL code. If you
   conclude that no more coverage is needed, justify it technically — it is a valid
   answer; do not invent cases to fill space.

## Constraints

- No `waitForTimeout`, `networkidle`, `test.only`, hand-written retries or credentials via
  `saveConfig` — the PR Reviewer Agent blocks all of that as an error.
- If something you need does not exist, say so; do not invent actions or parameters.
