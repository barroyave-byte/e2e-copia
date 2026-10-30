# Plan de migración: Playwright legacy (Page Objects) → DSL (`TestingFramework`)

> Snapshot del repo: **2026-09-08**, branch `flaky/vourcher`. Todos los conteos de este documento
> son un punto en el tiempo — la IA ejecutora **debe re-correr los `grep`/`find` de la sección 2
> al iniciar cada ola** antes de fijar el alcance de esa ola, porque el repo sigue moviéndose.

## 0. TL;DR

| Métrica                                                            | Valor                                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Spec files totales                                                 | 1871                                                                    |
| Ya en DSL (`TestingFramework`)                                     | 31 (0 son migraciones — todos son tests nuevos escritos directo en DSL) |
| **Alcance real de esta migración** (UI legacy con `@pages/*`)      | **1005**                                                                |
| Fuera de alcance: tests 100% API (sin UI)                          | 835 (otra iniciativa, ver §1)                                           |
| Acciones DSL ya registradas (`npm run list-actions`)               | 616, en 65 archivos de plugin                                           |
| Estimado con cobertura de acciones ≥90% hoy mismo (Tier A)         | **~577 archivos (~57%)**                                                |
| Estimado con cobertura parcial, requiere extender plugins (Tier B) | ~348 archivos (~35%)                                                    |
| Baja prioridad / excluir de esta iniciativa (Tier C)               | ~73 archivos (~7%)                                                      |

**Hallazgo clave que define toda la estrategia:** los plugins DSL (`playwright/framework/plugins/**`)
no reimplementan interacciones — son wrappers delgados sobre los mismos Page Objects
(`playwright/pages/**`) que ya usan los specs legacy. Por ejemplo
`playwright/framework/plugins/checkout/checkout.bnpl.kueski.ts` importa y llama
`@pages/bnpl/kueskipayPage`. **Migrar un spec casi nunca significa reescribir lógica de
interacción con la UI: significa reemplazar `new PageObject(page).metodo()` en el spec por un
`step` declarativo que llama la acción ya registrada (o, si falta, envolver el método del Page
Object existente en una acción nueva de una línea).** Esto es lo que hace viable migrar cientos de
archivos sin tocar los locators que ya están verificados en producción.

---

## 1. Alcance y qué queda afuera

Clasifiqué los 1871 `*.spec.ts` en tres grupos según sus imports (`grep -rl` sobre
`playwright/tests`):

| Grupo         | Detección                                                                                                                             | Archivos                         | ¿Entra en este plan?                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DSL**       | importa `TestingFramework`                                                                                                            | 31                               | Ya migrado / referencia                                                                                                                                                                                                                                     |
| **Legacy UI** | importa `@pages/*` (y no DSL, o ambos)                                                                                                | 1005 puramente legacy + 3 mixtos | **Sí — es el alcance de este documento**                                                                                                                                                                                                                    |
| **API-only**  | ni `@pages/*` ni `TestingFramework`; usa `emaService`/`paymentService`/`apiCallNewman` directo, sin un solo `page.click/fill/locator` | 835                              | **No.** Decisión confirmada con el usuario: la migración a `assertHttpResponse`/`checkHttpResponse` (`playwright/framework/httpContract.ts`) ya documentada en CLAUDE.md como "in-progress work" es la iniciativa correcta para ese grupo, no el DSL de UI. |

Los **3 archivos mixtos** (`Voucher/bizum_push/ENTP1-T2570.spec.ts`, `ENTP1-T2571`, `ENTP1-T2572`)
importan `TestingFramework` **y** `@pages/*` en el mismo archivo — son migraciones a medio hacer
que quedaron con un import residual de `@pages/*`. Son el mejor piloto posible: casi no hay riesgo
de cambiar comportamiento porque el archivo ya vive parcialmente en DSL. Van primero (Fase 0).

El estándar `no-static-wait`/`fragile-selector`/etc. de CLAUDE.md aplica igual a legacy y a DSL —
esta migración no es una excusa para tocar nada más que el framework de autoría. Si un archivo
legacy tiene una violación de esas reglas que no está relacionada con el framework (p. ej. un
`waitForTimeout`), **no la arregles en el mismo commit** salvo que sea trivialmente parte de migrar
la acción correspondiente; repórtala aparte o usa el skill `flaky-rca` si es la causa de flake.

---

## 2. Inventario actual (comandos para re-validar)

```bash
# Legacy UI por dominio de negocio
grep -rl "@pages/" playwright/tests --include="*.spec.ts" | awk -F'/' '{print $3}' | sort | uniq -c | sort -rn

# Legacy PSP por procesador
grep -rl "@pages/" playwright/tests/PSP --include="*.spec.ts" | awk -F'/' '{print $4}' | sort | uniq -c | sort -rn

# Legacy PSP por etapa del flujo de pago
grep -rl "@pages/" playwright/tests/PSP --include="*.spec.ts" | awk -F'/' '{print $5}' | sort | uniq -c | sort -rn

# Catálogo completo de acciones DSL disponibles hoy
npm run list-actions
```

### 2.1 Legacy UI por dominio (1005 archivos puramente legacy)

| Dominio                                                                                                                                                                                   | Archivos | Nota                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ----------------------------------------------------------------------- |
| `PSP/*`                                                                                                                                                                                   |      456 | ~35 procesadores; altísima repetición estructural entre procesadores    |
| `teams/*`                                                                                                                                                                                 |      355 | `admin` 131, `checkout` 130, `vault` 89, `payments` 4, `bin_detector` 1 |
| `visual_tests`                                                                                                                                                                            |       41 | Ver §6 — excluido de esta iniciativa                                    |
| `wallet`                                                                                                                                                                                  |       26 |                                                                         |
| `api_guard`                                                                                                                                                                               |       23 |                                                                         |
| `APM`                                                                                                                                                                                     |       18 |                                                                         |
| `api_navitaire`                                                                                                                                                                           |       17 |                                                                         |
| `BNPL`                                                                                                                                                                                    |       14 |                                                                         |
| `dynamic_routing`                                                                                                                                                                         |       11 |                                                                         |
| `Voucher`                                                                                                                                                                                 |        9 | +3 mixtos (piloto)                                                      |
| `guard`                                                                                                                                                                                   |        8 |                                                                         |
| `batch_processing`                                                                                                                                                                        |        7 |                                                                         |
| `sabre_middleware`                                                                                                                                                                        |        5 |                                                                         |
| resto (`api`, `bank_transfer`, `api_ema`, `traceability`, `telcel_middleware`, `mpc`, `middleware`, `installments_campaign`, `diferent_countries`, `auth`, `api_user_auth`, `api_orders`) |       17 | cola larga, 1-4 archivos c/u                                            |

### 2.2 `PSP/*` por etapa (dónde vive la repetición)

| Etapa                                                                                                                                                                                                                                                                             | Archivos | Cobertura DSL hoy                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purchase_directo`                                                                                                                                                                                                                                                                |       60 | Alta — `checkout.openCheckout` + `checkout.paymentWidget.fillCreditCardData/clickPay/assertOrderStatusRequestPurchase` + `admin.orders.goToOrder/assertStatus` cubren el 100% del flujo verificado (ver §3)                           |
| `msi`                                                                                                                                                                                                                                                                             |       59 | Alta — igual que arriba + `checkout.installments.selectMSI/assertInstallmentsLoaded`                                                                                                                                                  |
| `refund`                                                                                                                                                                                                                                                                          |       48 | Alta — `admin.orders.refundTotal/refundPartial`                                                                                                                                                                                       |
| `3ds`                                                                                                                                                                                                                                                                             |       47 | Media — `checkout.3ds.*` y `checkout.paymentWidget.assertIframe3dsVisible/completeUnlimit3DSInIframe` existen pero el reto 3DS varía mucho por procesador (Cybersource, Stripe, Adyen, Redsys cada uno con su propia UI de challenge) |
| `capture`                                                                                                                                                                                                                                                                         |       37 | Alta — `admin.orders.captureTotal/capturePartial`                                                                                                                                                                                     |
| `authorize`                                                                                                                                                                                                                                                                       |       36 | Alta                                                                                                                                                                                                                                  |
| `void`                                                                                                                                                                                                                                                                            |       35 | Alta — `admin.orders.void`                                                                                                                                                                                                            |
| `mci`                                                                                                                                                                                                                                                                             |       32 | Alta — `checkout.installments.selectMCI`                                                                                                                                                                                              |
| resto (`purchase`, `installments`, `incidence`, `deuna-3ds`, `direct-integration`, `webhook`, `voucher`, `payconnect*`, `credit_card`, `multi-capture`, `edenred`, `device_fingerprint`, `debit_card`, `connect`, `bank_transfer`, `vault`, `sodexo`, `push`, `psp_tokenization`) |       69 | Variable, evaluar caso a caso                                                                                                                                                                                                         |

### 2.3 Namespaces de acciones DSL existentes (616 acciones / 65 archivos de plugin)

| Namespace     | # acciones | Cubre principalmente                                                                                                                                                                                                                                                                                                                                                                    |
| ------------- | ---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.*`  |        388 | `paymentWidget` (20), `wallet.click2pay` (48), `wallet.mercadoPago` (42), `voucher.safetypay/oxxo/klap/pix/femsaOxxo/efecty` (66), `bnpl.addi/aplazo/kueski` (30), `apm.nupay/pse/oxxo` (30), `wallet.paypal/nequi/bizum/daviplata/applePay/googlePay` (50), `installments` (4), `3ds`, `websdk`, `vault`, `userData`, `email`, `forms`, `nextAction`, `postTransaction`, `paymentLink` |
| `admin.*`     |        189 | `roles` (54), `routing` (28), `connections` (17), `metrics` (15), `orders` (13), `paymentLinks` (11), `navigate` (11), `subscriptions` (10), `installments` (8), `batchProcessing` (7), `avs` (7), `fraud` (3), `auth` (3), `consolidatedFlows` (2)                                                                                                                                     |
| `setup.*`     |         23 | `merchant`, `processor`, `order`, `user`, `campaign`, `checkout`, `fraud` — reemplaza casi todo `beforeAll` imperativo actual                                                                                                                                                                                                                                                           |
| `api.*`       |          8 | `orders` (5), `payment` (3)                                                                                                                                                                                                                                                                                                                                                             |
| `analytics.*` |          4 | eventos/tracking                                                                                                                                                                                                                                                                                                                                                                        |
| `payment.*`   |          3 | selección de método de pago en pantalla intermedia                                                                                                                                                                                                                                                                                                                                      |
| `core.*`      |          1 | `timing.wait` (uso restringido, ver nota abajo)                                                                                                                                                                                                                                                                                                                                         |

Esto confirma que **la cobertura no es pareja por accidente**: alguien ya construyó a propósito
namespaces profundos exactamente para wallets (`click2pay`, `mercadoPago`, `paypal`, `nequi`,
`bizum`, `daviplata`), vouchers (`safetypay`, `oxxo`, `klap`, `pix`), BNPL (`addi`, `aplazo`,
`kueski`), APM (`nupay`, `pse`) y para el panel admin (`roles`, `routing`, `orders`,
`connections`). Esos dominios son los de mayor ROI porque el trabajo de "envolver el Page Object"
ya está hecho — solo falta reescribir el spec.

---

## 3. Prueba de equivalencia (por qué esto es seguro)

Comparé un spec legacy real contra el patrón DSL que ya existe para el mismo flujo:

**Legacy** (`playwright/tests/PSP/conekta/purchase_directo/guest_user/payment_widget/PI-T892.spec.ts`):

```ts
const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
await testingTool.navigateAndSetup();
const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.conektaMasterCardSuccessful, {
  country: 'MX',
});
await paymentDeunaNowPage.clickPay();
await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
await adminOrderDetailsPage.assertPaymentStatus('processed');
```

**Equivalente DSL, 1:1, con acciones que YA existen hoy:**

```ts
step: [
  { action: 'checkout.openCheckout', params: { experienceType: 'Payment Widget' } },
  {
    action: 'checkout.paymentWidget.fillCreditCardData',
    params: { creditCardData: creditCardData.conektaMasterCardSuccessful },
  },
  { action: 'checkout.paymentWidget.clickPay' },
  {
    action: 'checkout.paymentWidget.assertOrderStatusRequestPurchase',
    params: { status: 'processed', httpStatus: 200 },
  },
  { action: 'admin.orders.goToOrder' },
  { action: 'admin.orders.assertStatus', params: { status: 'processed' } },
];
```

(Los nombres exactos de params se confirman con `npm run describe-actions` antes de escribir — no
asumir los de este ejemplo.) El único gap real en este archivo puntual es la aserción de
`shipping_amount`, que no tiene acción hoy — eso es exactamente el tipo de gap chico y aislado que
se cierra agregando un método `$tf_` de una línea al plugin existente, no reescribiendo nada.

---

## 4. Framework de priorización

Score de cada lote = **(archivos que desbloquea) × (cobertura de acciones existente) ÷ (riesgo)**.
No hace falta calcularlo con precisión: la tabla de tiers de abajo ya aplica ese criterio con los
datos de §2.

| Tier                              | Definición                                                                                                                                                               | Archivos | Estrategia                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------: | ----------------------------------------------------------------------------------------- |
| **A — Listo ahora**               | Cobertura de acciones confirmada ≥90% por muestreo; wrapper trivial en el peor caso                                                                                      |     ~577 | Migración directa por lotes, mínima o ninguna extensión de plugin                         |
| **B — Requiere extender plugins** | Cobertura parcial confirmada por muestreo (30-80%); flujo estructuralmente similar pero con UI específica no envuelta aún (3DS por procesador, vault con theming custom) |     ~348 | Cerrar gaps de acciones (wrapper sobre Page Object existente) lote por lote, luego migrar |
| **C — Excluir / diferir**         | Bajo valor o riesgo elevado de flake nuevo                                                                                                                               |      ~73 | Ver §6                                                                                    |

---

## 5. Roadmap por olas

Cada ola es un rango de PRs pequeños (15-30 archivos por PR, siguiendo el patrón que ya usó este
repo en la migración `tokenizeOrder → emaService`, 381 archivos en 15 batches). **No** una ola =
un PR gigante.

### Fase 0 — Piloto (3 archivos, ya semi-migrados)

- `playwright/tests/Voucher/bizum_push/ENTP1-T2570.spec.ts`, `ENTP1-T2571`, `ENTP1-T2572`.
- Objetivo: terminar de quitar el import `@pages/*` residual, validar el procedimiento completo de
  §7 de punta a punta (incluido `npm run pr-review -- --dry-run`) con el blast radius más chico
  posible, y usarlos como "golden example" citado en el resto de las olas.
- Criterio de salida: los 3 pasan a ser puro DSL, cero `@pages/*`, mismos IDs de test case, mismo
  resultado en `npx playwright test ENTP1-T2570 ENTP1-T2571 ENTP1-T2572 --project=chromium`.

### Ola 1 — PSP: flujo base de pago (216 archivos)

`purchase_directo` (60) + `authorize` (36) + `capture` (37) + `refund` (48) + `void` (35).

- Acciones necesarias: **ya existen** (`checkout.openCheckout`, `checkout.paymentWidget.*`,
  `admin.orders.goToOrder/assertStatus/captureTotal/capturePartial/refundTotal/refundPartial/void`,
  `setup.merchant.basicSetup`, `setup.processor.createProcessor`, `setup.order.createOrder`).
- Sub-lotes recomendados: por procesador (mercadopago 47, conekta 37, worldpay 24, pagarme 23,
  kushki 22, dlocal 20, stripe 18, fiserv 17, cybersource 17...), replicando el patrón de batching
  país-por-país que ya funcionó en la migración `tokenizeOrder`.
- Este es el lote de mayor apalancamiento del plan completo: es el 21% de todo el alcance con
  prácticamente cero trabajo de plugin nuevo.

### Ola 2 — PSP: installments (91 archivos)

`msi` (59) + `mci` (32).

- Acciones existentes: todo lo de Ola 1 + `checkout.installments.selectMSI/selectMCI/assertInstallmentsLoaded/assertInstallmentsResponse` + `setup.campaign.createMSI/createMCI/delete`.
- Gap confirmado por muestreo: falta una acción equivalente a
  `globalAssert.assertInstallmentsQuantity` / `assertInstallmentesType` — evaluar si
  `admin.installments.*` (8 acciones) ya lo cubre antes de escribir una nueva; si no, es un wrapper
  de una función que ya existe en `GlobalAssert`.

### Ola 3 — `teams/admin` de alta cobertura (98 archivos)

`roles_and_permissions` (25) + `routing` (21) + `orders` (29) + `connections` (12) + `subscriptions` (11).

- `admin.roles` ya tiene 54 acciones — la cobertura más profunda de todo el catálogo. Confirmar con
  `npm run describe-actions` que mapea 1:1 contra `adminRolesAndPermissionsPageV3.ts` antes de
  arrancar (ese Page Object tuvo cambios recientes en este mismo branch — verificar que el estado
  en `develop`/`master` es el que se está mirando).
- Sin bloqueo pendiente de merge (confirmado con el usuario).

### Ola 4 — `teams/checkout/payment_widget` (69 archivos)

- Mismas acciones que Ola 1 (`checkout.paymentWidget.*`) más las específicas de `teams/checkout`
  que ya tienen ejemplos DSL reales en el repo (`ENTP1-T2312`, `ENTP1-T2349`, `ENTP1-T2461`,
  `ENTP1-T2462`, `ENTP1-T2597` ya están en DSL — úsalos como referencia directa, son del mismo
  dominio).

### Ola 5 — Wallets/Vouchers/BNPL/APM dedicados (103 archivos)

`wallet` (26) + `Voucher` (9) + `APM` (18) + `BNPL` (14) + `PSP/clickToPay` (12) +
`PSP/mercadopago_wallet` (12) + `PSP/paypalACDC` (12).

- Estos procesadores tienen namespaces DSL dedicados y muy profundos (`checkout.wallet.click2pay`
  48 acciones, `checkout.wallet.mercadoPago` 42, `checkout.voucher.*` 66, `checkout.bnpl.*` 30,
  `checkout.apm.*` 30). Verificar con `describe-actions` antes de asumir 1:1 — algunos flujos de
  wallet tienen pasos de captcha/timing (`checkout.wallet.mercadoPago.hasCaptcha`,
  `handlePostPaymentFlow`) que ya están resueltos en el plugin — no reintentar resolverlos distinto
  en el spec migrado.

**Con las Olas 1-5 completas: ~577 archivos migrados, ~57% del alcance total, con extensión de
plugin mínima.** Esto es el hito de "mitad del camino con el 10% del esfuerzo" que pediste.

### Ola 6 — PSP 3DS (54 archivos)

`3ds` (47) + `deuna-3ds` (7).

- Tier B: `checkout.3ds.*` cubre Redsys y el patrón genérico de iframe
  (`checkout.paymentWidget.assertIframe3dsVisible`, `completeUnlimit3DSInIframe`), pero
  Cybersource/Stripe/Adyen tienen su propio challenge UI. Antes de migrar, agrupar por proveedor de
  3DS (no por PSP) y construir 1 wrapper de plugin por patrón de challenge compartido — varios PSPs
  comparten el mismo proveedor 3DS subyacente.

### Ola 7 — `teams/vault` (88 archivos: `guest` 44 + `auth` 44)

- Tier B: `setup.checkout.configureVaultWidget`, `setup.user.saveCreditCard/register/login`,
  `checkout.paymentWidget.assertSavedCardIsPreselected/assertSavedCardsVisible/clickAddNewCard`,
  y 3 acciones `vault.*` cubren el esqueleto. El gap típico son aserciones de theming custom
  (ver ejemplo `ENTP1-T2394` con `customThemeConfig` inyectado) — requieren una acción genérica
  tipo `checkout.assertTextVisible(text)` en vez de una por cada texto custom.

### Ola 8 — Resto de `teams/checkout`, `api_guard`, `dynamic_routing`, `guard`, `batch_processing`, `sabre_middleware`, resto de `teams/admin` (~180 archivos)

- Tier B, evaluar caso a caso con `describe-actions`; probablemente requiere 1-2 acciones nuevas
  por sub-dominio, no por archivo.

### Fuera de esta iniciativa (Tier C, ~73 archivos)

Ver §6.

---

## 6. Riesgos y exclusiones explícitas

| Ítem                                                                                                                                                                                           |                                                   Archivos | Por qué se excluye/difiere                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `visual_tests`                                                                                                                                                                                 |                                                         41 | `docs/flaky-test-patterns.md` ya documenta timing de visual tests como fuente confirmada de flake. Migrar el framework de autoría no reduce ese riesgo y lo puede introducir de nuevo si el reescritura cambia timing de renderizado. Tocar solo si el objetivo es explícitamente arreglar flake ahí (usar `flaky-rca`, no este plan).                                                                                                                                                                                         |
| `api_navitaire`                                                                                                                                                                                |                                                         17 | Dominio de integración externa (Sabre/Navitaire) de bajo volumen — priorizar solo si el equipo dueño lo pide.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Cola larga (`traceability`, `telcel_middleware`, `mpc`, `middleware`, `installments_campaign`, `diferent_countries`, `auth`, `api_user_auth`, `api_orders`, `api`, `bank_transfer`, `api_ema`) |                                                        ~15 | 1-4 archivos cada uno; el costo de descubrir/crear acciones nuevas por dominio no se amortiza. Revisar al final, si sobra tiempo.                                                                                                                                                                                                                                                                                                                                                                                              |
| Tests con `test.fixme(...)`                                                                                                                                                                    | (transversal, varios ejemplos de arriba usan `test.fixme`) | Un `test.fixme` significa que el test no corre. Migrarlo no se puede verificar por ejecución — la IA ejecutora debe migrarlo estructuralmente pero **marcar el PR con nota explícita** de que no hay corrida real que confirme equivalencia, y no des-skipearlo como parte de la migración (eso es un cambio de comportamiento fuera de alcance).                                                                                                                                                                              |
| `core.timing.wait`                                                                                                                                                                             |                                                          — | Es la única acción DSL que envuelve una espera fija. CLAUDE.md prohíbe `waitForTimeout` como error de PR (`no-static-wait`). Usarla solo para lo que su descripción dice explícitamente (ventanas de expiración de OTP sin cambio observable de UI) — nunca como salida fácil para no investigar un evento real que esperar. Si un spec legacy tiene un `waitForTimeout` que no es ese caso, NO lo migres tal cual a `core.timing.wait`: es la señal de que el spec ya era flaky y corresponde `flaky-rca`, no esta migración. |

---

## 7. Procedimiento de migración (para que lo ejecute una IA, archivo por archivo)

Este es el contrato operativo. Cada PR de migración debe poder mostrar que siguió estos pasos.

### 7.1 Antes de tocar código

1. Invocar el skill `dsl-test` (obligatorio por CLAUDE.md antes de escribir/modificar cualquier
   test).
2. Confirmar el conteo real del sub-lote con el `grep` correspondiente de §2 (puede haber cambiado
   desde este documento).
3. Leer el spec legacy completo y anotar, paso por paso: setup (`beforeAll`/`beforeEach`), cada
   `test.step`, cada assertion, tags, `@testcaseid`, anotaciones (`test.fixme`, `annotation`).
4. `npm run list-actions` + `npm run describe-actions <candidatas>` para las acciones que crees que
   cubren cada paso. **Nunca asumir el nombre o shape de una acción por este documento** — este
   documento puede quedar desactualizado, el catálogo real no.

### 7.2 Si falta una acción (gap)

1. Buscar el método ya existente en el Page Object legacy que implementa ese paso
   (`playwright/pages/**`) — casi siempre existe, porque es lo que usa el spec actual.
2. Agregar un método `$tf_` al plugin correspondiente (o crear el plugin si el dominio no tiene
   uno) que **llama ese método del Page Object existente**, no reimplementa el locator. JSDoc con
   `@description` obligatorio.
3. `npm run generate-action-types` (CI falla si el archivo generado queda desactualizado — nunca
   editarlo a mano).
4. `npm run typecheck`.
5. Si el gap se repite en varios archivos del mismo lote, ciérralo una sola vez y reutilízalo — no
   dupliques la acción.

### 7.3 Reescribir el spec

1. Reemplazar imports: quitar `@pages/*`, agregar `TestingFramework` desde `playwright/framework/core`.
2. Reemplazar `beforeAll` imperativo por `setup.*` steps donde exista una acción equivalente
   (tabla en el skill `dsl-test`); dejar `beforeAll` a mano solo para lo que no tiene `setup.*`
   todavía.
3. Convertir cada `test.step` a un `step` declarativo, preservando: el mismo texto de step (o uno
   equivalente), el mismo orden, las mismas assertions con los mismos valores esperados, los mismos
   tags, el mismo `@testcaseid`, el mismo `test.describe` con `@regression` si correspondía.
4. Usar `ref()`/`saveAs` en vez de variables de módulo o `process.env` para pasar datos entre pasos.
5. **No** agregues pasos, assertions, o cobertura que el test original no tenía — esto es una
   migración de framework, no una mejora de cobertura. Si ves un bug o un gap de cobertura real,
   anótalo aparte para un ticket, no lo mezcles en este PR.

### 7.4 Verificación de equivalencia (obligatoria antes de abrir PR)

1. `npm run typecheck` — un nombre de acción o param alucinado es error de compilación acá, antes
   de gastar tiempo de ejecución.
2. Correr el test **legacy** (antes de borrar el archivo viejo, o desde el commit anterior) y el
   **migrado**, ambos con `npx playwright test <ID> --headed --project=chromium`, y comparar:
   resultado (pass/fail), los `test.step` reportados, y — si el test tocó dinero/estado — que el
   request/response relevante sea el mismo (usar el reporte de Playwright, no asumir).
3. Si el test es parte de `@regression`, correrlo también con `--project=chromium` sin `--headed`
   una vez, porque el modo headed puede esconder problemas de timing que agrega el propio wrapping
   de acción (ver `docs/flaky-test-patterns.md`, patrón de comportamiento headed-only).
4. `npm run pr-review -- --base <sha-antes-de-esta-ola> --head HEAD --dry-run` — corre localmente
   las mismas reglas deterministas que corre el bot de PR (tabla de CLAUDE.md), sin publicar nada.
   Cero `error` antes de abrir el PR de verdad.
5. Si el spec tenía `test.fixme`, mantenlo `test.fixme` y anota en el PR que no hay corrida real
   que confirme equivalencia (ver §6).

### 7.5 Commit y PR

- Un PR por sub-lote de §5 (15-30 archivos), nunca "migrar todo PSP" en un solo PR.
- Mensaje de commit: `refactor(dsl-migration): migrate <sub-lote> to TestingFramework DSL`,
  cuerpo con la lista de test case IDs tocados (o el patrón de carpeta si son muchos).
- Si el lote requirió cerrar gaps de plugin, ese cierre va en un commit separado dentro del mismo
  PR (`feat(dsl): add checkout.installments.assertInstallmentsQuantity action`), para que un
  reviewer pueda auditar la acción nueva sola, sin el ruido de 20 specs reescritos.
- **No borres el Page Object legacy** aunque el spec ya no lo importe directamente — el plugin
  DSL sigue dependiendo de él. Solo se retira un Page Object si, al final de toda la iniciativa, se
  confirma que ningún plugin ni spec restante lo usa (`grep -r` global).

---

## 8. Tracking de progreso

Crear `docs/dsl-migration-status.md` (o una sección al final de este archivo, a decidir cuando
arranque la Fase 0) con una tabla actualizada por PR:

| Fecha | Ola | Sub-lote | Archivos migrados | Gaps de plugin cerrados | PR  |
| ----- | --- | -------- | ----------------: | ----------------------- | --- |

Métricas de progreso a reportar semanalmente mientras la iniciativa esté activa:

- `grep -rl "@pages/" playwright/tests --include="*.spec.ts" | wc -l` — debe bajar de 1005 hacia 0.
- `grep -rl "TestingFramework" playwright/tests --include="*.spec.ts" | wc -l` — debe subir.
- % del alcance total (1005) migrado, por tier (A/B/C) y por dominio (tabla §2.1).
- Ningún test debe pasar de verde a rojo/flaky en el reporte de regresión tras cada ola — si pasa,
  es un stop-the-line, no un "lo arreglamos después" (usar `flaky-rca` de inmediato).

---

## 9. Criterios de éxito de la iniciativa completa

1. ≥90% de los 1005 archivos legacy UI migrados a DSL (dejar Tier C fuera es aceptable, ver §6).
2. Cero regresiones de resultado (mismo pass/fail que antes de migrar) medidas por corrida de
   regresión completa antes/después de cada ola.
3. Cero incremento de flake rate atribuible a la migración (comparar `FLAKY_ANALYSIS.md`/reportes
   de regresión pre y post ola).
4. El catálogo de acciones (`npm run list-actions`) crece solo con acciones reutilizables
   (evidencia: cada acción nueva se usa en ≥2 specs migrados, salvo casos de dominio genuinamente
   único).
5. `npm run pr-review` en verde (cero `error`) para el 100% de los PRs de migración.
