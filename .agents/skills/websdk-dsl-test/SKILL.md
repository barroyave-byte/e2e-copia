---
name: websdk-dsl-test
description: Create E2E tests for the DEUNA WebSDK with the TestingFramework DSL and Harness App. Use when writing tests that init the WebSDK and open one of its widgets (Payment Widget or Elements) inside the Zoid iframe.
---

# WebSDK E2E Testing with DSL

WebSDK tests run on the **Harness App** (CDN web app exposing `window.initWebSDK`, `initPaymentWidget`, `initElements`). It currently supports two widgets: **Payment Widget** and **Elements**. These are normal `TestingFramework` DSL tests — this skill only covers the WebSDK-specific parts. For DSL basics, also follow the `dsl-test` skill.

## Rules

1. **First step is always `checkout.websdk.goToHarness`.**
2. **Order is fixed:** `goToHarness` → `init` → `openPaymentWidget` / `openElements`.
3. After opening a widget the UI lives inside the Zoid iframe (`d_una_checkout`). Drive it with the matching action family (e.g. `checkout.paymentWidget.*`, `checkout.vault.*`); their POMs already target the iframe.
4. **No raw Playwright** in specs. **Never guess actions/params** — run `npm run list-actions` and `npm run describe-actions <action>` first.

## WebSDK actions (`checkout.websdk`)

| Action                                                                   | Purpose                             | Key params                               |
| ------------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------- |
| `goToHarness`                                                            | Open the Harness App (first step).  | `version?`                               |
| `init`                                                                   | Initialize SDK with merchant key.   | `publicApiKey`                           |
| `openPaymentWidget`                                                      | Launch the Payment Widget.          | `orderToken`, `language`, …              |
| `openElements`                                                           | Launch the Elements widget.         | `orderToken`, `userToken`, `behavior`, … |
| `assertPaymentWidgetProcessorTitle` / `assertPaymentVaultProcessorTitle` | Assert the widget title is visible. | —                                        |

`WebSDKWidgetConfig` accepts `mode`, `target`, `domain`, `language`, `userToken`, `orderToken`, `styleFile`, `hidePayButton`, `fraudCredentials`, `callbacks`, plus widget-specific extra keys.

## API setup (in hooks, NOT as DSL steps)

Prepare data via API before the UI runs, e.g.: `configMerchant.basicSetup(...)` · `apiCallNewman.createPaymentProcessor(...)` · `emaService.tokenizeDeunaNowOrder(...)` → `tokenizeOrder.getOrderToken()`. Credentials for steps: `saveConfig.getPublicKey()` (→ `publicApiKey`), `tokenizeOrder.getOrderToken()` (→ `orderToken`). Add widget-specific setup as needed (e.g. authenticated user, widget config).

## Template

```typescript
import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

test.describe('@regression WebSDK: <flow>', { tag: ['@checkout', '@deuna-web-sdk'] }, () => {
  // The spec owns its merchant and its order. There is no global to fall back on:
  // `saveConfig` and `tokenizeOrder` were deleted precisely because specs sharing a
  // worker overwrote each other's values.
  let publicApiKey: string;
  let orderToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    publicApiKey = merchant.publicKey;
    // createPaymentProcessor, etc.
    orderToken = (await emaService.tokenizeDeunaNowOrder('MX', merchant.privateKey)).data.token;
  });

  test('@TEST-ID <description>', { tag: ['@team_enterprise'] }, async ({ page }) => {
    const testing = new TestingFramework({ page, test });

    await testing.run({
      step: [
        { action: 'checkout.websdk.goToHarness', stepName: 'Go to harness app' },
        { action: 'checkout.websdk.init', params: { publicApiKey }, stepName: 'Initialize WebSDK' },
        // Open ONE widget: openPaymentWidget OR openElements
        {
          action: 'checkout.websdk.openPaymentWidget',
          params: { orderToken },
          stepName: 'Open Payment Widget',
        },
        // UI now inside the iframe → continue with the matching action family
        // { action: 'checkout.paymentWidget.<...>', params: { ... } },
      ],
    });
  });
});
```

## Conventions

- Filename = test ID: `@ENTP1-T2583` → `ENTP1-T2583.spec.ts`. WebSDK tests live under `playwright/tests/teams/<domain>/...`.
- Tags: `@deuna-web-sdk` + domain + team tag.
- Import `test` from `@support/fixtures`, `TestingFramework` from `playwright/framework/core`.
- Harness defaults to STG; pass `version` to `goToHarness` only to pin a build.

## Reference

- Example (Elements/Vault flow): `playwright/tests/teams/vault/auth/ENTP1-T2583.spec.ts`
- Plugin/POM/client: `playwright/framework/plugins/checkout/checkout.websdk.ts`, `playwright/pages/checkout/websdk/harness.ts`, `playwright/support/clients/checkout/websdk/index.ts`
