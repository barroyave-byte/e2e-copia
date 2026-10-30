---
name: dsl-test
description: Create and run tests for playwright using a domain-specific language (DSL) that abstracts away the underlying browser automation. Use when the user needs to write test cases for web applications in a more human-readable format, without needing to know the details of browser automation.
---

# DSL Testing Framework for Playwright

This skill generates Playwright test files using the `TestingFramework` DSL. Instead of writing raw Playwright interactions, tests are composed as a sequence of **actions** — high-level steps registered by framework plugins.

## Architecture Overview

- **TestingFramework** (`playwright/framework/core.ts`): The orchestrator. It registers plugins and runs a list of action steps sequentially, wrapping each in a `test.step()`.
- **Plugins** (`playwright/framework/plugins/**/*.ts`): Each plugin extends `FrameworkPlugin`, sets a `pluginBaseName`, and exposes actions as methods prefixed with `$tf_`. Registration is by convention: `core.ts` walks the prototype, keeps every `$tf_` method, strips the prefix and registers it as `${pluginBaseName}.${methodName}`. There is no manual registry to update.
- **Actions**: Identified by a dotted name like `plugin.actionName` (e.g., `checkout.paymentWidget.fillCreditCardData`). Each action optionally receives a `params` object.
- **Descriptions**: Each action carries a JSDoc `@description` tag, which is what the catalog shows and what an editor shows on hover. Every new action must have one:
  ```typescript
  /** @description Fills the credit card data in the payment widget. */
  async $tf_fillCreditCardData(params: FillCreditCardParams) { ... }
  ```
  Implementation prose can sit above the tag in the same JSDoc block; the tag stays the catalog text.
- **Generated types** (`playwright/framework/generated/actions.ts`): `ActionStep` is a discriminated union of every registered action, generated from the plugins. `run()` takes `ActionStep[]`, so a wrong action name, a misspelled parameter or a wrong parameter type is a compile error. **After adding or changing any action, run `npm run generate-action-types`** — CI fails if the committed file is stale. Never edit the generated file by hand.

## How to Write a Test

### Step 1: Discover Available Actions

Run the following command to list all registered actions and their descriptions:

```bash
npm run list-actions
```

### Step 2: Get Parameter Details for Specific Actions

Once you know which actions to use, get their parameter signatures:

```bash
npm run describe-actions <action1> <action2> ...
```

Example:

```bash
npm run describe-actions checkout.openCheckout checkout.paymentWidget.fillCreditCardData
```

### Step 3: Write the Test File

Use this template:

```typescript
import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

// Import any data fixtures needed for params (e.g., credit cards, processors)
import * as creditCardData from '@support/interfaces/credit_cards';

test.describe('Test suite description', () => {
  // Optional: setup hooks for merchant config, tokenization, etc.
  // test.beforeAll(async ({ emaService }) => { ... });

  test('@TEST-ID Test case description', { tag: ['@smoke', '@relevant_tag'] }, async ({ page }) => {
    const testing = new TestingFramework({ page, test });

    await testing.run({
      step: [
        { action: 'admin.goToAdminPage' },
        {
          action: 'checkout.openCheckout',
          params: { experienceType: 'Payment Widget' },
        },
        {
          action: 'checkout.paymentWidget.fillCreditCardData',
          params: { creditCardData: creditCardData.kushkiMasterCardExitosa },
        },
        {
          action: 'admin.order.goToOrderAndAssertStatus',
          params: { status: 'processed' },
        },
      ],
    });
  });
});
```

### Test File Structure Rules

1. **Always** import `test` from `@support/fixtures` (never from `@playwright/test` directly).
2. **Always** import `TestingFramework` from `playwright/framework/core`.
3. Each step in the `step` array is an object with:
   - `action` (required): The dotted action name (e.g., `checkout.paymentWidget.fillCreditCardData`).
   - `params` (optional): An object matching the action method's parameter interface. Use `npm run describe-actions` to discover the exact shape.
   - `stepName` (optional): A human-readable label for the test step. If omitted, the action name is used.
   - `saveAs` (optional): Stores this action's return value under that name for later steps.
4. Test files go in `playwright/tests/` following the existing directory conventions.
5. The test ID in the test name (e.g., `@PI-T1195`) should match the file name (e.g., `PI-T1195.spec.ts`).

### Passing Data Between Steps

Use `saveAs` to publish a step's return value and `ref()` to consume it. This replaces reading
values out of `process.env`, and makes the dependency visible in the spec:

```typescript
import { TestingFramework, ref } from 'playwright/framework/core';

step: [
  { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
  {
    action: 'setup.processor.createProcessor',
    params: { processorConfig: processorsConfig.stripeProcessor },
    saveAs: 'processorId',
  },
  { action: 'setup.order.createOrder', params: { country: 'MX' }, saveAs: 'order' },
  {
    action: 'admin.orders.goToOrder',
    params: { orderToken: ref('order').at('data.token') },
  },
  { action: 'setup.processor.deleteProcessor', params: { processorId: ref('processorId') } },
];
```

`ref('name')` reads the whole saved value; `ref('name').at('a.b')` reads a path into it. A
missing name fails with the list of values that were saved.

### Cleaning Up What the Test Created

`cleanup` steps always run once `step` finishes, pass or fail:

```typescript
await testing.run({
  step: [
    /* ... */
  ],
  cleanup: [
    { action: 'setup.processor.deleteProcessor', params: { processorId: ref('processorId') } },
  ],
});
```

Every cleanup entry is attempted even if an earlier one fails, and a cleanup failure never
replaces the failure from `step` — it is reported as a failed step and logged, but the test
keeps the verdict it earned. If an operation must be enforced, put it in `step`, not `cleanup`.

### Reusable Flows

A sequence shared by several specs goes in a class exposing `flowSteps(): FlowSteps`:

```typescript
import { FlowSteps } from 'playwright/framework/core';

export class MyFlow {
  flowSteps(): FlowSteps {
    return [{ action: 'checkout.openCheckout', params: { experienceType: 'Payment Widget' } }];
  }
}

// in the spec
step: [{ action: 'analytics.events.startCapture' }, ...flow.flowSteps()];
```

**Always annotate the return type with `FlowSteps`.** Without it the flow still compiles, but
only via `as const`, and mistakes are then reported in whichever spec spreads the flow instead
of in the flow file itself.

### Provisioning Without a Hand-Written `beforeAll`

Prefer `setup.*` actions over imperative setup, so the whole test is expressible as steps:

| Need                        | Action                                                           |
| --------------------------- | ---------------------------------------------------------------- |
| Merchant                    | `setup.merchant.basicSetup` / `setup.merchant.configureCheckout` |
| Payment processor           | `setup.processor.createProcessor` / `deleteProcessor`            |
| Order                       | `setup.order.createOrder` / `tokenizeOrder`                      |
| Registered shopper          | `setup.user.register`                                            |
| Saved card for that shopper | `setup.user.saveCreditCard`                                      |
| Authenticated session       | `setup.user.login`                                               |
| Vault widget config         | `setup.checkout.configureVaultWidget`                            |
| V2 checkout config          | `setup.checkout.configureV2`                                     |

These actions **publish implicitly**: after them, later actions resolve `merchantId`,
`privateKey`, `publicKey`, `merchantToken`, `orderToken`, `orderId`, `userEmail` and
`userToken` on their own, so those parameters can be omitted. `setup.user.login` in
particular makes a following `checkout.openCheckout` start authenticated instead of as a
guest. Pass values explicitly when the test uses more than one merchant, order or shopper, or
when you want the dependency to be obvious in the spec.

Use a hand-written `beforeAll` only for setup that has no `setup.*` action yet.

### Key Constraints

- **Never guess action names.** Always run `npm run list-actions` first to discover what is available.
- **Never guess parameter shapes.** Always run `npm run describe-actions <action>` to get the exact interface.
- If the actions needed for a test do not exist yet, inform the user — do not invent fake actions.
- The framework validates all actions before execution and throws if any are unregistered.
- **Verify with `npm run typecheck` before considering a test done.** Steps are typechecked against the generated `ActionStep` union, so a hallucinated action or parameter is caught there instead of failing mid-run after the expensive `beforeAll` setup.

### Element Selector Priority

When creating new functionality (actions, plugins, or helpers), **always** follow this priority order for selecting elements:

1. **`data-testid`** (preferred): Use `page.getByTestId('...')` whenever a `data-testid` attribute is available on the element.
2. **`name` attribute** (fallback): If no `data-testid` exists, use `page.locator('[name="..."]')` or equivalent selectors targeting the `name` attribute.
3. **Text content** (last resort): If neither `data-testid` nor `name` is available, select by visible text using `page.getByText('...')` or `page.getByRole('...', { name: '...' })`. When using text-based selectors, **always** add a `// TODO: Add data-testid in the UI and migrate this selector` comment above the line so the UI team knows to add a proper `data-testid`.

### Test Data Fixtures

Test data (credit cards, processors, user info, etc.) lives in `playwright/support/interfaces/`. Each subdirectory exports pre-built data objects ready to use as action params. Key directories:

- `credit_cards/` — Credit card fixtures (e.g., `kushkiMasterCardExitosa`, `stripVisaExitosa`). Import: `import * as creditCardData from '@support/interfaces/credit_cards'`
- `debit_cards/` — Debit card fixtures.
- `payment_processors/` — Processor configurations per country (e.g., `kushkiProcessorPE`). Import: `import * as processorsConfig from '@support/interfaces/payment_processors'`
- `user_data/` — Test user profiles.
- `address_user/` — User address data.
- `billing/` — Billing information.
- `orders/` — Order-related data.
- `capture/`, `refund/`, `void/` — Data for post-payment operations.
- `installments/` — Installment plan validation data.
- `campaigns/` — Campaign/promotion data.
- `user_device/` — Device info fixtures.

Browse these directories to find the right fixture for the action params you need. Each has an `index.ts` that re-exports all available fixtures.

### Existing Test Reference

For context on how tests are structured in this project, look at existing spec files under `playwright/tests/` (e.g., `playwright/tests/PSP/kushki/purchase_directo/guest_user/payment_widget/PI-T1195.spec.ts`).
