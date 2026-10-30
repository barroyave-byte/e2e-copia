# FLAKY_ANALYSIS — Regresión 2026-06-19

Cruce por `testId` estable entre **ejecución inicial** y **retry** (10 shards c/u), commit `dafb7b0` (`fix/flaky-test-global`).
El retry se generó corriendo `--last-failed` sobre los tests que fallaron en la ejecución inicial, sin cambios de código entre ambas corridas.
Flaky = falló en la inicial y **pasó** en el retry.

> Nota: esta corrida reemplaza el análisis anterior (70 flaky, otro set de test IDs) porque los datos de `blob-execution-initial/`/`blob-retry/` corresponden a una ejecución posterior — ya no aparece el cluster de `faker.phone.number()` (createMerchantUserWithoutNetwork/WithNetwork) documentado como RESUELTO antes, lo cual es consistente con que ese fix ya está aplicado en el código actual.

| Métrica | Valor |
|---|---|
| Tests totales (inicial) | 1867 |
| Fallidos en inicial | 321 |
| Fallidos en retry | 260 |
| **Flaky (fail→pass) analizados** | **60** |

## Resumen por cluster de error (firma de la ejecución inicial)

| # | Casos | Firma | Hipótesis de causa raíz |
|---|---|---|---|
| 1 | 8 | `Error: expect(locator).toBeVisible() failed` | Locator de UI (iframe zoid, botón debug, texto de confirmación) no visible en frío bajo carga paralela. Espera de un solo intento. |
| 2 | 8 | `Test timeout of 240000ms exceeded.` | Test superó el timeout global (240s) por encadenamiento de esperas lentas (SDK/iframe que no carga, flujo 3ds/refund/reportes admin) bajo carga concurrente. |
| 3 | 7 | `Error: purchase status is incorrect. Response body:` / `purchase v2 request status` / `purchase status` | Aserción de status de purchase (200 esperado) recibe 422 por decline transitorio del motor de fraude/procesador (DP-6003, DP-7100, DP-8001, etc.), sin reintento del request. |
| 4 | 4 | `Error: expect(received).toBe(expected) // Object.is equality` | Estado leído antes de propagar (status vacío `""` en vez de `pending_3ds`/`unknown`, o `partial_refunding` vs `partial_refunded`). Consistencia eventual del backend, sin retry del fetch. |
| 5 | 4 | `Error: Purchase V2 failed: {...}` / `Error: Purchase failed: {...}` | El helper `purchaseV2`/`purchase` lanza excepción al recibir un decline transitorio (DP-6003/DP-7004/DP-11000) del procesador/fraude, sin reintento interno. |
| 6 | 4 | `Error: Element not visible after N attempts` | `retryOperation` agotó sus intentos; UI no apareció a tiempo bajo carga. |
| 7 | 4 | `Error: Register user and set address failed: Error: Register user failed: [object Object]` | El servicio de registro de usuario (vault/checkout) devuelve error genérico de forma intermitente bajo carga, sin retry. |
| 8 | 3 | `Error: createGateRule failed: {"code":"UNKNOWN_ERROR","description":"This operation conflicted with another operation"...}` | Setup API `createGateRule` en conflicto por operación concurrente (varios tests/shards tocando el mismo gate en paralelo). |
| 9 | 3 | `Error: [ERROR] --> No data found in the Cybersource response` | Dependencia externa (Cybersource, decisión de fraude) no devuelve datos a tiempo de forma transitoria. |
| 10 | 2 | `Error: The input to enter the credit card number is not visible` | Iframe zoid del campo de tarjeta no carga el input a tiempo (SDK en frío bajo carga). |
| 11 | 2 | `Error: refundV2 failed: {"code":"DP-4015","description":"cannot make a full transaction rever..."}` | Al momento del refund, el monto capturado previamente aún no se refleja completo en la orden (consistencia eventual). |
| 12 | 2 | `TimeoutError: page.waitForRequest: Timeout Nms exceeded while waiting for event "request"` | Request de red esperado no se disparó a tiempo (latencia de SDK/backend bajo carga). |
| 13 | 2 | `Error: ...Target page, context or browser has been closed` | Contexto/página cerrada antes de la siguiente acción (carrera entre cierre de popup/iframe y el paso siguiente). |
| 14 | 1 | `Error: Addi landing page is not visible` | Dependencia externa (addi-staging.com) lenta o no disponible momentáneamente. |
| 15 | 1 | `Test timeout of 240000ms exceeded while running "beforeEach" hook.` | Mismo patrón que [2], pero el timeout ocurre en el setup (`beforeEach`). |
| 16 | 1 | `Error: expect(received).toContain(expected) // indexOf` | Mensaje/config esperado todavía no propagado (string vacío recibido). |
| 17 | 1 | `Error: expect(locator).toHaveValue(expected) failed` | Input de configuración admin (`cutoff days`) con valor distinto al esperado — posible dato compartido/mutado por otro test en paralelo, no aislado. |
| 18 | 1 | `Error: expect(locator).toBeAttached() failed` | Fila de tabla de planes de suscripción (dato recién creado) no aparece en el listado a tiempo. |
| 19 | 1 | `Error: expect(received).toBeGreaterThan(expected)` | Umbral de performance del WebSDK (>1500ms) no cumplido por variabilidad de carga del runner de CI, no es un bug funcional. |
| 20 | 1 | `Error: expect(locator).toHaveScreenshot(expected) failed` | Visual diff por timing de render (contenedor aún cargando contenido al tomar el snapshot). |

## Distribución por carpeta

| Carpeta | Casos |
|---|---|
| PSP | 25 |
| teams | 20 |
| visual_tests | 4 |
| APM | 3 |
| settlements | 2 |
| teams/checkout | 2 |
| BNPL | 1 |
| dynamic_routing | 1 |
| wallet | 1 |
| api_guard | 1 |

---
## Detalle por cluster

### [1] Error: expect(locator).toBeVisible() failed

- `PF-T33` — APM/payu_pse/purchase/PF-T33.spec.ts
- `PI-T1728` — APM/payu_oxxo_pay/purchase/PI-T1728.spec.ts
- `ENTP1-T2358` — PSP/mercadopago_wallet/bank_transfer/ENTP1-T2358.spec.ts
- `ENTP1-T2361` — PSP/mercadopago_wallet/bank_transfer/ENTP1-T2361.spec.ts
- `ENTP1-T2568` — teams/vault/auth/ENTP1-T2568.spec.ts
- `ENTP1-T2569` — teams/vault/auth/ENTP1-T2569.spec.ts
- `ENTP1-T2368` — teams/vault/guest/ENTP1-T2368.spec.ts
- `ENTP1-T2466` — visual_tests/teams/checkout/ENTP1-T2466.spec.ts

### [2] Test timeout of 240000ms exceeded.

- `PI-T1955` — PSP/kushki/3ds/deuna-3ds/registered-user/PI-T1955.spec.ts
- `PF-T200` — PSP/niubiz/refund/guest_user/payment_widget/PF-T200.spec.ts
- `ADM-T809` — teams/admin/adhoc_reports/ADM-T809.spec.ts
- `ADM-T518` — teams/admin/payment_link/ADM-T518.spec.ts
- `ENTP1-T2282` — teams/vault/auth/ENTP1-T2282.spec.ts
- `ENTP1-T2291` — teams/vault/auth/ENTP1-T2291.spec.ts
- `ENTP1-T2292` — teams/vault/auth/ENTP1-T2292.spec.ts
- `ENTP1-T2293` — teams/vault/auth/ENTP1-T2293.spec.ts

### [3] Error: purchase status is incorrect / purchase v2 request status / purchase status

- `PI-T1726` — APM/payu_oxxo_pay/purchase/PI-T1726.spec.ts
- `PI-T2119` — PSP/dlocal/purchase_directo/guest_user/vault/PI-T2119.spec.ts
- `PI-T1808` — PSP/fiserv/3ds/PI-T1808.spec.ts
- `PAYM-T2128` — PSP/getnet/msi/purchase/PAYM-T2128.spec.ts
- `PAYM-T2117` — PSP/getnet/refund/PAYM-T2117.spec.ts
- `PI-T1094` — PSP/stripe/authorize/guest_user/vault/PI-T1094.spec.ts
- `PAYM-T2074` — PSP/wompi/mci/purchase/PAYM-T2074.spec.ts

### [4] Error: expect(received).toBe(expected) // Object.is equality

- `PAYM-T2059` — dynamic_routing/3ds/PAYM-T2059.spec.ts
- `PI-T1386` — PSP/kushki/refund/PI-T1386.spec.ts
- `PI-T2169` — teams/bin_detector/PI-T2169.spec.ts
- `PI-T1919` — api_guard/PI-T1919.spec.ts

### [5] Error: Purchase V2 failed / Purchase failed

- `PI-T1300` — PSP/baz/refund/guest_user/payment_widget/PI-T1300.spec.ts
- `PAYM-T2076` — PSP/getnet/purchase_directo/guest_user/payment_widget/PAYM-T2076.spec.ts
- `PAYM-T2077` — PSP/getnet/purchase_directo/guest_user/payment_widget/PAYM-T2077.spec.ts
- `PF-T4` — PSP/payu_oxxo_cash/payconnect-integration/purchase/PF-T4.spec.ts

### [6] Error: Element not visible after N attempts

- `PI-T1957` — PSP/kushki/3ds/deuna-3ds/registered-user/PI-T1957.spec.ts
- `PAYM-T2207` — PSP/kushki/multi-capture/PAYM-T2207.spec.ts
- `PF-T39` — PSP/redsys/3ds/guest_user/purchase/PF-T39.spec.ts
- `ENTP1-T2480` — teams/checkout/payment_widget/ENTP1-T2480.spec.ts

### [7] Error: Register user and set address failed

- `ENTP1-T2339` — teams/vault/auth/ENTP1-T2339.spec.ts
- `ENTP1-T2332` — visual_tests/teams/checkout/ENTP1-T2332.spec.ts
- `ENTP1-T2379` — visual_tests/teams/checkout/ENTP1-T2379.spec.ts
- `ENTP1-T2088` — wallet/paypal_wallet/express_flow/ENTP1-T2088.spec.ts

### [8] Error: createGateRule failed (UNKNOWN_ERROR — operación concurrente)

- `PAYM-T2206` — PSP/kushki/multi-capture/PAYM-T2206.spec.ts
- `PAYM-T2219` — teams/payments/cvv_required_validation/PAYM-T2219.spec.ts
- `PAYM-T2218` — teams/payments/cvv_required_validation/PAYM-T2218.spec.ts

### [9] Error: [ERROR] --> No data found in the Cybersource response

- `PAYM-T2184` — PSP/stripe/incidence/PAYM-T2184.spec.ts
- `PAYM-T2185` — PSP/stripe/incidence/PAYM-T2185.spec.ts
- `PAYM-T2187` — PSP/stripe/incidence/PAYM-T2187.spec.ts

### [10] Error: The input to enter the credit card number is not visible

- `PAYM-T2186` — PSP/stripe/incidence/PAYM-T2186.spec.ts
- `PI-T1390` — PSP/unlimit/payconnect-integration/authorize/PI-T1390.spec.ts

### [11] Error: refundV2 failed (cannot make a full transaction reversal)

- `PI-T1880` — settlements/uatp/authorize/PI-T1880.spec.ts
- `PI-T1942` — settlements/uatp/refundV2/PI-T1942.spec.ts

### [12] TimeoutError: page.waitForRequest

- `ENTP1-T2267` — teams/vault/auth/ENTP1-T2267.spec.ts (15000ms)
- `ENTP1-T2382` — teams/vault/guest/ENTP1-T2382.spec.ts (40000ms)

### [13] Target page, context or browser has been closed

- `ENTP1-T2018` — teams/vault/events/ENTP1-T2018.spec.ts (`locator.fill`)
- `ENTP1-T1986` — teams/vault/guest/ENTP1-T1986.spec.ts (`expect.toBeVisible`)

### [14] Error: Addi landing page is not visible

- `ENTP1-T2478` — BNPL/addi/ENTP1-T2478.spec.ts

### [15] Test timeout of 240000ms exceeded while running "beforeEach" hook.

- `ENTP1-T2353` — teams/vault/guest/ENTP1-T2353.spec.ts

### [16] Error: expect(received).toContain(expected) // indexOf

- `PF-T54` — PSP/prisma/psp_tokenization/PF-T54.spec.ts

### [17] Error: expect(locator).toHaveValue(expected) failed

- `ADM-T731` — teams/admin/connections/ADM-T731.spec.ts

### [18] Error: expect(locator).toBeAttached() failed

- `ADM-T659` — teams/admin/subscriptions_plan/ADM-T659.spec.ts

### [19] Error: expect(received).toBeGreaterThan(expected)

- `ENTP1-T2552` — teams/checkout/websdk/ENTP1-T2552.spec.ts

### [20] Error: expect(locator).toHaveScreenshot(expected) failed

- `ENTP1-T2381` — visual_tests/teams/checkout/ENTP1-T2381.spec.ts
