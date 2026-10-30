# Patrones de flakiness en e2e-testing

> Catálogo de causas raíz de tests flaky que son responsabilidad de **este repositorio**
> (no de servicios backend externos). Cada patrón fue diagnosticado con evidencia real
> (trace de red, logs de servicio, o ambos) durante una sesión de estabilización sobre
> reportes de regresión de staging, no son hipótesis genéricas de buenas prácticas.
>
> **Audiencia**: cualquier LLM (Claude u otro) que escriba o revise un `.spec.ts` en este
> repo, incluyendo un futuro hook de pre-commit que revise diffs de tests nuevos contra
> esta lista antes de aceptarlos.
>
> **Cómo usar este documento**: antes de escribir o modificar un test, y especialmente
> antes de aprobar un PR que agrega uno nuevo, revisa el diff contra cada patrón de la
> sección "Reglas". Si el código nuevo reproduce alguno de estos anti-patrones, es
> prácticamente seguro que el test será flaky tarde o temprano — no es una preferencia de
> estilo, es una causa raíz confirmada repetidamente.

## Reglas

### 1. Registrar el listener de red _antes_ de la acción que lo dispara, nunca después

**Síntoma:** `TimeoutError: page.waitForResponse/waitForRequest: Timeout Nms exceeded`,
intermitente — a veces pasa, a veces no, sin cambios de código entre corridas.

**Causa raíz:** `page.waitForResponse()`/`page.waitForRequest()` solo detectan eventos que
ocurren _después_ de que la llamada se ejecuta. Si la acción que dispara la petición
(`click()`, `fill()`, un blur) corre _antes_ de registrar el listener, la petición real
puede completarse en el intervalo, y el listener queda esperando un evento que ya pasó.
Esto no es determinista: depende de qué tan rápido responda el backend en cada corrida —
por eso es flaky y no un fallo consistente.

**❌ Incorrecto** (listener registrado después de la acción):

```ts
await vaultWidgetPage.adjustCardAmount(1, amountCard1);   // dispara la llamada AQUÍ
vaultWidgetPage.waitForInstallmentsResponse(bin, amount);  // el listener llega tarde
await vaultWidgetPage.assertInstallmentsData(...);
```

**✅ Correcto** (listener registrado antes, sin `await` — el registro es síncrono):

```ts
vaultWidgetPage.waitForInstallmentsResponse(bin, amount);  // registra el listener YA
await vaultWidgetPage.adjustCardAmount(1, amountCard1);     // ahora sí dispara la acción
await vaultWidgetPage.assertInstallmentsData(...);
```

El mismo patrón aplica a eventos de tracking (`assertEventWasFired`):

```ts
// ✅ Correcto — mismo principio, para un evento en vez de una respuesta HTTP
const eventPromise = vaultWidgetPage.assertEventWasFired('vaultSaveSuccess');
await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
await eventPromise;
```

**Por qué funciona sin `await` en la primera línea:** una función `async` ejecuta su
cuerpo de forma síncrona hasta el primer `await` interno. `page.waitForResponse(...)`
registra el listener en el momento en que se invoca, no cuando se resuelve — así que
llamarla sin `await` y guardarla en una variable ya la deja "armada" antes de que el test
continúe.

**Casos reales:** `ENTP1-T2303.spec.ts` (dos instancias, `vaultWidgetPage.ts:556`
`waitForInstallmentsResponse`), `ENTP1-T2269.spec.ts` + 11 archivos hermanos en
`teams/vault/auth/` y `teams/vault/guest/` (mismo bug en la aserción de
`vaultSaveSuccess`), `paymentPage.ts:597` `assertCardsCreationIsCalled` (el `expect`
sobre el flag `cardsRequestDetected` corría antes de esperar la respuesta real).

---

### 2. Toda espera de un elemento debe tener un timeout explícito y un mensaje claro

**Síntoma:** `Test timeout of 240000ms exceeded` en un `.fill()` o `.click()` sin
contexto útil — el fallo no dice qué elemento faltaba ni por qué, solo que el test
completo se acabó el tiempo.

**Causa raíz:** este repo no configura `actionTimeout` en `playwright.config.ts`, así
que `.fill()`/`.click()` sobre un locator no tienen timeout propio — si el elemento
nunca aparece, la acción espera indefinidamente hasta que se agota el timeout _del test
completo_ (240s por defecto). El resultado es un fallo opaco y lento en vez de uno rápido
y diagnosticable.

**❌ Incorrecto:**

```ts
async fillCvvInCardForm(cvv: string) {
  await this.cvvInput.fill(cvv);   // si el campo nunca aparece, cuelga 240s
}
```

**✅ Correcto** (acota la espera con un mensaje claro, sin cambiar qué se verifica):

```ts
async fillCvvInCardForm(cvv: string) {
  await expect(this.cvvInput, 'The CVV input is not visible').toBeVisible({ timeout: 40000 });
  await this.cvvInput.fill(cvv);
}
```

**⚠️ Importante — qué NO hacer con este patrón:** acotar la espera está bien porque
convierte un cuelgue opaco en un fallo rápido y claro, **sin cambiar qué se está
verificando**. Lo que _no_ se debe hacer es agregar un reintento silencioso que enmascare
el problema (p. ej. "si el campo no aparece, hacer otra acción y seguir como si nada").
Si la causa real es que el comportamiento de la app es no-determinista (una sesión que a
veces persiste y a veces no, un paso que a veces se salta), acotar el timeout expone eso
con claridad — enmascararlo con un retry automático oculta una posible regresión real.
Ver el caso de `ENTP1-T2023` más abajo.

**Casos reales:** `commonActions.ts:336` `typeFormattedAmount` (afecta a
`adminOrderDetailsPage.ts` y `adminSubscriptionsPlanPage.ts`), `ENTP1-T2023.spec.ts`
(OTP input y CVV input), `vaultWidgetPage.ts:1229` `fillCvvInCardForm` (usado por 17
specs).

---

### 3. Las credenciales del merchant y el order token viajan explícitos — ya no hay global al que caer

**Estado: cerrado por el compilador.** `setUpExplore()` y `navigateAndSetup()` exigen
`orderToken` y `merchantCredentials`, así que un spec que los omita **no compila**. Las
clases `saveConfig` y `tokenizeOrder` fueron eliminadas, y con ellas todos los globales que
servían de fallback: `PUBLIC_KEY_MERCHANT`, `PRIVATE_KEY_MERCHANT`, `MERCHANT_ID_NEW`,
`MERCHANT_TOKEN_NEW`, `MERCHANT_NAME`, `ORDER_TOKEN_NEW`, `ORDER_ID_NEW`, `INVOICE_ID_NEW`,
`USER_AUTH_TOKEN` y `USER_CARD_ID`.

**Por qué estaba acá:** esas variables las escribía **cada** `basicSetup()` y **cada**
`tokenize`, y las comparten todos los specs que corren en el mismo worker de Playwright.
Un spec que no pasaba sus credenciales terminaba operando bajo el merchant que hubiera
dejado la última escritura — casi siempre el de otro test. El síntoma iba desde header
"Comercio: No válido" hasta un merchant que _parecía_ válido pero era el equivocado,
produciendo `"no merchant payment processor found"` (422), `/installments` vacío, o un
`plan_option_id` distinto al esperado.

**✅ La forma actual:**

```ts
test.beforeAll(async () => {
  const merchant = await configMerchant.basicSetup('CO');
  privateKey = merchant.privateKey;
  publicKey = merchant.publicKey;
  orderToken = (await emaService.tokenizeDeunaNowOrder('CO', privateKey)).data.token;
});

test.beforeEach(async ({ page }) => {
  const testingTool = nagivateAndConfigureWidget(page, 'Formularios', false, true);
  await testingTool.setUpExplore({
    orderToken: orderToken,
    merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
  });
});
```

**Lo que el compilador no ve, y sigue siendo tu responsabilidad:**

1. **Specs con dos merchants.** Si el spec hace un segundo `basicSetup()`, el par de
   claves tiene que viajar completo: reasignar `privateKey` y olvidar `publicKey` deja un
   par cruzado que antes no se notaba porque el global traía las dos juntas. Casos reales:
   `ADM-T497`, `ADM-T502`, `ADM-T532`, `ADM-T568`, `ENTP1-T1985`, `ENTP1-T1991`,
   `ENTP1-T2460`.
2. **Acciones del DSL.** Ahí `orderToken`, `privateKey`, `publicKey` y `merchantId` son
   parámetros **opcionales** que se resuelven en runtime, así que `tsc` ve una llamada
   completa y el fallo aparece recién al correr. Las reglas
   `dsl-action-requires-ordertoken` y `dsl-action-requires-merchant` del PR Reviewer Agent
   cubren este hueco.
3. **Capturas descartadas.** `await emaService.tokenize…()` o `await basicSetup()` sin
   guardar el resultado dejaba el valor viajando por el global. Hoy queda inalcanzable:
   lo marca `unused-tokenize-result`.

---

### 4. Escopar locators de texto a un contenedor real, no a texto plano en toda la página

**Síntoma:** `Error: strict mode violation: locator(...) resolved to 2 elements` — de
forma intermitente, típicamente al volver a seleccionar un valor que ya estaba
seleccionado.

**Causa raíz:** algunos componentes de dropdown personalizados dejan en el DOM un "eco"
del valor actualmente seleccionado (`aria-hidden="true"`, `pointer-events-none`) incluso
mientras la lista de opciones está abierta — es puramente decorativo, un usuario real
nunca podría hacerle click. Un locator de texto plano no distingue ese eco de la opción
real y clickeable; cuando el texto buscado coincide con el valor _ya seleccionado_, el
locator resuelve a dos elementos y Playwright lanza `strict mode violation`.

**❌ Incorrecto:**

```ts
const locatorInstallments = this.iframeVault.locator(
  `text=/^${installments} ${label}/` // matchea tanto el eco decorativo como la opción real
);
await locatorInstallments.click();
```

**✅ Correcto** (escopado a los items reales del listbox):

```ts
const locatorInstallments = this.iframeVault
  .locator('[data-testid^="dropdown-item-"]')
  .filter({ hasText: new RegExp(`^${installments} ${label}`) });
await locatorInstallments.click();
```

**Caso real:** `vaultWidgetPage.ts:1312` `selectInstallmentsMSI` (usado por 84 specs).

---

### 5. Validar con un `expect` claro antes de leer una propiedad anidada de un `.find()` o de una respuesta de API

**Síntoma:** `TypeError: Cannot read properties of undefined (reading 'X')` — un crash de
JavaScript, no un fallo de aserción con mensaje entendible.

**Causa raíz:** código como `array.find(...).propiedad` asume que el `.find()` siempre
encuentra algo. Cuando no lo encuentra (porque la data esperada no llegó — a veces por un
bug real de test, a veces por un problema de backend genuino como el patrón 3 de arriba),
el resultado es `undefined`, y leer una propiedad de `undefined` explota con un mensaje
que no dice nada sobre qué se esperaba. Esto además dificulta diagnosticar la causa real
detrás — un `TypeError` genérico se ve igual sin importar por qué la data faltó.

**❌ Incorrecto:**

```ts
const selectedInstallment = installmentsData.installments.find(
  (i) => i.installments === installmentsAmount
);
expect(selectedInstallment.installment_total_amount).toBe(totalAmount); // crash si undefined
```

**✅ Correcto:**

```ts
const selectedInstallment = installmentsData.installments.find(
  (i) => i.installments === installmentsAmount
);
expect(
  selectedInstallment,
  `Expected an installment plan for ${installmentsAmount} installments, but the /installments response had none: ${JSON.stringify(installmentsData.installments)}`
).toBeDefined();
expect(selectedInstallment.installment_total_amount).toBe(totalAmount);
```

El mensaje explícito además sirve como evidencia de diagnóstico: en un caso real, este
`expect` habría señalado inmediatamente que el cuerpo de `/installments` venía vacío,
en vez de requerir extraer el trace de red para descubrirlo.

**Caso real:** `vaultWidgetPage.ts:588` `assertInstallmentsData`.

---

### 6. Para tests visuales: esperar el contenido que carga _después_ del último elemento verificado, no solo el primero visible

**Síntoma:** `Expected an image WxH, received Wx(H-100)` en `toHaveScreenshot()` — el
mismatch de dimensión siempre cae en el mismo par de valores (p. ej. siempre 900px vs
1000px esperado), no un valor aleatorio distinto cada vez.

**Causa raíz:** `verifyElementVisualConsistency` (`playwright/visual/utils/visualTestingUtils.ts`)
mide la altura del contenido dos veces (500ms de separación) y la redondea a "buckets" de
100px con un buffer de 100px, para tolerar variación menor entre corridas. Si el
contenido real mide justo cerca del límite entre dos buckets, cualquier elemento que
cargue de forma asíncrona **después** del último punto que el test verificó
explícitamente (p. ej. una tarjeta de datos guardados, un footer) puede terminar de
renderizar _durante_ la medición, empujando la altura al bucket equivocado según qué tan
rápido corra esa corrida en particular.

**❌ Incorrecto** (solo verifica un elemento intermedio antes de capturar):

```ts
await test.step('Verify pay with two cards is visible', async () => {
  await vaultWidgetPage.assertPayWithTwoCards();  // hay contenido MÁS ABAJO en el layout
});
await verifyElementVisualConsistency(page, 'vault_embed_container', ...);  // puede capturar a medio-cargar
```

**✅ Correcto** (espera también el contenido más abajo, si existe una aserción para él):

```ts
await test.step('Verify pay with two cards is visible', async () => {
  await vaultWidgetPage.assertPayWithTwoCards();
  await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();  // confirma lo que carga después
});
await verifyElementVisualConsistency(page, 'vault_embed_container', ...);
```

**Nota de honestidad:** este fix se probó localmente sin resultado concluyente — las
pruebas visuales son sensibles al renderizado de fuentes del SO/motor gráfico, y el
baseline se capturó en el entorno Linux/CI, no en macOS local. Confirmar en CI antes de
darlo por bueno. Ver caso real para el estado actual.

**Caso real:** `ENTP1-T2380.spec.ts` — fix propuesto, no confirmado en CI a la fecha de
este documento.

### 7. No asertar sobre comportamiento del navegador que solo existe en modo headed

**Síntoma:** `expect.poll` agota su timeout comparando `popup.url()`; el valor recibido es
`":"`. Pasa al correr con `--headed`, falla siempre en headless (que es el default de
`playwright.config.ts`).

**Causa raíz:** Chromium headless **no trae el visor de PDF**. Cuando la app hace
`window.open(URL.createObjectURL(pdfBlob))`, headed navega el popup a la URL `blob:`,
mientras headless convierte esa misma navegación en una **descarga**: el popup se queda en
el documento vacío inicial (su `url()` es literalmente `":"`) y el `blob:` solo viaja en el
evento `download` del contexto. Verificado de forma aislada: `headless=true` produce
`download` + `popupUrls=[":"]`; `headless=false` produce `popupUrls=["blob:https://..."]`.

**❌ Incorrecto** — asume el camino de headed:

```ts
await expect.poll(() => popup.url()).toContain('blob:');
```

**✅ Correcto** — acepta la señal real en cualquiera de los dos modos:

```ts
// en el page object, antes del click que dispara la descarga
this.page.context().on('download', (d) => {
  this.voucherDownload = d;
});
// ...
await expect.poll(() => this.voucherDownload?.url() ?? popup.url()).toContain('blob:');
```

**Casos reales:** `ADM-T507`, `ADM-T508`, `ADM-T511` (`adminCommercePage.assertDownloadVoucher`).

---

### 8. SDKs de terceros bloqueados por antibot: el leak está en `sec-ch-ua`, no en el User-Agent

**Síntoma:** una aserción sobre datos que aporta un SDK de terceros falla porque el dato
llega vacío o sin la clave esperada (por ejemplo, un `device_id` sin `KOIN`). En el trace,
el script del SDK aparece con `"status": -1` y `_failureText: "net::ERR_BLOCKED_BY_ORB"`.

**Causa raíz:** `devices['Desktop Chrome']` enmascara el _User-Agent string_, pero **no los
Client Hints**: Chromium sigue recalculando `sec-ch-ua` desde su `UserAgentMetadata` interno
y ahí aparece `"HeadlessChrome"`. Los WAF (Akamai, en el caso confirmado) responden **403
`text/html`** a esa cabecera, y Chromium descarta esa respuesta cross-origin con ORB, así
que el script nunca se ejecuta. Comprobado con `curl`: el mismo recurso devuelve `200
application/javascript` con `sec-ch-ua` normal y `403 text/html` con el de headless.

Ojo con el diagnóstico intermedio: el trace solo muestra ORB. Para ver el 403 real hay que
interceptar con `route.fetch()` y leer la respuesta que recibe el navegador.

**✅ Correcto** — parchear el `UserAgentMetadata` vía CDP antes de que cargue el SDK:

```ts
import { avoidAntibot } from '@support/utils/avoidAntibot';
// en el beforeEach, ANTES de navigateAndSetup()
await avoidAntibot(page);
```

`route.continue({ headers })` **no** sirve: el network service recalcula esas cabeceras
después de la interceptación y descarta el override.

**Casos reales:** `ENTP1-T2449` (Koin), y los specs de `PSP/clickToPay` (Mastercard).

---

### 9. Cambiar un feature flag de Statsig y usarlo de inmediato

**Síntoma:** el comportamiento que el flag debía activar no ocurre. La aserción falla sobre
un efecto de negocio (una fila de `transaction_log` que no debía existir, un `card_brand`
vacío en vez de `unknown`), sin ningún error de red.

**Causa raíz:** la console API de Statsig **almacena la regla al instante**, pero el
servicio que la consume solo la ve tras volver a descargar el config spec, y **no hay
endpoint que informe cuándo ocurrió**. Medido en staging: una regla escrita 17-22 s antes
de la compra fue ignorada en 6/6 corridas serializadas; con ≥30 s se respetó en 3/3, con
≥50 s en 2/2 y con ≥110 s en 2/2. El setup típico de estos tests solo aporta ~20 s, justo
por debajo del umbral.

Un segundo modo de fallo del mismo mecanismo: escribir la regla **reemplaza** su lista de
`merchant_id`, así que dos corridas simultáneas contra la misma regla se expulsan
mutuamente y la que perdió deja de matchear el gate en silencio.

**❌ Incorrecto** — un sleep arbitrario (además viola `no-static-wait`):

```ts
statsigRuleId = statsigResponse.ruleId;
await new Promise((resolve) => setTimeout(resolve, 5000)); // muy por debajo del umbral
```

**✅ Correcto** — esperar la ventana de propagación lo más tarde posible, para que el resto
del setup cuente dentro de ella:

```ts
await test.step('The Statsig rule is live for this merchant', async () => {
  await configStatsig.pollUntilRuleIsLive(FlagNames.ShouldReturnUnknownCards, merchantId);
});
```

`pollUntilRuleIsLive` retorna de inmediato si la ventana ya transcurrió, así que ponerlo en
un test lento no cuesta nada. Para reglas compartidas, pásale `reapply` para que reponga el
merchant si otra corrida lo expulsó.

**Casos reales:** `PI-T1919` (6/6 fallaban), `PI-T2169` (5/6 fallaban), y como seguro en
`PAYM-T2206/T2207`, `PAYM-T2217/T2218/T2219/T2220`, `ENTP1-T2383/T2384`.

**Corolario: el nombre de la regla lleva el `merchantId`.** Una regla de Statsig es un
recurso **externo y compartido**: el nombre es global para el gate, así que dos ejecuciones
concurrentes —dos corridas de CI, un rerun solapado, un `--repeat-each`— colisionan si usan
un nombre fijo. Nada dentro del proceso de test puede serializar eso.

```ts
// ❌ nombre fijo: dos corridas escriben la misma regla
{ key: 'rule_id', value: RuleNames.MerchantsThatUseMultiCaptureWithLock… }

// ✅ el merchant se crea nuevo en cada corrida, así que el nombre no puede pre-existir
const statsigRuleName = `${RuleNames.MerchantsThatUseMultiCaptureWithLock…}-${merchantId}`;
{ key: 'rule_id', value: statsigRuleName }
```

Es el mismo patrón que ya aplica `addMerchantIDToUniqueFeatureGateRule`. El costo es que el
gate acumula una regla por corrida, así que el `afterAll` **tiene** que borrarla; una corrida
que se cae deja una huérfana, y en un gate con cientos de reglas cada escritura pasa a tardar
25-40 s.

No intentes reclamar huérfanas borrando _por nombre_ antes de crear la tuya: eso no distingue
una huérfana de la regla que otra corrida está usando en ese momento, y se la borra por
debajo. `PAYM-T2207` hacía exactamente eso.

**La regla compartida se verifica, no se asume.** `ensureCreateOrUpdateRule` comparte una
regla entre merchants a propósito y hace lee-modifica-escribe sobre su lista de
`merchant_id`. El endpoint de update de Statsig **no acepta versión ni etag**, así que dos
corridas que leen la misma lista reciben las dos un 200 y la segunda expulsa al merchant de
la primera **sin ningún 409**: no hay conflicto que reintentar. El retry de 409 de
`StatsigService` es para otra carrera (dos escrituras compitiendo por la versión del
documento del gate) y esa sí la resuelve.

Por eso la escritura se **relee y se confirma**: si el merchant no quedó en la lista, se
vuelve a mezclar, hasta `MAX_RULE_WRITE_ATTEMPTS`. `pollUntilRuleIsLive({ reapply })` sigue
siendo complementario: cubre la expulsión que ocurre _después_, durante la ventana de
propagación.

### 10. `await` faltante al llamar a un helper `async`: la aserción no asserta y su fallo cae fuera del test

**Síntoma:** dos cosas a la vez. El test pasa corridas enteras sin verificar lo que dice
verificar, y de vez en cuando revienta con un error cuyo stack **no tiene ninguna línea del
`.spec.ts`** — solo frames del page object. A veces el snapshot de la página al fallar
muestra un spinner o una pantalla a medio cargar.

**Causa raíz:** llamar a un método `async` sin `await` deja una promesa suelta. El método
que la lanzó retorna de inmediato, así que:

1. la aserción **no bloquea** el paso — el test sigue como si hubiera pasado;
2. lo que el helper haga después (un `page.reload()` en su `catch`, un click) ocurre por
   debajo de los pasos siguientes, que ya están interactuando con la página;
3. si al final falla, el rechazo aparece detached, en un punto arbitrario y sin frames del
   spec — de ahí el stack "huérfano", que es la firma para reconocerlo.

**❌ Incorrecto:**

```ts
async assertRoleInRolesList(roleName: string) {
  await this.page.waitForResponse(/* ... */);
  this.assertRoleAndPermissionInTable(roleName);   // promesa suelta
}
```

**✅ Correcto:**

```ts
async assertRoleInRolesList(roleName: string) {
  await this.assertRoleAndPermissionInTable(roleName);
}
```

**Tres variantes del mismo defecto**, todas presentes hoy en el repo:

| Variante                                    | Qué pasa realmente                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `this.assertAlgo(x)` sin `await`            | La aserción corre detached: no bloquea el paso y su fallo aparece en otro punto |
| `expect(locator).toBeVisible()` sin `await` | Igual, y además puede terminar como _unhandled rejection_                       |
| `expect(locator.isVisible())`               | **No hay matcher**: no asserta absolutamente nada, es una sentencia muerta      |

Y una cuarta, emparentada: un helper que **devuelve un booleano en vez de asertar**
(`isVisibleWithTimeout` en `commonActions.ts`) usado como si fuera un `assert*`. Aunque le
pongas el `await`, el valor se descarta y el método pasa siempre. Usa `assertIsVisible`,
que es el wrapper de `expect(...).toBeVisible()` de esa misma clase.

Para barrer el repo entero hace falta AST, no `grep`: el escaneo con `ts-morph` está en la
skill [`flaky-rca`](../.agents/skills/flaky-rca/SKILL.md), paso 6. **No filtres por el
prefijo de la llamada** — si solo miras `this.*` se te escapan los `expect(...)`, que son
los más peligrosos. Al revisar los resultados, ojo con no "arreglar" los que están así **a
propósito**: registrar un listener sin `await` antes de la acción que lo dispara es el
patrón 1 y debe quedarse como está.

**Cuidado al arreglarlo:** una aserción que nunca corrió lleva tiempo sin verificar nada, y
al despertarla puede empezar a fallar de verdad. Corre los specs que la usan antes de dar
el fix por bueno, y si falla, comprueba con un A/B (revierte el `await`, vuelve a correr)
si el fallo es tuyo o ya estaba ahí.

**Casos reales:** `adminRolesAndPermissionsPageV3.assertRoleInRolesList` (`RECON-T18` y
otros 15 puntos de llamada en 12 specs), `speiVoucherPage.assertSpeiVoucher`,
`formHelpers.assertPaymentEmbedDivHasChildren`, `nupayFormPage.validateConsent*`,
`paymentPage.assertLoginTextsArePresent`, `deunaNowPage.assertCvvModalEmitEvents`,
`adminPaymentStrategyPage.nextStepRouting`, `adminReportsPage.countDownloadRequests`,
`referencePayModalPage.assertErrorScreen` (`PI-T1728`: el fallo llegó con «Test ended»),
`clickToPayFormPage.waitForValidationRequest`.

---

### 11. `isVisible()` no espera: detrás de un `waitForTimeout` fijo, el reloj decide el resultado

**Síntoma:** un helper con reintentos que agota todos sus intentos en pocos segundos y
falla con un mensaje propio ("Failed to find X after N attempts"), mientras que en la
corrida que pasó el mismo elemento aparecía perfectamente… más tarde.

**Causa raíz:** `isVisible()`, `isEnabled()`, `isChecked()` y `isEditable()` devuelven el
estado del **instante**, sin reintentar (a diferencia de `expect(locator).toBeVisible()`,
que reintenta hasta su timeout). Combinados con un `waitForTimeout(1000)` delante, el
presupuesto de espera real es ese segundo fijo: si el backend que llena la lista tarda más,
los tres intentos se queman antes de que llegue el dato.

Medido en `RECON-T18`: `GET /merchants/admin/roles/available` tardó **10.8 s** en una
corrida que falló y **34.1 s** en una que pasó. En la que pasó, la opción se encontró
**339 ms después** de que esa respuesta llegara — el test no era más rápido, simplemente
esperó.

**❌ Incorrecto:**

```ts
await this.inputSearchRole.fill(roleName);
await this.page.waitForTimeout(1000); // presupuesto fijo
const isOptionVisible = await roleOption.isVisible().catch(() => false); // no reintenta
```

**✅ Correcto:**

```ts
await this.inputSearchRole.fill(roleName);
const isOptionVisible = await expect(roleOption)
  .toBeVisible({ timeout: ROLE_OPTION_TIMEOUT_MS })
  .then(() => true)
  .catch(() => false);
```

Y por lo mismo, no pongas un `waitForResponse` con `status() === 200` como puerta de
entrada de un helper que ya sabe reintentar: un 504 pasajero del endpoint lo convierte en
fallo duro. Si necesitas la respuesta, pídela best-effort con `.catch(() => null)`.

**Caso real:** `adminUserManagementPage.trySelectRole` (`RECON-T18`, `ADM-T547/T548/T549/T550/T663`).

---

+### 12. En el DateRangePicker del nuevo design system, clickear los dos días del rango sin sincronización entre ellos es una carrera

**Síntoma:** `page.waitForResponse: Timeout exceeded` y el diálogo del calendario
**sigue abierto** tras clickear Confirm, de forma intermitente (~1 de cada 10-15
corridas). En el snapshot del fallo el rango se ve completo y correcto ("sep 1 – 4,
2026"), el botón Confirm está habilitado, y el trace confirma que Playwright ejecutó el
click con éxito ("click action done") — pero el request filtrado nunca sale a red.

**Causa raíz:** el componente escribe cada click de día en un `pendingRange` interno vía
`onSelect`/re-render de React; solo lee ese estado al confirmar. Dos `.click()` seguidos
sin ninguna espera entre ellos llegan con ~20-30ms de diferencia, y ocasionalmente el
segundo click se despacha _antes_ de que React termine de reconciliar el primero. El
resultado no es un error visible: el rango que termina comprometido en el estado interno
del componente no es el que se ve en pantalla un instante después, y Confirm actúa sobre
ese estado corrupto silenciosamente — no cierra el diálogo, no dispara el request.

**Trampa del primer intento de fix:** esperar a que el diálogo muestre "cualquier rango
completo" (regex `\d{1,2}\s*[–-]\s*\d{1,2},\s*\d{4}`) _no alcanza_, porque el estado
intermedio de un solo día ("sep 1 **– 1**, 2026" — mismo día como from y to) también
matchea ese patrón. Ese guard queda satisfecho antes de que el segundo click siquiera
ocurra, y el bug persiste enmascarado.

**❌ Incorrecto** (sin sincronización entre los dos clicks; y un guard que no distingue rango completo de rango de un día):

```ts
await dayFrom.click();
await dayTo.click(); // puede llegar antes de que React procese dayFrom
await expect(dialog).toContainText(/\d{1,2}\s*[–-]\s*\d{1,2},\s*\d{4}/); // matchea "1 – 1, 2026" también
await confirmButton.click();
```

**✅ Correcto** (espera el commit del primer día antes del segundo click, y verifica que el día _final_ específico aparezca — no cualquier par de números):

```ts
await dayFrom.click();
await expect(
  dialog,
  'The calendar did not register the first selected day before clicking the second one'
).toContainText(/\d{1,2}\s*[–-]\s*\d{1,2},\s*\d{4}/, { timeout: 40000 }); // aquí SÍ vale: solo confirma que dayFrom se registró
await dayTo.click();
await expect(
  dialog,
  'The calendar did not register a complete date range before confirming'
).toContainText(new RegExp(`${toDayNumber},\\s*${toYear}`), { timeout: 40000 }); // exige el día final específico
await confirmButton.click();
await expect(dialog, 'The calendar stayed open after confirming').toBeHidden();
```

**Nota adicional:** el calendario abre en el mes actual, así que un día de un mes
anterior no está renderizado (los días `outside` no llevan `data-testid`). Hay que
navegar con el botón `-button-prev-month` antes de poder clickearlo.

**Caso real:** `ADM-T884.spec.ts` / `adminLogsPage.applyDateRange` (filtro de fechas de
audit logs) — diagnosticado con trace real tras ~26 corridas y confirmado en 20/20 tras
el fix. Aplica a cualquier test que seleccione un rango de dos clicks en el
DateRangePicker del nuevo design system.

---

### 13. En tablas con muchas filas que refrescan seguido, preferir un selector CSS combinado y `expect`/`waitFor` sobre una cadena de `.getByTestId().getByTestId()` con `isVisible()`

**Síntoma:** un chequeo de estado dentro de una fila de tabla (`row.getByTestId(x).getByTestId(chip)`) reporta "no visible" durante decenas de segundos, aunque la respuesta de red confirme que el dato correcto ya llegó al navegador y una consulta directa del DOM (`document.querySelector`) encuentra el elemento de inmediato con el estado correcto.

**Causa raíz (parcialmente entendida, mitigación confirmada):** dos causas se combinaron en un caso real:

1. `Locator.isVisible()` es una lectura de estado **puntual, sin reintento interno** — a diferencia de `expect(locator).toBeVisible()`, que hace polling. Si se llama justo después de un click que dispara un refetch (`clickRefresh()` solo espera el click, no el fetch+render que dispara), la comprobación puede caer exactamente en la ventana donde el DOM todavía no reflejó la respuesta ya recibida.
2. Encadenar dos `getByTestId()` sobre un `Locator` (`page.getByTestId(rowId).getByTestId(chipId)`) puede tardar en resolver de forma consistente en una tabla con muchas filas re-renderizando seguido — un selector CSS combinado en una sola cadena (`page.locator('[data-testid="rowId"] [data-testid="chipId"]')`) resolvió el mismo elemento de forma inmediata y consistente en el mismo escenario.

**❌ Incorrecto** (chequeo puntual sin retry, sobre un locator encadenado):

```ts
private statusChip(rowId: string, status: string): Locator {
  return this.page.getByTestId(`row-${rowId}`).getByTestId(`chip-${status}`);
}
// ...
for (let attempt = 1; attempt <= max; attempt++) {
  if (await chip.isVisible().catch(() => false)) return;  // lectura puntual
  await page.waitForTimeout(5000);
  await refreshButton.click();  // no se espera el fetch/render que dispara
}
```

**✅ Correcto** (selector CSS combinado + `waitFor`/`expect` con polling real en cada intento):

```ts
private statusChip(rowId: string, status: string): Locator {
  return this.page.locator(`[data-testid="row-${rowId}"] [data-testid="chip-${status}"]`);
}
// ...
for (let attempt = 1; attempt <= max; attempt++) {
  const ok = await chip.first().waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true).catch(() => false);
  if (ok) return;
  await refreshButton.click();
}
```

**Cómo se diagnosticó:** el trace de red confirmó, en dos corridas reales fallidas, que la respuesta del backend ya traía el estado correcto (`"status":"COMPLETED"`) desde segundos después de la creación — descartando causa de backend/timing real. Un script de exploración con `document.querySelector` encontró el mismo elemento con el testid esperado de inmediato. Solo la cadena de locators de Playwright fallaba en resolverlo de forma oportuna.

**Nota de honestidad:** no se aisló con certeza absoluta cuál de las dos causas (el `isVisible()` puntual o el locator encadenado) era la determinante — el fix aplicó ambas correcciones juntas y se validó con 20+ corridas limpias. Si se necesita aislar la causa exacta en el futuro, probar cada cambio por separado.

**Caso real:** `ADM-T886.spec.ts` / `adminLogsPage.waitForExportStatus` (descarga de export de logs).

---

### 14. Leer un valor "real" de una celda multilínea con `innerText()` puede capturar más de una línea y romper su uso como input

**Síntoma:** un test que lee un valor de la tabla para reusarlo (p. ej. como término de
búsqueda) recibe intermitentemente cero resultados, aunque el valor exista genuinamente
en los datos. El input de búsqueda, inspeccionado en el fallo, contiene el valor esperado
**más un sufijo extraño** (p. ej. `"correo@dominio.com -"` con un guion pegado al final).

**Causa raíz:** varias celdas de estas tablas apilan dos líneas dentro de la misma celda
(p. ej. email en una línea y nombre — o `-` cuando no hay nombre — en la segunda).
`cell.innerText()` devuelve **ambas líneas unidas por un salto de línea**. Al pasar ese
string a `.fill()` sobre un `<input>` de una sola línea, el salto de línea se colapsa en
un espacio, produciendo `"email -"` en vez de `"email"` — un valor que el backend de
búsqueda no matchea contra el dato real.

**❌ Incorrecto** (usa el texto completo de la celda sin considerar que puede tener más de una línea):

```ts
const text = await cell.innerText();
return text.trim(); // puede devolver "email -" si la celda apila una segunda línea
```

**✅ Correcto** (toma explícitamente solo la primera línea):

```ts
const text = await cell.innerText();
const firstLine = text.split('\n')[0]?.trim() ?? '';
expect(firstLine, 'La celda no tiene un valor utilizable').toBeTruthy();
return firstLine;
```

**Nota relacionada:** cuando el valor a reusar viene de una tabla con datos compartidos/en
vivo (no creados por el propio test), leerlo en tiempo real de una fila visible —en vez de
asumir un valor fijo como término de búsqueda— es el patrón correcto para no depender de
qué datos existan en ese momento (ver también la nota sobre merchants compartidos en la
regla 3). El bug de esta regla apareció precisamente al implementar ese patrón correcto.

**Caso real:** `ADM-T888.spec.ts` / `adminLogsPage.getFirstRecordExecutedBy` (búsqueda de
registros de auditoría) — diagnosticado tras confirmar con 40 corridas que el término de
búsqueda hardcodeado (`"getduna"`) fallaba por datos compartidos que cambian (regla
relacionada), y que el fix "leer un valor real" tenía este segundo bug propio hasta
acotarlo a la primera línea. Confirmado en 20/20 corridas tras el fix.

---

### 15. Consultar una fuente eventualmente consistente (Metabase) desde el test: sin `sleep`, con timeout por intento y `toPass`, no `expect.poll`

**Síntoma:** dos modos de fallo sobre la misma consulta. (a) La aserción ve menos filas de
las esperadas (p. ej. solo `create_order` y falta el evento `transaction` de guard). (b) El
test muere por `Test timeout of 240000ms exceeded` dentro del paso que consulta Metabase,
sin ningún error de red: en el trace el `POST /api/card/<id>/query` aparece **sin terminar**,
y en el retry la misma query responde en ~100 ms.

**Causa raíz:** son dos causas que se suman.

1. Guard escribe el evento `transaction` **de forma asíncrona** después de la compra, así
   que una lectura inmediata puede no verlo todavía. Un `sleep(5000)` no lo resuelve:
   adivina una latencia que no se midió y, cuando el evento ya está (el caso habitual), es
   tiempo muerto. Medido en staging: en 4/4 corridas los dos eventos ya estaban en la
   primera consulta, y el paso completo tardó 0.9–1.7 s.
2. `makeRequest` (`requestUtil.ts`) usa `request.newContext()`. **Dentro del runner de
   `@playwright/test` ese contexto no tiene timeout**: hereda `actionTimeout`, que este repo
   no define, y vale 0. Fuera del runner el mismo request corta a los 30 s. Reproducido
   con un servidor local: dentro del runner esperó 50 s sin cortar. Una sola query colgada
   de Metabase se come el timeout entero del test, con o sin `sleep` antes.

Además, `expect.poll` **no sirve** para este caso: si el callback lanza, falla de inmediato
en vez de reintentar (solo reintenta el matcher). `expect(async () => …).toPass()` sí
reintenta tanto los errores como las aserciones fallidas.

**❌ Incorrecto** — una espera fija y una única lectura sin límite de tiempo:

```ts
await sleep(5000); // wait for fraud settings to propagate
const { body, status } = await getPostAuthorizationFlow(orderId);
expect(body.row_count).toBe(2);
```

**❌ También incorrecto** — `expect.poll` se rinde ante el primer request que lanza:

```ts
await expect.poll(async () => (await getPostAuthorizationFlow(orderId)).body.row_count).toBe(2);
```

**✅ Correcto** — cada intento con timeout propio, reintentos con `toPass`, y solo se espera
la _presencia_ de lo que llega asíncrono; los valores se asertan una vez, fuera del polling,
para que un valor incorrecto falle enseguida en vez de reintentar hasta el límite:

```ts
// playwright/support/utils/retries.ts
export async function retryGetPostAuthorizationEvents(
  orderId,
  expectedEvents,
  { timeout = 60_000, attemptTimeout = 15_000 } = {}
) {
  let response;
  await expect(async () => {
    response = await getPostAuthorizationFlow(orderId, attemptTimeout);
    const recordedEvents = (response.body?.data?.rows ?? []).map((row) => row[2]);
    expect(recordedEvents).toEqual(expect.arrayContaining(expectedEvents));
  }).toPass({ intervals: [2_000, 3_000, 5_000], timeout });
  return response!;
}

// en el spec
const { body } = await retryGetPostAuthorizationEvents(orderId, ['create_order', 'transaction']);
const events = body.data.rows.map(([order_id, is_post_auth, event_name]) => ({
  order_id,
  is_post_auth,
  event_name,
}));
expect(events).toHaveLength(2);
expect(events).toEqual(
  expect.arrayContaining([
    { order_id: orderId, event_name: 'create_order', is_post_auth: 'true' },
    { order_id: orderId, event_name: 'transaction', is_post_auth: null },
  ])
);
```

Comprobado con un servidor local que cuelga el primer request: el intento se corta a los
3 s, `toPass` reintenta y el test pasa a los 4 s.

**Alcance pendiente:** el resto de los helpers de Metabase de `requestUtil.ts`
(`getQAVerifyPostTransactionEventQuery`, `getEnqueueAsyncTaskFromDB`, settlements,
transactions…) siguen sin timeout por intento y pueden colgarse igual. Al tocarlos, pasarles
`timeout` (ya lo acepta `RequestOptions`).

**Caso real:** `PI-T1917` / `PI-T1918` (validación de eventos de guard en post-autorización).
La primera corrida tras quitar el `sleep` murió por timeout con la query de Metabase
colgada ~230 s; con el fix, 4/4 corridas pasaron sin retries.

El mismo patrón sin Metabase: `PI-T2027` subía el archivo del lote, esperaba 5 s fijos y
leía el estado una sola vez; el lote seguía en `processing`. `validateBatchResult` ahora
consulta `GetBatch` con `expect.poll` hasta el estado esperado (60 s como máximo), y sirve
igual para `PI-T2028`, `PI-T1977` y `PI-T1979`.

---

### 16. Datos aleatorios que chocan con lo que staging ya tiene, o con un límite del procesador

**Síntoma:** el widget pide OTP ("Para ver tus tarjetas guardadas ingresa el código") a un
test de invitado; o un procesador declina con un error de validación de campo.

**Causa raíz:** `faker.internet.email()` sin más genera un espacio finito (`Kavon7@yahoo.com`)
y staging acumula años de usuarios registrados con esas mismas direcciones: en el trace,
`GET /v2/users?email=` devuelve 200 en el intento que falla y 404 en el que pasa. Al revés,
un UUID completo como nombre llega a 62 caracteres y PagBank rechaza más de 60
(`processor_error 40002 "size must be between 5 and 60"` → `DP-3002`, ~2% de las compras).

**✅ Correcto:** `EmailGenerator.generatePayerEmail()` (`@support/utils/EmailGenerator`):
prefijo hexadecimal único y máximo 45 caracteres, igual que un email de faker.

**Caso real:** `PI-T1078`, `PF-T170` (OTP en vez de formulario de invitado) y `PF-T60`
(PagBank), run 39359528606. Fiserv tiene la variante de montos: ver `withUniqueOrderAmount`.

La misma colisión ocurre al **registrar** usuarios con `${Math.floor(Math.random() * 9999999)}.qa@deuna.com`:
`POST /users/register` responde `409 user already exists` en la primera y única llamada.
Para registrar, `EmailGenerator.generateRegisteredUserEmail()` (16 hex, 29 caracteres). Caso real: `ENTP1-T2132`
(run 40027782172).

Lo mismo con los nombres de red, que son únicos en todo staging y nunca se borran:
`network_${Math.floor(Math.random() * 10000)}_name` respondió `duplicate key value violates
unique constraint "network_name_key"` en `ENTP1-T2261` (run regression-stg-41ba24a8). Con 10.000
valores posibles y cada corrida dejando uno, la colisión es cada vez más probable. Usar
`network_${crypto.randomUUID()}`, como `UserAuthService`; aplicado también a `ENTP1-T2262`.

### 17. Navegar justo después de un click que dispara un guardado

**Síntoma:** un paso posterior no encuentra algo que depende de la configuración que el test
"guardó" (p. ej. el botón de reenviar voucher), y en el trace la petición de guardado
**no existe**, ni siquiera cancelada.

**Causa raíz:** el click de confirmación solo encola la petición; si el test navega a otra
página en los ~300 ms siguientes, la página se descarga antes de que salga.

**✅ Correcto:** registrar `waitForResponse` del guardado antes del click y esperarla (y su
`ok()`) antes de devolver el control. Caso real: `ADM-T507`, `saveEmailNotifications()` en
`adminCommercePage.ts`.

### 18. Un sondeo que espera la condición equivocada, o un estado que solo dura un instante

**Síntoma:** el test lee el recurso enseguida y ve el estado anterior (`unsettled` en vez de
`unsettleable`), o nunca ve el intermedio (`partial_refunded` en vez de `partial_refunding`).

**Causa raíz:** `validateSettlement` reintentaba hasta que _existía_ la fila, que ya existía
desde el purchase; tras el refund devolvía la fila antes de que cambiara de estado. En el
otro caso, `partial_refunding` de Kushki dura 1.8–3.5 s (medido 4/4): asertarlo depende de
cuánto tarde la primera lectura.

**✅ Correcto:** el predicado del sondeo incluye el estado esperado, no solo la presencia.
Un estado transitorio no se asserta por sondeo: se espera el estado final y el intermedio se
busca en el timeline (`expectPaymentStatusInTimeline`, como en `PI-T1383`, `PI-T1845`,
`PI-T1849`). Ojo: el timeline guarda un refund parcial como `refunding`, no como
`partial_refunding`, y a veces pierde eventos (medido en local: 3 de 20 corridas sin
`refunding`, y una sin `captured`; minutos después seguían sin aparecer).

### 18b. Una sesión de CDL compartida por todos los navegadores de la máquina

**Síntoma:** tras recargar el payment link, unas veces se pide el OTP otra vez y otras se ve
directo la tarjeta guardada, sin que importe cuánto se espere antes de recargar.

**Causa raíz:** el CDL restaura la sesión con un `visitorId` de huella de dispositivo
(`POST /users/probe`), y es el mismo para todos los navegadores de la misma máquina
(`1c0cd201…` en los dos intentos de CI del mismo run). Si la sesión ligada a esa huella es
de otro test, el widget pide OTP. Medido en local con 0, 1.5, 3 y 6 s de espera: en cada
caso 1 de 3 conserva la sesión.

**Estado:** sin fix en el test. `ENTP1-T2023` valida justamente si la sesión se mantiene
tras recargar, así que tolerar ambos resultados cambiaría lo que prueba. Mientras la huella
sea compartida, ese caso puede fallar por otro test que corra en la misma máquina.

### 19. Teclear en un formulario que se va a volver a montar

**Síntoma:** el formulario se ve relleno pero no hay `GET /cards/bin/...` y faltan eventos
como `paymentMethodsSelected`.

**Causa raíz:** tras "continuar como invitado" el widget recarga la sesión y re-monta el
formulario de pago; si `/users/me` responde rápido, el test empieza a teclear en el input
viejo ~100 ms antes del re-montaje y los dígitos se pierden.

**✅ Correcto:** esperar la señal de que el formulario está listo (`paymentMethodsStarted`
con `analytics.events.waitForEvent`) antes de teclear. Caso real: `ENTP1-T2018`.

### 20. Proveedores con variantes de UI simultáneas (Mercado Pago)

**Síntoma:** el popup de Mercado Pago se queda en "Elige cómo pagar" con la opción marcada,
o muestra "Revisa los datos antes de pagar" / "... de generar el código de pago" en vez de
"Revisa tu pago".

**Causa raíz:** MP sirve a la vez el checkout clásico y uno rediseñado (medido: 3 de 4
clásico, 1 de 4 rediseñado). En una variante elegir el método navega solo; en la otra hace
falta "Continuar". El rediseño cambia el título de revisión y usa "Generar código".

**✅ Correcto:** el page object espera la pantalla siguiente y, si no llega, completa el paso
que falta; los locators de revisión aceptan ambas variantes (`labelPaymentReview`,
`_selectPaymentMethod` en `mercadoPagoWalletpage.ts`). Nunca pulsar a ciegas un botón de la
pantalla anterior: la siguiente puede no tenerlo.

### 21. Interactuar mientras un popover se está cerrando

**Síntoma:** un click justo después de confirmar un selector (fechas, dropdown) no tiene
efecto; en el log del click aparece `<div data-radix-popper-content-wrapper> ... intercepts
pointer events` seguido de `retrying click action`.

**Causa raíz:** el popover de Radix sigue montado durante su animación de salida y captura
los eventos de puntero. Si el click empieza en esa ventana, se lo traga el popover.

**✅ Correcto:** tras confirmar, `await expect(dialog).toBeHidden()` antes de la siguiente
interacción. Caso real: `ADM-T913` (`selectExportCreatedAtRange`).

### 22. Un `catch` que envuelve también la espera posterior a la acción

**Síntoma:** el error del test no tiene relación con lo que pasó (`page.waitForTimeout:
Target page ... has been closed`, `Could not find button in any frame`).

**Causa raíz:** el `try/catch` pensado para tolerar frames que se desconectan durante la
búsqueda también envolvía la espera del resultado. Cuando esa espera fallaba, el bucle
volvía a buscar el botón y el test fallaba más tarde, en otro sitio.

**✅ Correcto:** el `catch` cubre solo la búsqueda; la espera del resultado va fuera y falla
con su propio mensaje. Caso real: `ENTP1-T2577` (`clickStripe3dsButton`).

### 23. Datos de prueba que empatan en el criterio de orden del backend

**Síntoma:** con dos tarjetas guardadas, a veces el widget preselecciona la segunda y el
test pide cuotas o CVV de la tarjeta equivocada (`installments?bin=450995` en vez de
`407559`).

**Causa raíz:** las tarjetas guardadas se listan por `expiration_date`, y las dos tarjetas
de Mercado Pago del test vencían en 11/27. Con el empate, el orden de la API cambia entre
corridas. Medido en local: 2 de 6 corridas con la segunda tarjeta primero.

**✅ Correcto:** que los datos fijen el orden que el test asume (fechas distintas). Caso
real: `ENTP1-T2304`, `T2352`, `T2584` (`mercadoPagoVisaCardTokenizationSuccessful` → 12/28).
Las tarjetas de Kushki también empatan (`kushkiVisaSuccessfull` y `kushkiMasterCardExitosa`
vencen en 11/27): `ENTP1-T2568` preseleccionaba la Mastercard en 1 de 6 corridas locales;
con la Mastercard guardada en 12/28, 8 de 8. `ENTP1-T2269` (run regression-stg-cca02f6a)
guardaba `mercadopagoMasterCardSuccessfulCO` y `mercadoPagoVisaCardSuccessful`, las dos en
11/27, y asertaba `vaultSaveSuccess` con la Mastercard primero: la Visa va en 12/28.
Las de Nuvei también: `nuveiMasterCardSucessfull` y `nuveiVisaSuccessfull` vencen en 11/27, y
`ENTP1-T2569` (run regression-stg-41ba24a8) mostró `**** 1390` (la Visa) donde esperaba la
Mastercard predeterminada. La Visa va en 12/28.

### 24. Leer el cuerpo de una respuesta que una recarga dejó a medias

**Síntoma:** el test agota su timeout completo (10 min en `ADM-T531`) y la única acción sin
terminar del trace es `body`/`response.json`. En la red, esa respuesta aparece con
`status: 200` pero `content.size: -1` y `receive: -1`.

**Causa raíz:** el `waitForResponse` se armó **antes** del `page.reload()`. Una respuesta
del documento anterior llegó con las cabeceras justo cuando empezaba la recarga, y el
listener la capturó. La recarga descarta su cuerpo y Playwright nunca resuelve ni rechaza
`response.json()`, que además no tiene timeout. Reproducido en aislado: si se recarga entre
las cabeceras y el cuerpo, `json()` queda pendiente indefinidamente; sin recarga se
resuelve.

**✅ Correcto:** recargar primero y armar el listener después, justo antes de la acción
que dispara la petición, para que solo pueda capturar respuestas del documento nuevo. Caso
real: `ADM-T531` (`waitForAvailableReportFile`).

### 25. Salir de la página antes de que el widget abra el popup que termina el pago

**Síntoma:** en un 3DS frictionless, la orden se queda en `pending_3ds` («Pendiente 3DS»)
en el admin. En la red no aparece `three-ds-flow/continue`.

**Causa raíz:** tras recibir `pending_3ds`, el widget abre un popup
(`payments-3ds-wrapper`) que es quien llama a `continue`. El test validaba la respuesta
del purchase y navegaba al admin en la misma pestaña 34 ms después. Si el popup no se había
abierto todavía, la navegación lo impedía. En el intento que pasó, el popup se abrió 91 ms
**después** del `goto`: pasó por suerte. Además, `page.waitForResponse` no ve las peticiones
del popup.

**✅ Correcto:** armar un listener de **contexto** antes de pagar
(`paymentDeunaNowPage.threeDSUrlAwaiter()`) y no salir de la página hasta que llegue el
`continue`:

- `waitForThreeDsFlowToFinish()` espera la llamada sin exigir status, porque en los flujos
  `denied` (PI-T1871, PF-T173) el veredicto lo da el admin;
- `assert3dsResponseSuccess()` exige además el 200.

Medido en local sin el fix: en 8 de 10 specs frictionless el popup se abría 273–325 ms
**después** del `goto` al admin. Con el fix, el `goto` ocurre 3.0–3.4 s después de que se
abra el popup. Casos reales: `PI-T1957`, `PI-T1955`, `PI-T1870`, `PI-T1871`, `PI-T1838`,
`PI-T1868`, `PI-T1923`, `PF-T41`, `PF-T173`, `PF-T174`. Los de Baz (`PI-T1874`,
`PI-T1876`) no lo necesitan: esperan el estado final por API (`retryGetOrderStatus`) antes
de salir.

### 26. Leer la orden justo después del purchase

**Síntoma:** `expect(paymentData.status).toBe('pending_3ds')` recibe `""` aunque la
respuesta del purchase, 50 ms antes, ya decía `pending_3ds`.

**Causa raíz:** el `GET /merchants/orders/{token}` puede devolver la orden sin su pago
todavía (`payment.data.status: ""`, `created_at: 0001-01-01`). El test leía la orden una sola
vez inmediatamente después del purchase.

**✅ Correcto:** `retryGetOrderStatus(emaService, privateKey, orderToken, 'pending_3ds')`
antes de leer `next_action`, como ya hacían `PI-T254`, `PI-T1396` y `PI-T1397`. Caso real:
`PI-T1700` (run 40027782172); mismo código en `PI-T1001` y `PAYM-T2059`.

Navitaire tiene la misma carrera en los dos sentidos (run regression-stg-41ba24a8):

- `PLAT-T1621` leía la orden **antes** de esperar `processed` y asertaba sobre esa copia: el
  primer `GET` traía `status: pending` y `payment.data.customer.email: ""`; el segundo, 59 ms
  después, ya tenía el email. Leerla después de `retryGetOrderStatus`.
- `PLAT-T1599` mandaba el `reverse` 430 ms después del `authorize`, y Navitaire respondió
  `NMS-1002: payment status '' not supported for reverse`. Esperar `processed` antes del
  `reverse`.

### 27. Decidir con `isVisible()` si un panel está abierto cuando está fuera de pantalla

**Síntoma:** el test agota sus 4 minutos en el clic de `#explore_button`, con el log
`element is outside of the viewport` repetido ~450 veces. Los `fill()` anteriores sobre el
mismo panel funcionaron. En la captura, el panel de Configuración de explore está cerrado y el
comercio aparece como «No válido».

**Causa raíz:** `fillMerchantSettingsAndExplore` solo abría el panel si
`inputPublicKey.isVisible()` era `false`. El panel suele abrirse solo al cargar la página, pero
no siempre, y cerrado mantiene sus inputs renderizados fuera de pantalla: `isVisible()` los
da por visibles porque tienen tamaño, y `fill()` no exige que estén dentro del viewport. Solo
`click()` lo exige, así que el fallo aparece en el primer clic dentro del panel. Con el panel
abierto, el DOM tiene `data-baseweb="modal"`; cerrado, no. Seis timeouts en una sola corrida
(`ENTP1-T2066`, `T2100`, `T2420`, `PI-T1159`, `PI-T1959`, `ADM-T746`), y es el mismo síntoma
que se había visto sin explicar en `ENTP1-T2106` y `PI-T2119`.

**✅ Correcto:** comprobar si el elemento está **dentro del viewport** (su `getBoundingClientRect`),
abrir el panel si no lo está y asertarlo con `expect(...).toBeInViewport()`, que falla en
segundos con un mensaje claro en lugar de agotar el test. Caso real:
`ConfigExplorePage.openConfigurationDrawer()`.

**Segunda variante (run regression-stg-41ba24a8):** el drawer puede quedarse **montado** con el
panel fuera de pantalla. Su backdrop (`[data-baseweb="drawer"] > div`) cubre la página y el clic
en `#menu_button` reintenta `<div …> from <div class="">…</div> subtree intercepts pointer
events` hasta agotar el test: cuatro timeouts de 4 minutos (`ENTP1-T2057`, `ENTP1-T2561`,
`PAYM-T1826`, `PI-T1872`). Escape lo cierra y después el menú lo abre bien. A/B simulando el
estado (panel con `translateX(-200%)` y el drawer montado): sin cerrar, 4 de 4 intentos agotan el
test con el mismo log; cerrando con Escape, 4 de 4 pasan. Caso real:
`closeOffScreenConfigurationDrawer()`.

### 28. Recorrer casillas de secciones colapsadas con `isVisible()`

**Síntoma:** después de «desmarcar todo» y marcar 3 permisos nuevos, el usuario sigue viendo
módulos que no están entre los 3. El test falla solo cuando el sorteo aleatorio inicial
incluyó uno de esos módulos.

**Causa raíz:** `uncheckAllPermissions` recorría las 54 casillas con
`if (await locator.isVisible() && await locator.isChecked())`, pero las secciones del
formulario de edición estaban colapsadas: las 54 dieron `false` y no se desmarcó ninguna. El
rol conservaba los 7–8 permisos aleatorios de la creación. En las 3 trazas de `ADM-T567`,
incluida la que pasó, hubo 0 llamadas a `uncheck`.

**✅ Correcto:** expandir las secciones antes de recorrerlas (`expandAllPermissionResources`) y
asertar el estado después de cada clic (`toHaveAttribute('aria-checked', 'false')`). Caso real:
`helpers/permissions.ts` → `uncheckAllPermissions`.

### 29. Datos aleatorios que el backend normaliza

**Síntoma:** una comparación exacta falla con un valor casi idéntico al enviado:
`"last_name": "O'connell"` frente a `"O'Connell"`.

**Causa raíz:** el middleware de Sabre guarda los nombres con solo la primera letra en
mayúscula. `faker.person.lastName()` genera apellidos con mayúsculas internas (`O'Connell`,
`McDermott`, `DuBuque`) en 338 de 4.000 llamadas; con dos pasajeros, `PLAT-T1591` fallaba en
~16 % de las corridas.

**✅ Correcto:** generar los datos ya en la forma en que el backend los guarda, en vez de
relajar la aserción. Caso real: `personName()` en `SabreSoapBodyBuilder` (0 de 12.000 nombres
fuera de forma).

### 30. Login legacy después de un logout que redirige a Auth0

**Síntoma:** después de `logout()`, `loginWithEmailAndPassword` agota 80 s esperando
`input[name='email']`. En la red, el admin redirige a
`login-admin.stg.deuna.com/authorize` y `/u/login`.

**Causa raíz:** sin sesión, el admin a veces envía al login universal de Auth0 en lugar de su
propio formulario. `loginWithEmailAndPassword` solo conoce el formulario legacy.

**✅ Correcto:** detectar la pantalla (`detectAuth0Screen` contra `detectLegacyScreen`) y, si no
es la legacy, pedirla con `login_mode=legacy` (`buildAdminLoginUrl`), como ya hace
`adminAuthenticate`. A/B forzando la pantalla de Auth0: antes, timeout en el `fill`; después,
login en 7.5 s. Caso real: `ADM-T557`.

### 31. Dar por buena la primera lectura no vacía de un recurso que se escribe por partes

**Síntoma:** `Required transaction_visibility object not found` justo después de un purchase
correcto. Consultado minutos después, el mismo `transactionID` sí tiene el evento.

**Causa raíz:** los eventos de visibilidad de una transacción se escriben uno a uno.
`getTransactionVisibilityLogs()` sondea hasta que hay **alguno**, y el test validaba esa primera
respuesta. En `PI-T618` (run regression-stg-41ba24a8) la lectura, 3 s después del purchase,
traía 3 eventos `merchant_admin`. `validateResponse()` exige uno `merchant_user`
(`tv_fraud_provider_analysis`), y llegó después: releído más tarde, la transacción tenía 7 eventos,
4 de ellos `merchant_user`.

**✅ Correcto:** sondear hasta que la validación completa pase, no hasta que haya datos.
`transactionTraceService.waitForValidTransactionVisibilityLogs()` reintenta `validateResponse()`
con `toPass`. Lo usan los 24 specs que antes hacían `get` + `validateResponse`.

### 32. Recorrer una tabla mientras se recarga después de guardar un cambio

**Síntoma:** `No error management row found whose actionable value differs from "true"`
milisegundos después de confirmar un cambio anterior en la misma tabla.

**Causa raíz:** confirmar guarda (`POST /processors/errors`) y recarga la tabla
(`GET /processors/errors/search`), que mientras tanto muestra un skeleton. El segundo recorrido
vio la primera fila todavía visible, pero `.all()` corrió cuando ya estaba el skeleton y
devolvió 0 filas: el bucle no hizo nada y lanzó el error. En el snapshot de ese `.all()` aparece
el skeleton. Caso real: `ADM-T418` (run regression-stg-41ba24a8).

**✅ Correcto:** que la acción que dispara la recarga la espere. `clickConfirmAction()` arma
`waitForResponse` de la búsqueda antes del clic, la espera y aserta la primera fila nueva.

---

## Lo que _no_ es un bug de este repo (para no perder tiempo re-diagnosticándolo)

**Saturación del entorno bajo alta paralelización de CI.** Firma reconocible: la última
actividad de red es la carga de un par de chunks JS estáticos (p. ej. de
`checkout-base`), y después **silencio total de red durante 50+ segundos** — ni siquiera
beacons de telemetría que antes disparaban cada fracción de segundo. Suele coincidir con
una ventana de tiempo donde muchos tests arrancaron casi simultáneamente (los workers de
CI configurados vía `playwright_workers` en `.github/workflows/regression.yml`).
Corrobora del lado del backend: fallos `EMA-4003` ("Payment service is at capacity")
en tests que no pasan por browser. Esto no es arreglable desde el código de un test
individual — no agregues retries ni timeouts más largos pensando que es un bug de tu
test si ves esta firma exacta en el trace.

**Ventanas de degradación del gateway de staging.** Firma: muchos tests fallan en el mismo
minuto con 502/504 en el setup (`Store creation failed: HTTP 502`, `NETWORK_ERROR`), y en
los de UI las llamadas a `api.stg.deuna.io` salen como `net::ERR_FAILED` con un error de
CORS en consola (es la respuesta del gateway sin cabeceras CORS, no un problema de CORS
real). Antes de la caída suele haber un tramo donde `installments`, `orders/{id}` y
`payments-methods` tardan 1–15 s. Un `POST /purchase` que recibe 502 y que el cliente
reintenta puede terminar en `EMA-1002 order is already processed`: el 502 sí la procesó.
Ejemplo: run 39359528606, 02:43 y 02:52–02:55 UTC del 2026-10-20. Otro: run 39633073480,
16:26–16:31 UTC del 2026-10-21 (unos 50 casos), con los refunds asíncronos (Kushki,
procesador genérico) quedándose en `refunding` porque el webhook no llegó en la ventana.

---

## Cómo verificar un diff nuevo contra este documento

Antes de aprobar un test nuevo o modificado, preguntarse:

1. ¿Hay algún `page.waitForResponse`/`waitForRequest` registrado _después_ de la acción
   que dispara la petición? → Patrón 1.
2. ¿Hay algún `.fill()`/`.click()` sobre un locator que podría no estar visible, sin un
   `expect(...).toBeVisible({timeout})` previo? → Patrón 2.
3. ¿El test llama `navigateAndSetup()`/`setUpExplore()` sin pasar `merchantCredentials`?
   → Patrón 3.
4. ¿Hay un locator de texto plano (`text=`, `getByText`) sobre un dropdown/select
   personalizado, sin escoparlo a un contenedor de opciones? → Patrón 4.
5. ¿Se lee una propiedad de un resultado de `.find()` o de una respuesta de API sin
   validar primero que no sea `undefined`? → Patrón 5.
6. ¿Un test visual toma la captura inmediatamente después de verificar solo el primer
   elemento visible, sin confirmar que el contenido debajo también terminó de cargar?
   → Patrón 6.
7. ¿Se aserta sobre `popup.url()`, un visor de PDF o cualquier otro comportamiento que solo
   existe con `--headed`? → Patrón 7.
8. ¿El test depende de un SDK de terceros que un WAF podría rechazar por venir de un
   navegador headless, sin llamar antes a `avoidAntibot(page)`? → Patrón 8.
9. ¿Se escribe una regla de Statsig y se ejercita el flag pocos segundos después, sin
   `pollUntilRuleIsLive`? → Patrón 9.
10. ¿Se llama a un método `async` (un `assert*`, un `validate*`, una acción) sin `await`?
    → Patrón 10.
11. ¿Se decide algo con `isVisible()`/`isChecked()` en vez de `expect(...).toBeVisible()`,
    o hay un `waitForResponse` que exige un `status === 200` para poder continuar?
    → Patrón 11.
12. ¿Se seleccionan los dos días de un `DateRangePicker` sin esperar que React registre
    el primero, o se confirma sin verificar el día final específico? → Patrón 12.
13. ¿Se busca un estado dentro de una tabla con una lectura puntual de `isVisible()` o
    con una cadena de locators susceptible a re-renders? → Patrón 13.
14. ¿Se reutiliza `innerText()` completo de una celda multilínea como valor de entrada,
    en vez de tomar explícitamente la primera línea? → Patrón 14.
15. ¿Hay un `sleep`/`waitForTimeout` antes de consultar Metabase u otra fuente asíncrona,
    un request sin `timeout` propio, o un `expect.poll` sobre una función que puede lanzar?
    → Patrón 15.
