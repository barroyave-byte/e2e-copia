---
name: migrate-admin-to-new-ds
description: >
  Use when admin Playwright E2E specs fail after an admin-ff design-system or data-testid
  change, when getByTestId locators in playwright/pages/admin are stale, when admin visual
  snapshots drift, or when the user runs /migrate-admin-to-new-ds or asks to heal, align,
  or migrate admin tests (Zephyr IDs or spec paths) to the new admin-ff UI.
---

# migrate-admin-to-new-ds

Align existing admin E2E specs with the current admin-ff UI. Admin-ff is the source of truth for `data-testid` values and visual flows. This repo's tests (and only admin UI failures) are what you change.

This file is the pasteable prompt. When a step says **REQUIRED: read**, load that file before continuing.

**Do not commit** in e2e-testing or admin-ff.

## When NOT to use

- Writing a new test from scratch → **REQUIRED SUB-SKILL:** `dsl-test`
- Failures with no admin UI (checkout, PSP, vault, Newman, API-only)
- Migrating a spec to the TestingFramework DSL (out of scope except as noted below)

## Inputs

Required: at least one spec selector.

| Input                                                      | Required | Default                                                          |
| ---------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| Zephyr IDs (`ADM-T471`, `PI-T629`) and/or spec paths/globs | yes      | —                                                                |
| Absolute path to admin-ff                                  | no       | sibling `../admin-ff` relative to e2e-testing                    |
| `ADMIN_URL`                                                | no       | local Vite (`http://localhost:5173`), start `pnpm dev` if needed |
| `--siblings`                                               | no       | off                                                              |

If the selector is missing, ask once and stop.

## Policy

| Topic                           | Rule                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verification scope              | Only the given specs. `--siblings` also re-runs tests that import the same POM/plugin you changed                                                                                                                                     |
| Locator writes                  | Only at the definition site of the dead `data-testid` (POM or DSL plugin). Never inline a locator into a spec                                                                                                                         |
| Additive flow                   | Same control, same outcome, one extra step that exists in admin-ff source → apply                                                                                                                                                     |
| Structural flow                 | Screen moved/removed, intent no longer maps, assertion obsolete → interrogate                                                                                                                                                         |
| Missing testid                  | Search admin-ff. If the control must have one: patch admin-ff **uncommitted** per its guidelines. Otherwise interrogate                                                                                                               |
| New testid + remote `ADMIN_URL` | Interrogate: point at local admin-ff, or leave blocked. Do not claim green                                                                                                                                                            |
| Mapping                         | Auto-apply only with **one** high-confidence candidate in the **same feature**. 0 or ≥2 candidates → interrogate                                                                                                                      |
| Non-admin failure               | Classify, report, do not "heal" checkout/API/setup here. Interrogate skip vs abort that spec                                                                                                                                          |
| DSL                             | Do not migrate specs. New locator/method goes in the POM. New DSL action only if the spec already uses `TestingFramework` **and** the action is missing → interrogate, do not invent. **REQUIRED SUB-SKILL:** `dsl-test` in that case |
| Visual                          | Run. Show the diff. Never `--update-snapshots` without an explicit path choice                                                                                                                                                        |
| Pass criteria                   | One green run. Max **3** fix attempts per spec; on the 4th interrogate. Always emit the report below                                                                                                                                  |
| Git                             | No commits. Do not write `.env*`                                                                                                                                                                                                      |

## Interrogation

One question per turn. Two to four numbered paths plus a recommended option. If a structured question tool exists (`AskUserQuestion` or equivalent), use it; otherwise markdown. If three blockers exist, ask the one that unblocks the most specs.

## Procedure

1. Resolve spec files from IDs (`playwright/tests/**/<ID>.spec.ts`) and/or paths/globs. Missing file → interrogate.
2. Resolve admin-ff: given absolute path, else `../admin-ff`. Missing repo → interrogate.
3. **REQUIRED: read** `references/runtime.md`. Bind `ADMIN_URL` / local server.
4. **REQUIRED: read** `docs/flaky-test-patterns.md` before any test or POM edit.
5. **REQUIRED: read** `references/inventory.md`. Build the testid inventory for the whole set. Apply high-confidence remaps **once** at definition sites.
6. For controls that should have a testid and do not: **REQUIRED: read** `references/admin-ff-testid.md` and `admin-ff/.claude/docs/data-testid-guidelines.md` (never copy that file). If `ADMIN_URL` is remote, interrogate before relying on the new id.
7. Run specs **one at a time** (see `references/runtime.md`). Classify each failure with the table below. Fix only admin-ff UI. Re-run that spec. Count attempts.
8. If `--siblings` is on, after the given specs are green (or blocked), list and re-run siblings that import a POM/plugin you changed. Sibling failures → interrogate; do not rewrite sibling specs unless the user chooses that path.
9. Emit the report. Leave admin-ff and e2e working trees uncommitted.

### Failure class

| Observable                                                                                  | Class                | Next                                                    |
| ------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| `getByTestId` / admin POM locator timeout or strict-mode violation                          | locator              | inventory / map / patch testid                          |
| Testid present; extra modal, extra wizard step, extra confirm                               | additive flow        | add the step at the POM method (or existing DSL action) |
| Testid present; navigation/feature/assertion no longer maps to the Zephyr intent            | structural flow      | interrogate                                             |
| `@visual` screenshot mismatch on admin UI                                                   | visual               | show diff; interrogate update / skip / not-admin        |
| Checkout, API, `beforeAll`, processor, auth, merchant config                                | not admin-ff         | interrogate skip vs abort that spec                     |
| Admin-ff source and the running app disagree, or the new UI looks like a product regression | possible product bug | interrogate; do not greenwash                           |
| No class fits                                                                               | unknown              | interrogate                                             |

## Report (required shape)

```
## migrate-admin-to-new-ds

ADMIN_URL: <url> (given | local reused | local started)
admin-ff: <absolute path>
siblings: on | off

| Spec | Result | Attempts | Class | Notes |
|---|---|---|---|---|
| ADM-T471 | green | 2 | locator | `sidebar-menu-strategy` → `sidebar-menu-payment-strategy` in adminHomePage.ts |

e2e diffs: <files>
admin-ff diffs (UNCOMMITTED): <files + proposed testids>
POM blast radius (not re-run unless --siblings): <importers>
Blocked: <spec + reason>
Asked the user: <question → choice>
```

## Red flags

| Excuse                                                | Reality                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| Inline the testid in the spec, faster                 | Definition site only                                                |
| Run the spec first to see the error                   | Inventory the whole set first                                       |
| Update snapshots, it is just the new DS               | Ask; screenshots are a design contract                              |
| Convert this spec to DSL while we are here            | Out of scope                                                        |
| Invent the missing `admin.*` action                   | Ask; `list-actions` / `describe-actions`                            |
| Mutate `.env` so localhost sticks                     | Pass `ADMIN_URL` only to the Playwright process                     |
| Commit admin-ff so CI sees the testid                 | Uncommitted; user opens that PR                                     |
| Stretch the timeout, it is flaky                      | Classify; this skill does not paper over waits                      |
| Fix the checkout step so the spec goes green          | Admin-ff UI only                                                    |
| Copy data-testid guidelines into this skill           | Point at admin-ff's file                                            |
| Kill the Vite server we found on 5173                 | Reuse it; do not kill                                               |
| `--siblings` is off so the shared POM must not change | The POM still changes; you just do not re-run brothers unless asked |

If you catch yourself in that table, stop and follow Policy.
