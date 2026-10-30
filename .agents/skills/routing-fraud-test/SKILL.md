---
name: routing-fraud-test
description: Reference guide for writing E2E tests that involve routing strategies with fraud engines (Cybersource, Sift) and API-based order payments. Use when the test spec mentions routing rules, fraud engines, risk levels, BIN conditions, or paying orders without UI.
---

# Routing + Fraud Engine Test Guide

This skill provides everything needed to write tests involving payment routing strategies combined with fraud engines (Cybersource, Sift, etc.) and API-based payments. Read this **before** exploring the codebase.

---

## 1. Routing Condition Types (What Exists vs What Doesn't)

Supported specific-rule condition types (`RuleConditions` enum in `playwright/support/interfaces/ruleConditions.ts`):

| Condition  | Enum value                 | Notes                                                              |
| ---------- | -------------------------- | ------------------------------------------------------------------ |
| BIN        | `RuleConditions.Bin`       | 6-digit BIN code. Use to approximate Visa/Mastercard brand routing |
| Card Type  | `RuleConditions.CardType`  | `credit_card` or `debit_card` — NOT Visa/Mastercard brand          |
| Bank       | `RuleConditions.Bank`      | Bank name                                                          |
| Store List | `RuleConditions.StoreList` | Store code list                                                    |
| Vertical   | `RuleConditions.Vertical`  | Business vertical                                                  |

> ⚠️ **No "Brand" condition exists** (Visa/Mastercard brand routing is NOT supported by the UI or framework). When a spec says "Condición: Visa", use BIN condition with the first 6 digits of the test card.

---

## 2. Fraud Engine Processor Names (ConnectionsAvailable)

```typescript
// In playwright/support/interfaces/connectionsAvailable.ts
ConnectionsAvailable.cybersourceFraud = 'CYBERSOURCE'; // Cybersource fraud engine
ConnectionsAvailable.sift = 'SIFT'; // Sift fraud engine
ConnectionsAvailable.conekta = 'Conekta';
ConnectionsAvailable.mercadopago = 'MercadoPago';
```

Fraud processor configs (ready to use in `createPaymentProcessor`):

```typescript
import * as processorsConfig from '@support/interfaces/payment_processors';

processorsConfig.cybersourceFraudProcessor; // processor_id: 3, processor_name: 'CYBERSOURCE'
processorsConfig.siftFraudProcessor; // processor_id: 1, processor_name: 'SIFT'
processorsConfig.conektaProcessor; // name: 'conekta_direct', payment_processor_id: 49
processorsConfig.mercadoPagoProcessor; // name: 'mercadopago', payment_processor_id: 39
```

---

## 3. PSP Processor Names for `api.payment.purchaseWithCreditCard`

The `processorName` param must match the `name` field in the processor config:

| PSP         | processorName      |
| ----------- | ------------------ |
| Conekta     | `'conekta_direct'` |
| MercadoPago | `'mercadopago'`    |
| Stripe      | `'stripe'`         |
| Kushki      | `'kushki'`         |

---

## 4. Credit Cards for Fraud Risk Levels

### Cybersource fraud engine

Both cards share BIN `424242` — use this BIN in the routing rule.

```typescript
// HIGH RISK → triggers Cybersource high_risk decision
creditCardData.stripeVisaSuccessfulFraudAprove;
// number: 4242424242424242, cardholder: 'APRO APRO', doc: '1315722768'

// LOW RISK → triggers Cybersource low_risk decision
creditCardData.conektaVisaCardSuccessful;
// number: 4242424242424242, cardholder: 'Dari Boy', doc: '1234569874'
```

### Sift fraud engine

Both cards share BIN `555555` — use this BIN in the routing rule.

```typescript
// HIGH RISK → triggers Sift high_risk (same doc as Cybersource high-risk card)
// No built-in fixture — define inline in the test:
const mastercardHighRisk: BaseCreditCard = {
  number: '5555555555554444',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '1315722768', // Same doc triggers high risk in Sift too
};

// LOW RISK → triggers Sift low_risk
creditCardData.conektaMasterCardSuccessful;
// number: 5555555555554444, cardholder: 'Dari Boy', doc: '1234569874'
```

> **Key insight**: The `document_number: '1315722768'` with cardholder `'APRO APRO'` triggers **high risk** in both Cybersource and Sift. Any standard cardholder data triggers low/medium risk.

---

## 5. DSL Actions for Routing + Fraud Setup

### Complete specific-rule creation flow (with BIN condition):

```
admin.routing.createSpecificRule
admin.routing.firstStepSpecificRule        ← fills name (always 'New rule 2025')
admin.routing.addConditionStepSpecificRule ← clicks "add condition" button
admin.routing.addConditionBin              ← params: { bin: '424242' }
admin.routing.nextStepRouting
admin.routing.selectDefaultFraudEngine     ← params: { fraudEngine: ConnectionsAvailable.cybersourceFraud }
admin.routing.selectRiskToProcess          ← params: { riskLevels: [...] }
admin.routing.saveRule
```

### Risk levels configuration:

```typescript
// "Riesgo alto: Declinar" — do NOT include processor
{ riskLevel: 'high', action: 'decline' }

// "Riesgo medio/bajo: Conekta" — include processor
{ riskLevel: 'low', action: 'process', processor: {
    name: ConnectionsAvailable.conekta,
    validateCvv: false,
    require3ds: false,
    actionForProcessor: 'process',
}}
```

> ⚠️ `selectRiskToProcess` was buggy with `action: 'decline'` (crashed accessing `processor.name` when processor is undefined). Fixed in `adminPaymentStrategyPage.ts` to skip processor selection when `processor` is absent.

---

## 6. `createPaymentProcessor` vs `admin.connections.configureConnection`

> ⚠️ **Do NOT use both.** `apiCallNewman.createPaymentProcessor(...)` in `beforeAll` and `admin.connections.configureConnection` in the test steps do **exactly the same thing** — they register the processor/fraud engine connection. Using both is redundant.
>
> **Rule:** Always configure processors via `createPaymentProcessor` in `beforeAll` (faster, no UI). **Never** add `admin.connections.configureConnection` steps in the test body when `createPaymentProcessor` is already called.

---

## 7. Full Test Template (Routing + Fraud + API Orders)

```typescript
import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';

const configMerchant = new ConfigMerchant();

test.describe('@regression <suite description>', () => {
  test.beforeAll(async () => {
    await configMerchant.basicSetup('MX');
    // createPaymentProcessor already configures the connection — no UI steps needed
    await apiCallNewman.createPaymentProcessor(processorsConfig.conektaProcessor);
    await apiCallNewman.createPaymentProcessor(processorsConfig.mercadoPagoProcessor);
    await apiCallNewman.createPaymentProcessor(processorsConfig.cybersourceFraudProcessor);
    await apiCallNewman.createPaymentProcessor(processorsConfig.siftFraudProcessor);
  });

  test(
    '@TEST-ID <test description>',
    { tag: ['@routing', '@fraud', '@dynamic_routing'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          // 1. LOGIN (no connection steps needed — processors already configured via API in beforeAll)
          { action: 'admin.navigate.goToAdminPage' },
          {
            action: 'admin.navigate.selectMerchant',
            params: { merchantName: process.env.MERCHANT_NAME },
          },

          // 2. ROUTING STRATEGY (Visa + Cybersource, BIN 424242)
          { action: 'admin.navigate.goToRouting' },
          { action: 'admin.routing.createSpecificRule' },
          { action: 'admin.routing.firstStepSpecificRule' },
          { action: 'admin.routing.addConditionStepSpecificRule' },
          { action: 'admin.routing.addConditionBin', params: { bin: '424242' } },
          { action: 'admin.routing.nextStepRouting' },
          {
            action: 'admin.routing.selectDefaultFraudEngine',
            params: { fraudEngine: ConnectionsAvailable.cybersourceFraud },
          },
          {
            action: 'admin.routing.selectRiskToProcess',
            params: {
              riskLevels: [
                { riskLevel: 'high', action: 'decline' },
                {
                  riskLevel: 'medium',
                  action: 'process',
                  processor: {
                    name: ConnectionsAvailable.conekta,
                    validateCvv: false,
                    require3ds: false,
                    actionForProcessor: 'process',
                  },
                },
                {
                  riskLevel: 'low',
                  action: 'process',
                  processor: {
                    name: ConnectionsAvailable.conekta,
                    validateCvv: false,
                    require3ds: false,
                    actionForProcessor: 'process',
                  },
                },
              ],
            },
          },
          { action: 'admin.routing.saveRule' },

          // 3. API ORDERS (sin UI)
          // Orden high risk → expectError: true
          { action: 'setup.order.createOrder', params: { country: 'MX' } },
          {
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: creditCardData.stripeVisaSuccessfulFraudAprove,
              processorName: 'conekta_direct',
              expectError: true,
            },
          },

          // Orden low risk → procesado, verificar en admin
          { action: 'setup.order.createOrder', params: { country: 'MX' } },
          {
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: creditCardData.conektaVisaCardSuccessful,
              processorName: 'conekta_direct',
            },
          },
          { action: 'admin.navigate.goToAdminPage' },
          {
            action: 'admin.navigate.selectMerchant',
            params: { merchantName: process.env.MERCHANT_NAME },
          },
          { action: 'admin.orders.goToOrder' },
          { action: 'admin.orders.assertStatus', params: { status: 'processed' } },
        ],
      });
    }
  );
});
```

---

## 8. Reference Test Files

| Scenario                         | File                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| Cybersource high risk (existing) | `playwright/tests/api_guard/merchant_profile/PI-T1906.spec.ts` |
| Sift high risk (existing)        | `playwright/tests/api_guard/merchant_profile/PI-T1904.spec.ts` |
| BIN routing + API payments       | `playwright/tests/dynamic_routing/PAYM-T2189.spec.ts`          |
| Card type (credit/debit) routing | `playwright/tests/teams/admin/routing/ADM-T658.spec.ts`        |
| Fraud + refund validation        | `playwright/tests/guard/PI-T1830.spec.ts`                      |

---

## 9. Key File Locations

| What                    | Where                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Fraud processor configs | `playwright/support/interfaces/payment_processors/cybersourceFraudProcessor.ts`, `siftFraudProcessor.ts` |
| Credit card fixtures    | `playwright/support/interfaces/credit_cards/`                                                            |
| Routing page object     | `playwright/pages/admin/adminPaymentStrategyPage.ts`                                                     |
| Routing DSL plugin      | `playwright/framework/plugins/admin/admin.routing.ts`                                                    |
| Connections DSL plugin  | `playwright/framework/plugins/admin/admin.connections.ts`                                                |
| Risk option types       | `playwright/support/interfaces/riskOption.ts`                                                            |
| Connections enum        | `playwright/support/interfaces/connectionsAvailable.ts`                                                  |
