---
name: migration-postman-axios
description: >
  Migrates Postman/Newman collection calls in Playwright E2E tests to native Axios-based HTTP
  service calls. Use this skill whenever the user wants to: migrate a Postman collection to Axios,
  replace Newman/Postman collection calls with service functions, or says "migrate collection [name]",
  "migrate postman [name]", "convert collection to axios", or "replace newman call". Also trigger
  when the user points at a test file that still calls `callPostmanCollection`, `runNewman`, or
  `CollectionPostmanUrl`, and asks to modernize or migrate it.
---

# Migration: Postman Collection → Axios HTTP Service

You are migrating one or more Postman/Newman collection calls in a Playwright TypeScript E2E
framework to native Axios-based service calls. The goal is to eliminate dependency on the Newman
runtime while preserving the exact behaviour each test expects.

## Quick Start — Continuing an Existing Migration

Before anything else, check if there is an active migration in progress:

```
docs/migration-progress.md   ← current status, pending batches, notes
migration-manifest.json       ← full collection inventory (auto-generated)
```

If those files exist, **read `docs/migration-progress.md` first** and resume from where it left off.
Skip Phase 0 (analysis) unless new collections have been added to `postman-exports/`.

---

## Input

The user provides either:

- A **path to a local Postman collection `.json` file** for a single-collection migration, OR
- A request to **continue the batch migration** (refer to `docs/migration-progress.md`)

If no file path or context is given, ask:

> "Please provide the path to the exported Postman collection JSON file, or say 'continue' to resume the batch migration from docs/migration-progress.md."

---

## Architecture Quick Reference

| Path                                                | Role                                                       |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `playwright/support/http/config/EndpointConfig.ts`  | Central endpoint registry                                  |
| `playwright/support/http/services/`                 | Service classes (Axios calls)                              |
| `playwright/support/http/services/index.ts`         | Barrel export for services                                 |
| `playwright/support/http/types/ServiceTypes.ts`     | `SERVICE_KEYS` + `ServiceTypeMap`                          |
| `playwright/support/http/models/`                   | TypeScript request/response interfaces                     |
| `playwright/support/http/testData/`                 | Builders and defaults for test data                        |
| `playwright/support/http/README.md`                 | Full architecture guide (read when creating a new service) |
| `playwright/support/fixtures/services.ts`           | Playwright fixture registrations for services              |
| `playwright/support/newman/collectionUrlPostman.ts` | `CollectionPostmanUrl` static members                      |
| `playwright/support/newman/apiCallNewman.ts`        | Newman runner helpers                                      |
| `tools/postman-analyzer.js`                         | Analysis script → generates `migration-manifest.json`      |
| `postman-exports/`                                  | Exported Postman collection JSON files                     |

### Service → Endpoint domain mapping

| Service key              | Domain / base path                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `PAYMENT`                | `/payments/`, `/merchants/transactions/`, `/v2/merchants/orders/`, `/transactions/` |
| `EMA`                    | `/merchants/orders` (tokenize / get order)                                          |
| `USER_AUTH`              | `/users/`, `/v2/merchants/users`                                                    |
| `CHECKOUT_CONFIGURATION` | `/checkout-config/`, `/merchants/checkout/`                                         |
| `PAYMENT_MSI`            | `/merchants/{id}/installments/`                                                     |
| `PAYMENT_ROUTING`        | `/routing/merchants/`, `/merchants/{id}/stores-config`                              |

---

## Phase 0 — Analyze Collections (one-time setup)

Run once when starting the migration or when new collections are added:

```bash
node tools/postman-analyzer.js
```

This reads every `.json` in `postman-exports/`, matches them to `CollectionPostmanUrl` constants,
classifies complexity, maps to the target service, and writes `migration-manifest.json`.

**Complexity classification:**

- 🟢 **simple** — 1–2 requests, no pre-request scripts, no chained globals
- 🟡 **medium** — 2–4 requests OR has pre-request scripts, OR returns globals used by callers
- 🔴 **complex** — 4+ requests, chained globals across requests, or highly dynamic scripts

**Migration order:** always 🟢 → 🟡 → 🔴. Within 🟡, sub-group by impact (0 test files first).

---

## Phase 1 — Batch-Interactive Workflow

### Why batch-interactive

Processing one collection at a time generates excessive context. Instead:

1. **Group** related collections (same service, same impact level, zero test files first)
2. **Propose** the full batch as a table — show every file change before touching anything
3. **Get approval** from the user
4. **Execute** all changes in the batch at once (parallel tool calls where possible)
5. **Validate** with `npx tsc --noEmit` after each batch
6. **Update** `docs/migration-progress.md` to mark the batch as done

### Batch proposal format

Present each batch as a table like this before writing any code:

```
## Batch: <name> — <N> collections, <M> files affected

| Collection constant | Migrated function / file | Change summary |
|---|---|---|
| CONFIG_CAMPAIGN_MSI | apiCallNewman.createCampaignMSI() | runNewman → paymentMsiService.configCampaign() |
| REQUEST_OTP_EMAIL | ENTP1-T2021.spec.ts line 51 | callPostmanCollection → userAuthService.requestOtpCode(email) |

New service methods needed:
- PaymentMsiService.configCampaign(merchantId, token, currency, type)

New endpoints:
- userAuth.requestOtpCode: '/users/request-code'
```

Only proceed after the user confirms ("si", "confirm", "ok", etc.).

### Sub-agent dispatch (for large batches)

When `migration-manifest.json` shows `suggest_sub_agents: true` for a collection (≥5 parallelizable
files), split the work into two tracks after infrastructure is done:

**Track A — Infrastructure (main agent, sequential):**

1. Add endpoint(s) to `EndpointConfig.ts`
2. Add service method(s) to the relevant service file
3. Run `npx tsc --noEmit` — fix any errors before continuing
4. Only after Track A is clean, dispatch Track B

**Track B — File replacements (sub-agents, parallel worktrees):**

- Each sub-agent gets the files listed in `recipe.parallelizable_files`
- Launch with `isolation: "worktree"` and `run_in_background: true`
- Provide each agent a self-contained prompt that includes:
  - The exact service method signature already created in Track A
  - The list of files to migrate
  - Import cleanup rules (remove `CollectionPostmanUrl`, `runNewman`, etc.)
  - The fixture injection pattern (never `new MyService()`)

**Example sub-agent prompt template:**

```
Migrate the following files from Newman to Axios. The infrastructure is already done:

Service method available: `paymentService.simulateWorldpayWebhook(orderToken, processorName, merchantId, externalTxId, paymentStatus)`
Fixture key: `paymentService` (from `@support/fixtures`)

For each file listed below:
1. Replace `callPostmanCollection(CollectionPostmanUrl.UPDATE_PROCESSING_TRANSACTIONS, [...])` with the service call
2. Remove unused imports (CollectionPostmanUrl if no other constants remain, runNewman)
3. Inject the fixture: `test.beforeAll(async ({ paymentService }) => { ... })`

Files:
- playwright/tests/PSP/worldpay/webhook/payconnect-integration/PF-T171.spec.ts
- playwright/tests/PSP/worldpay/webhook/payconnect-integration/PF-T98.spec.ts
[...]
```

**Shared-file rule:** Files in `apiCallNewman.ts` or service files are **never** parallelizable —
always handle those in the main agent before dispatching sub-agents.

**Reconciliation:** After sub-agents complete, the main agent runs `npx tsc --noEmit` once over all
changed files to catch any cross-file issues.

---

## Step 1 — Load the Collection from the Local JSON File

1. Read the `.json` file using the `Read` tool (or from `migration-manifest.json` if already analyzed).
2. For every request, record:
   - HTTP method, full URL (path parameters, query params)
   - Auth scheme (Bearer token, API-Key header, none)
   - **Request body** — parse `body.raw` completely (see "Body Mapping Rules" below)
   - **Pre-request scripts** (`event[].listen === "prerequest"`) → extract default variable values → become testData constants or method defaults
   - **Post-request scripts** (`event[].listen === "test"`) → classify every `pm.test()` and `pm.globals/collectionVariables.set()` call (see "Post-request Script Translation" below)

If the collection has folders, note which folder each request lives in.

---

## Body Mapping Rules

When the collection has a `body.raw` field, parse it in full — do **not** skip fields that look static or unimportant. Every field in the original body must appear in the Axios call.

### Variable substitution

| Postman token                            | TypeScript equivalent                                               |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `{{variable_name}}`                      | Method parameter (e.g. `orderToken`, `merchantId`)                  |
| `{{merchant_private_key}}`               | The spec's own `privateKey` from `basicSetup()` — pass as parameter |
| `{{$randomUUID}}`                        | `faker.string.uuid()` (import `{ faker } from '@faker-js/faker'`)   |
| `{{$randomInt}}`                         | `faker.number.int()`                                                |
| Hardcoded literal (string, number, bool) | Keep as-is in the body object                                       |

### Where the body lives

- **Small / simple body** (≤5 fields, no nesting) → define inline inside the service method call.
- **Medium body** (nested objects, 5–15 fields) → accept a typed parameter `body: MyRequest` in the service method; the caller constructs it.
- **Large body** (addresses, items arrays, >15 fields) → create a builder in `testData/myService/MyBuilder.ts` that returns the complete body with sensible defaults; expose override options as optional params.

### Comments in raw JSON

Postman bodies sometimes contain JS-style comments (`// note`). Strip them when constructing the TypeScript body — they are documentation, not data.

### Example

Collection `body.raw`:

```json
{
  "order": {
    "order_id": "{{$randomUUID}}",
    "store_code": "all",
    "currency": "BRL",
    "total_amount": 13000,
    "shipping_address": {
      "first_name": "Pablo",
      "identity_document": "58188896454",
      "country_code": "BRA"
    }
  }
}
```

Service method body (medium size → typed parameter):

```typescript
async updateOrder(
  privateKey: string,
  orderToken: string,
  body: UpdateOrderRequest
): Promise<ApiResponse<UpdateOrderResponse>> { ... }
```

Caller in test/beforeAll:

```typescript
await emaService.updateOrder(privateKey, orderToken, {
  order: {
    order_id: faker.string.uuid(),
    store_code: 'all',
    currency: 'BRL',
    total_amount: 13000,
    shipping_address: {
      first_name: 'Pablo',
      identity_document: '58188896454',
      country_code: 'BRA',
    },
  },
});
```

---

## Post-request Script Translation

Every `event` entry with `listen: "test"` must be read and translated. Never silently drop these scripts — they encode expected behaviour the test depends on.

### Classification and placement

| Postman pattern                                                              | Meaning                           | Where to put it                                                                |
| ---------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `pm.response.to.have.status(N)`                                              | Status code assertion             | **Service method** — validates the call itself succeeded                       |
| `pm.expect(jsonData.field).to.exist` / `.to.not.be.undefined`                | Field presence check              | **Service method** — structural health of the response                         |
| `pm.expect(a).to.equal(b)` where `b` is a dynamic variable                   | Business equality assertion       | **Test file** (`expect(response.data.a).toBe(expected)`)                       |
| `pm.globals.set("key", value)` or `pm.collectionVariables.set("key", value)` | Passes a value to a later request | Capture as a local `const` in `beforeAll` and pass explicitly to the next call |

**Decision rule:** if the assertion checks that the API _responded structurally correctly_ → service method. If it checks _test-specific business logic_ (values that differ per test case) → test file.

### Translation table

```
// Postman
pm.test("status code 200", () => pm.response.to.have.status(200));

// TypeScript (inside service method, after the httpClient.request call)
expect(response.status).toBe(200);
```

```
// Postman
pm.test("token exists", () => {
  pm.expect(pm.response.json().token).to.exist;
  pm.globals.set("order_token", pm.response.json().token);
  pm.globals.set("order_id",    pm.response.json().order.order_id);
});

// TypeScript — structural assertions in service method
expect(response.data.token).toBeDefined();

// TypeScript — globals become return values; caller captures them
const { token, order } = response.data;
orderToken = token;
orderId    = order.order_id;
```

```
// Postman
pm.test("order_id was modified", () => {
  pm.expect(jsonData.order.order_id).to.equal(pm.collectionVariables.get("order_id_modified"));
});

// TypeScript — business assertion stays in test file
expect(response.data.order.order_id).toBe(expectedOrderId);
```

### Multi-request chains

When request B uses a value set by request A via `pm.collectionVariables.set`, both calls become separate service method calls. The value flows as a local variable:

```typescript
// beforeAll
const tokenizeResponse = await emaService.tokenizeOrder(privateKey, body);
const orderToken = tokenizeResponse.data.token;           // was pm.collectionVariables.set("order_token", ...)
const orderIdModified = `${tokenizeResponse.data.order.order_id}_modified`;

const updateResponse = await emaService.updateOrder(privateKey, orderToken, {
  order: { token: orderToken, order_id: orderIdModified, ... }
});
expect(updateResponse.data.order.order_id).toBe(orderIdModified);  // business assertion → test or beforeAll
```

---

## Step 2 — Check / Create Endpoint in `EndpointConfig.ts`

Read `playwright/support/http/config/EndpointConfig.ts`.

- If the endpoint already exists → proceed.
- If not, add it:

```typescript
myService: {
  doSomething: '/path/to/resource/{resourceId}',
},
```

Use `{paramName}` syntax for path parameters.

> **Note:** A linter in this project may remove endpoints that don't match its expected format.
> After editing EndpointConfig.ts, run `npx tsc --noEmit` immediately to catch issues.

---

## Step 3 — Check / Create Service + Register It

### 3a. Check existing services

Read the relevant service file. A service match means same base domain + auth pattern.

### 3b. Create the service method (or new service if none exists)

New method pattern:

```typescript
async doSomething(
  param: string,
  body: MyRequest,
  expectError = false
): Promise<ApiResponse<MyResponse>> {
  try {
    const response = await this.httpClient.request<MyResponse>({
      url: EndpointConfig.getEndpoint('myService', 'doSomething'),
      method: 'POST',
      data: body,
      auth: { type: 'bearer', token: param },
      expectError,
    });
    return response;
  } catch (error) {
    throw new Error(`doSomething failed: ${JSON.stringify(error)}`);
  }
}
```

Auth types: `{ type: 'bearer', token }` | `{ type: 'api-key', apiKey }` | omit for public endpoints.

### 3c. If creating a brand-new service, follow the full checklist in `README.md`:

1. Models → `models/myService.ts`
2. Service key → `SERVICE_KEYS` + `ServiceTypeMap` in `types/ServiceTypes.ts`
3. TestData (if body is non-trivial) → `testData/myService/`
4. Service class → `services/MyService.ts` with `@RegisterService` decorator
5. Barrel export → `services/index.ts`
6. Fixture → `fixtures/services.ts`

---

## Step 4 — Find All References to the Collection

```
Grep pattern: CollectionPostmanUrl\.MY_COLLECTION
glob: **/*.ts
```

Classify each hit:

- **Intermediate function** in `apiCallNewman.ts` → migrate the function body, callers stay unchanged
- **Direct test** (`.spec.ts`) → migrate in place
- **Intermediate class** (helper / shared class) → migrate the class method

---

## Step 5 — Migrate Each Reference

### 5a. Read and understand the file

- What variables does it pass?
- Which folder does it target within the collection?
- Does it capture the return value (token, id, email, rules)?

### 5b. Replace the Newman call

**Before:**

```typescript
await runNewman({
  collection: CollectionPostmanUrl.MY_COLLECTION,
  setPostmanGlobalVars: [{ key: 'user_email', value: email }],
});
```

**After:**

```typescript
await myService.doSomething(merchantToken, { email });
```

Rules:

- Newman global vars → map to service method parameters or body fields
- Pre-request defaults → use testData builder defaults or inline them
- **Post-request scripts** → follow the "Post-request Script Translation" section above (structural checks in service method, business assertions in test, globals become local variables)
- **Request body** → follow the "Body Mapping Rules" section above (map ALL fields, no omissions)
- Folder-specific calls → separate service method per folder
- N sequential requests → N service method calls in sequence, values flow as local variables not globals

### 5c. Fix fixture injection in test files

Services come from Playwright fixtures, never instantiated directly:

```typescript
// In beforeAll:
test.beforeAll(async ({ myService, emaService }) => {
  await myService.doSomething(...);
});

// If needed in test body:
test('...', async ({ page, myService }) => { ... });
```

Never write `new MyService(...)` in a test file.

### 5d. Preserve existing generic helpers

- `configMerchant.basicSetup('MX')` — keep as-is, destructure `{ merchantId, merchantToken, privateKey, publicKey }`
- `saveConfig.getPrivateKey()` / `saveConfig.getMerchantToken()` — **gone.** Those globals were
  shared across every spec in the worker; pass the value from `basicSetup()` instead
- `emaService.tokenizeDeunaNowOrder(country)` — keep if already migrated
- `apiCallNewman.createPaymentProcessor(...)` — keep (not yet migrated)

### 5e. Clean up imports

- Remove `CollectionPostmanUrl` import if no constants from it remain in the file
- Remove `runNewman` import if no longer called
- Remove `TokenizeOrder` import + instance if no longer used
- Remove any `SaveConfig` import: the merchant globals it read no longer exist
- Keep `apiCallNewman` import if other functions from it are still used

---

## Step 6 — Validate

After every batch:

```bash
npx tsc --noEmit
```

Fix all errors before proceeding to the next batch. Common errors:

- Type mismatch on response data → cast with `(response.data as any)`
- Missing property on typed response → the API returns more fields than typed; cast or extend the interface
- `staging` conditional still importing unused Newman → remove the `if (staging)` branch entirely

---

## Step 7 — Update Progress Tracker

After each batch, update `docs/migration-progress.md`:

- Mark the batch as ✅ done
- Update the "Next batch" section
- Note any special patterns discovered

---

## Step 8 — Output

```
Migrated: apiCallNewman.ts (createCampaignMSI, createCampaignMSIwithError) | ENTP1-T2000.spec.ts | ADM-T690.spec.ts
```

If any file was skipped, list it with the reason.

---

## Known Patterns From This Migration

| Pattern                                                                           | How to handle                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokenizeOrder.execTokenizeOrder(TOKENIZE_ORDER_DEUNANOW*)`                       | Replace with `emaService.tokenizeDeunaNowOrder(country, privateKey?, options?)`                                                                                                |
| `tokenizeOrder.execTokenizeOrder(TOKENIZE_ORDER_PAYMENT_LINK*)`                   | Replace with `emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody()` + `DeunaPaymentLinkOrderBuilder.createBody({...})`                                                     |
| `callPostmanCollection(REGISTER_USER_AND_SET_ADDRESS, ...)`                       | Replace with `userAuthService.registerUserAndSetAddress(...)` — high impact (111 files), handle as separate batch                                                              |
| `runNewman(PAYM_T1426/T1428)` in `configDynamicRouting()`                         | 1× `paymentService.configurationMerchantPayments(USE_DYNAMIC_ROUTING ENABLED)` + N× `paymentRoutingService.createMerchantRule(...)` with hardcoded bodies from collection JSON |
| Return value from Newman globals (`data.values.find(v => v.key === 'foo').value`) | Return `response.data.foo` from the Axios call directly                                                                                                                        |
| `if (envConfig.NODE_ENV === 'staging') { runNewman(...) } else { serviceCall }`   | Remove the `if` block entirely, keep only the service call                                                                                                                     |
| `const result = new TokenizeOrder()` on line 1 before imports                     | Remove the entire line — it's a leftover artifact                                                                                                                              |
| Collection with XML body (e.g., Worldpay webhook)                                 | Build body string explicitly in the service method using template literals                                                                                                     |
| `responseNewman.values.reference.configuration_data.value`                        | Return `response.data as any` from the equivalent service method                                                                                                               |

---

## Common Pitfalls

| Pitfall                                                            | Fix                                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Race condition from pre-request defaults                           | Initialize defaults once in `beforeAll`, not inside each test               |
| `globalAssert` still used in test body                             | Keep its import even if you remove Newman calls                             |
| Collection called with folder name → multiple requests             | Implement all requests in that folder as separate service calls             |
| Response data stored in `process.env` by Newman                    | After migration, pass values explicitly between steps using local variables |
| New endpoint added to EndpointConfig.ts silently removed by linter | Verify with `tsc --noEmit` right after each EndpointConfig edit             |
