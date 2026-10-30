# Plan: reducir la carga sobre merchant-auth en las regresiones (pool de merchants)

> Snapshot del repo: **2026-09-26**, branch `develop`. Los conteos son un punto en el tiempo:
> re-correr las mediciones de la sección 2 antes de arrancar cada fase.

## 0. TL;DR

Durante las regresiones de staging, merchant-auth responde 504 al crear merchants. Hoy casi cada
spec crea su propio merchant desde cero en su `beforeAll`, y todos los workers lo hacen al mismo
tiempo.

| Métrica                                           | Valor                                        |
| ------------------------------------------------- | -------------------------------------------- |
| Specs totales                                     | 1905                                         |
| Specs que llaman `basicSetup`                     | **1751** (1584 con un solo test)             |
| Llamadas HTTP por merchant                        | 4 (create, login, store, applications) + PSP |
| Workers concurrentes en `regression.yml`          | 20 runner slots × 6 workers = **120**        |
| Specs "merchant + PSP" sin otra mutación          | 1086 → **230 huellas distintas** (−79%)      |
| Specs que mutan config a nivel merchant           | 665 (480 huellas contando las mutaciones)    |
| Specs que leen listas/conteos de todo el merchant | 148 (settlements: 84) → siempre dedicados    |
| Specs de PayPal                                   | 59 → 14 huellas (> cupo de 10 webhooks)      |

El aislamiento de "un merchant por spec" es en buena parte ilusorio: todos los merchants usan las
mismas credenciales sandbox del PSP. Lo que hay que aislar es la **configuración del merchant**, y
eso se puede garantizar declarándola y verificándola en vez de recreándola.

## 1. Diagnóstico

### 1.1 Amplificadores de carga (fase 0 los ataca)

1. **Login admin por merchant.** `createBasicMerchant` hacía login con las mismas credenciales
   (`ADMIN_CREDENTIALS`) cada vez: ~1750 logins idénticos por corrida. El JWT no está atado a un
   merchant (`merchant_id: null`) y dura 72 h (verificado contra staging el 2026-09-29).
2. **Retry sin jitter y sobre un POST no idempotente.** `BaseHttpClient` reintentaba a 1 s fijo,
   así que los 120 workers que reciben un 504 reintentan a la vez. Y reenviaba `POST /merchants`
   tras un 504, cuando el merchant puede haberse creado igual (duplicados y más carga).
3. **Tope de reintentos roto.** La guarda `!error.config.__retryCount` cortaba en 1 reintento
   aunque `retryAttempts` dijera 3 (hallazgo de PAYM-T1928, nunca mergeado en `develop`).
4. **Errores tragados.** Si fallaban store o applications, `createBasicMerchant` devolvía
   "éxito" con `privateKey` vacío y el test fallaba después con un 401 engañoso. Además los
   mensajes eran `Purchase request failed: [object Object]`, sin status.
5. **Retries de Playwright** vuelven a ejecutar el `beforeAll`, así que crean otro merchant.
6. **Staging acumula merchants** sin limpieza (`MerchantRegistry` solo actúa en preprod).
   Hipótesis sin confirmar: degradación de la base de merchant-auth por volumen.

### 1.2 Línea base medida (regresión `release/v40.1`, run 36482251128, 2026-09-28)

Con `scripts/merchant-pool/cli/report.ts` sobre `playwright-json-report-all`:

| Métrica                                                       | Valor  |
| ------------------------------------------------------------- | ------ |
| Intentos de test (incluye retries)                            | 2153   |
| Merchants intentados                                          | 1921   |
| Logins admin                                                  | 1901   |
| Tests fallidos por el setup del merchant                      | **29** |
| — `POST /merchants` sin respuesta (`NETWORK_ERROR`, status 0) | 20     |
| — login admin (`Purchase request failed: [object Object]`)    | 9      |
| Reintentos HTTP en toda la corrida                            | 5      |

**Los 29 fallos ocurrieron entre los minutos 1 y 3** de la corrida; en el minuto 1 arrancaron 399
intentos. Después, cero fallos de setup. El problema es **la ráfaga del arranque**, no el volumen
total, y en esa corrida no se manifestó como 504 sino como requests **sin respuesta**.

Consecuencias:

- `BaseHttpClient` no reintenta errores sin respuesta (solo mira el status HTTP), así que los cambios
  de reintentos de la fase 0 no actúan sobre esos 20 casos. Reintentar a ciegas un `POST /merchants`
  sin respuesta tampoco es seguro: el merchant pudo crearse.
- La caché del token de la fase 0 **baja el total, no el pico**: en el minuto 1 cada worker hace su
  primer login igual que antes. Sí evita los logins de los minutos 2–3, donde cayeron 8 de los 9
  fallos de login.
- Lo que ataca el pico es sacar la creación del arranque de los workers: el job de aprovisionamiento
  previo a la matriz (fase 1) y, como paso intermedio barato, un único login por corrida hecho antes
  de la matriz y pasado a los shards.

## 2. Cómo se midió

Huella de setup por spec = país + tipo (`ConfigMerchant` / `ConfigMerchantCheckout`) + PSPs
pasados a `createPaymentProcessor` + mutadores a nivel merchant (`createNetwork`,
`configureVaultWidget`, `createCampaignMSI/MCI`, `createMerchantRule`, `deletePaymentProcessor`…).

```bash
grep -rlE "basicSetup" playwright/tests --include='*.spec.ts' | wc -l
grep -rhoE "basicSetup[A-Za-z]*\([^)]*\)" playwright/tests --include='*.spec.ts' | sort | uniq -c | sort -rn
```

Limitación: el análisis estático no detecta bien los specs DSL (`setup.merchant.basicSetup`, 37
specs) ni los que crean un merchant sin necesitar uno propio. Esa clasificación requiere revisión.

## 3. Fase 0 — alivio inmediato sin tocar specs (branch `fix/merchant-auth-load-phase0`)

### 3.1 Cambios

| Archivo                                                   | Cambio                                                                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `playwright/support/http/utils/ExpiringTokenCache.ts`     | Caché de token por proceso: lee el `exp` del JWT, renueva 5 min antes, single-flight, no cachea fallos                        |
| `playwright/support/http/services/MerchantAuthService.ts` | Un login admin por worker; si store/applications responden 401 se invalida y se reintenta una vez                             |
| idem                                                      | Store y applications fallan con error explícito (paso + merchantId + status HTTP); valida las keys                            |
| idem                                                      | `POST /merchants` solo se reintenta ante 429/502/503, no ante 504/500/408                                                     |
| idem                                                      | Registro de limpieza de preprod justo después de crear el merchant (antes quedaba sin registrar si fallaba un paso posterior) |
| idem                                                      | Línea `[merchant-provisioning]` por merchant con tiempos por paso y resultado                                                 |
| `playwright/support/http/utils/retryPolicy.ts`            | Backoff exponencial con _full jitter_ (tope 8 s) y `RequestConfig.retryOn` por request                                        |
| `playwright/support/http/BaseHttpClient.ts`               | Se quita la guarda que limitaba a 1 reintento; usa `retryPolicy`                                                              |
| `scripts/merchant-pool/tests/merchant-auth-load.test.ts`  | Tests contra un servidor HTTP local que simula merchant-auth                                                                  |

### 3.2 Efecto esperado

- ~1750 logins por corrida → 1 por **proceso worker**. No es 1 por corrida: son 80 shards × 6
  workers = ~480 procesos en la corrida primaria, más un proceso nuevo cada vez que Playwright
  reinicia un worker tras un test fallido, más las rondas de retry. Orden de magnitud: cientos, no miles.
- Este login (API, `POST /merchants/login`) no es el del project `setup`: `auth.setup.ts` hace login
  en el navegador contra el admin y guarda cookies en `playwright/.auth/user.json`. No se reutiliza.
- Merchant-auth recibe ~20–25% menos llamadas en la creación de merchants (~1750 logins → cientos).
- Los reintentos se reparten en el tiempo en vez de llegar como una segunda ráfaga.
- Un 504 en la creación ya no genera un merchant duplicado.
- Un fallo de store/applications se reporta en el paso que falló, no como un 401 posterior.

### 3.3 Riesgo conocido

Quitar la guarda del tope hace que **todos** los servicios HTTP del repo reintenten hasta 3 veces
(antes 1) ante 408/429/5xx. Con `retryDelay: 1000` y full jitter, las esperas son aleatorias hasta
1 s, 2 s y 4 s: el peor caso por request pasa de 1 s a ~7 s de espera. Durante una caída real esto suma carga: vigilar la primera
regresión y, si hace falta, bajar `retryAttempts` en `ServiceFactory.ts`. Otros POST no
idempotentes (p. ej. `purchaseV2`) siguen reintentando ante 504 como antes; restringirlos es una
decisión aparte porque cambia el comportamiento de specs que hoy pasan gracias a ese retry.

### 3.4 Ambientes: develop, staging y preprod

La suite corre en los tres (`NODE_ENV` + `allowedEnvironments` en `envConfig.ts`). Revisado para
cada cambio:

| Punto                        | develop / staging                               | preprod (efímero, `http://apigw:8080`, 30 workers)                                                                     |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Claims del JWT admin         | `merchant_id: null`, TTL 72 h (verificado)      | No alcanzable desde local. Mismo código de merchant-auth: la clave viene de `PRIVATE_KEY` del ambiente                 |
| Token cacheado vs. reinicios | —                                               | merchant-auth valida el JWT sin estado (firma + `exp`; el `sid` no se consulta): un reinicio no lo invalida            |
| Token rechazado              | 401 (`RespondUnauthorizeJSON`)                  | Igual; el fallback invalida la caché y hace login una vez más                                                          |
| Caché                        | Por proceso y base URL: un worker = un ambiente | Igual                                                                                                                  |
| Limpieza de merchants        | No aplica                                       | `MerchantRegistry` registra justo después de `create`, así un merchant cuyo store/applications falla también se limpia |

**Bug de ambiente en `envConfig.ts` — PR separado, rama `fix/envconfig-keep-node-env`.** El `.env`
se carga con `override: true` y pisa también `NODE_ENV`; los workers de Playwright heredan ese
`process.env`. Solo afecta corridas locales: en CI y preprod `.env` no existe (está en `.gitignore`)
y el ambiente llega como variable (`repository-list.json` → `NODE_ENV: preprod`). Por eso la fase 0
**no depende** de este fix y se separó: es un cambio global en un archivo que importa toda la suite.

A/B del fix (sonda en un worker de Playwright y en un script ts-node, 2026-09-29):

| Caso                                               | Sin fix                                              | Con fix               | ¿Cambia?           |
| -------------------------------------------------- | ---------------------------------------------------- | --------------------- | ------------------ |
| `.env`=develop, shell sin `NODE_ENV` (flujo local) | develop, URLs dev                                    | develop, URLs dev     | No                 |
| CI: `NODE_ENV=staging` exportado, sin `.env`       | staging                                              | staging               | No                 |
| shell `NODE_ENV=staging`, `.env`=develop           | worker: `envConfig` **develop** con URLs **staging** | staging, URLs staging | Sí — es el bug     |
| sin `.env`, shell sin `NODE_ENV`                   | `process.env.NODE_ENV` = `undefined`                 | `'staging'`           | Solo `process.env` |
| ts-node, `.env`=develop, shell sin `NODE_ENV`      | `process.env` develop, `envConfig` staging           | ambos staging         | Solo `process.env` |

Por qué los dos últimos no afectan: en el repo solo `envConfig.ts` lee `process.env.NODE_ENV`; el
resto usa `envConfig.NODE_ENV`, que no cambia. En `node_modules`, Playwright solo lo compara contra
`"production"` (y Babel lo usa para bloques `env` que la config interna de Playwright no tiene), y
`'staging'` es el valor que CI ya exporta en cada regresión.

Aparte, sin corregir: los scripts ts-node ignoran el `NODE_ENV` del `.env` (siempre staging salvo que
se exporte), porque no pasan por el `dotenv` de `playwright.config.ts`. Es previo y no cambia con el fix.

Sin verificar: si algún secreto de AWS inyectado en el contenedor de preprod redefine `NODE_ENV`.

### 3.5 Verificación

```bash
npx ts-node -r tsconfig-paths/register scripts/merchant-pool/tests/merchant-auth-load.test.ts
npx playwright test PAYM-T1928 PI-T1371 PI-T1376 --project=chromium --workers=1 --retries=0
```

- Unit tests: pasan. Contra el `BaseHttpClient` de `develop` el test del tope falla (1 reintento y
  503), así que el test detecta el bug.
- Staging (2026-09-29): 3 merchants en un mismo worker con **un solo login**, 4/4 en verde.
- Develop (2026-09-29): 2 merchants, un solo login, 3/3 en verde, línea con `"env":"develop"`.
- Unit tests con `NODE_ENV` develop, staging y preprod: pasan; el registro real de preprod no se toca.
- Pendiente: una regresión completa desde esta rama, comparada con la línea base de la sección 1.2.
  En CI el stdout de cada test no llega al log del job (reporters blob + html); queda dentro del JSON
  consolidado. Descargar el artefacto y resumirlo:

```bash
gh run download <run-id> -n playwright-json-report-all -D /tmp/run
npx ts-node scripts/merchant-pool/cli/report.ts /tmp/run/test-results.json
```

El script cuenta logins admin, merchants intentados y creados, fallos por paso, percentiles por paso,
reintentos HTTP y errores HTTP contra los endpoints de merchant (lee `stdout`, `stderr` y el error de
cada intento). Sirve también sobre corridas anteriores a la fase 0.

### 3.6 Resultado de la regresión con la fase 0 (run 36587703729, 2026-09-29)

Comparada con la línea base de la sección 1.2 (run 36482251128, `release/v40.1`):

| Métrica                                              | Línea base      | Fase 0         |
| ---------------------------------------------------- | --------------- | -------------- |
| Merchants intentados                                 | 1921            | 1925           |
| Logins admin                                         | 1901            | **638**        |
| Intentos fallidos por setup de merchant              | 29              | **12**         |
| Tests en rojo al final solo por setup                | 2               | **0**          |
| Fallos de store/applications tragados en silencio    | 16              | 0              |
| Reintentos HTTP (todos los servicios)                | 5               | 151            |
| 5xx o sin respuesta en staging (todos los servicios) | 38              | **129**        |
| Tests: expected / unexpected / flaky                 | 1654 / 117 / 43 | 1650 / 84 / 80 |

Lectura:

- Staging estuvo **peor** el día de la fase 0: 3,4 veces más errores, incluidos 41 errores 502 del
  servicio de usuarios, que la fase 0 no toca. Aun así los fallos de setup bajaron de 29 a 12 y
  ninguno dejó un test en rojo.
- Los reintentos rescataron los 502: hubo 17 reintentos de `POST /merchants` por 502 y ningún fallo
  de create terminó en 502.
- 638 logins y no ~480: Playwright abre un proceso worker nuevo tras cada test fallido.
- **Sigue sin resolverse**: los errores sin respuesta (`NETWORK_ERROR`) no se reintentan. Explican
  6 de los 12 fallos (create) y 3 más (login/store). Los fallos se concentraron en los minutos 3–4 y
  16–18.
- **Etiqueta engañosa**: 4 de los 6 fallos marcados `step "store"` fueron del login admin, porque
  el token se pide dentro del paso store. Hay que pedirlo en su propio paso.
- **Flaky 43 → 80**: no hay evidencia de que venga de la fase 0. El aumento se concentra en
  `teams/vault` (4 → 16), `PSP/kushki` y `visual_tests/teams`, con timeouts y fallos de UI; solo 8 de
  los 80 tuvieron algún reintento HTTP en su intento fallido (20 s en total). Con una corrida por
  lado y en días distintos tampoco se puede descartar del todo: repetir la comparación en la próxima
  regresión.

## 4. Fase 1 — pool compartido por huella (branch `feat/merchant-pool-phase1`)

Incluye además los dos ajustes que dejó la regresión de la fase 0 (sección 3.6):

- El token admin es su propio paso (`step "token"`): 4 de los 6 fallos marcados `store` eran logins.
- `RequestConfig.retryOnNoResponse` + `timeout` por request. El login lo activa (reenviarlo no crea
  nada) con 15 s por intento; `POST /merchants` no, porque sin respuesta el merchant pudo crearse.
  El log de error ahora incluye `errorCode`, para separar un timeout (`ECONNABORTED`) de una conexión
  cortada.

### 4.1 Cómo se usa

```ts
test.beforeAll(async ({ emaService, merchantPool }) => {
  const merchant = await merchantPool.acquire('MX_STRIPE'); // mismo objeto que basicSetup
  privateKey = merchant.privateKey;
  publicKey = merchant.publicKey;
  // ...el createPaymentProcessor desaparece: el merchant del pool ya lo trae
});
```

En el DSL: `{ action: 'setup.merchant.acquirePooled', params: { key: 'MX_STRIPE' } }`, que publica
el merchant en el contexto igual que `setup.merchant.basicSetup`.

### 4.2 Piezas

| Archivo                                           | Qué hace                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `playwright/support/merchantPool/MerchantSpec.ts` | Contrato + `fingerprint()`: hash del config completo del processor, no solo del nombre          |
| `playwright/support/merchantPool/catalog.ts`      | `MERCHANT_POOL`: las entradas que CI puede aprovisionar sin ejecutar tests. Hoy: `MX_STRIPE`    |
| `playwright/support/merchantPool/MerchantPool.ts` | Resuelve manifiesto → merchant del propio worker; integrity check; saca del pool lo contaminado |
| `playwright/support/merchantPool/manifest.ts`     | Lee y valida `MERCHANT_POOL_MANIFEST` (versión, ambiente y base URL); escribe con modo 600      |
| `playwright/support/fixtures/merchantPool.ts`     | Fixture de worker `merchantPool` (usable en `beforeAll`) + integrity check automático por test  |
| `scripts/merchant-pool/cli/provision.ts`          | Aprovisiona el catálogo con concurrencia limitada y escribe el manifiesto (sin imprimir claves) |
| github-actions `regression_tests.yml`             | Input `merchant_pool`, job `provision-merchant-pool`, descarga en los shards y borrado al final |

Reglas de resolución:

- **Con manifiesto** (CI): el merchant sale del manifiesto; los workers se reparten las réplicas
  por shard y slot. Un manifiesto de otro ambiente o base URL se rechaza; una entrada con otra
  huella (catálogo cambiado) se ignora.
- **Sin manifiesto** (local, develop, preprod): el worker aprovisiona uno por entrada y lo reusa.
  Un worker corre sus tests de a uno, así que ese merchant nunca recibe dos tests a la vez.
- **Integrity check**: después de cada test que usó el pool, compara la foto de processors (`id`,
  `name`, `enabled`, `deleted_at`, `updated_at`) con la del aprovisionamiento. Si cambió, el test
  falla y el merchant sale del pool. **No ve** cambios de routing, campañas, networks ni config de
  checkout/vault: eso lo garantiza la elegibilidad (4.3).

### 4.3 Qué spec es elegible (corrección del análisis de la sección 2)

La primera estimación (1086 specs "puros") usaba una **lista negra** de mutadores y dejaba pasar
lo que no conocía: por ejemplo `configDynamicRoutingWithRiskified`. Además no veía mutaciones hechas
**desde la UI del admin** (`AdminConnectionsPage`, `AdminPaymentStrategyPage`,
`AdminConsolidatedFlows`, `AdminCommercePage`…), que configuran motores de fraude y estrategias de
pago. Criterio actual:

- **Lista blanca** de llamadas: además de `basicSetup` y `createPaymentProcessor`, solo operaciones
  sobre órdenes (tokenize, purchase, capture, refund, void, get\*, loginAsGuest…).
- Sin páginas de admin salvo login, home y detalle o lista de órdenes.
- Sin helpers locales (`../share/...`), sin DSL (se migra aparte) y con un solo `basicSetup`.

Resultado: **827 specs elegibles en 190 huellas** (59 huellas con ≥5 specs cubren 559).

### 4.4 Piloto `MX_STRIPE` (16 specs, staging, 2026-09-30)

| Corrida                                                        | Merchants creados              | Resultado                                                    |
| -------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| Línea base, sin migrar, 4 workers                              | 16                             | 16/17 (`ENTP1-T2105` falló: intermitente, pasa en las otras) |
| Migrados, modo worker, 4 workers                               | **4**                          | 17/17, integrity en verde                                    |
| Canary: manifiesto de 3 réplicas, 8 workers, `--repeat-each=3` | **0** (3 aprovisionados antes) | 49/49, integrity en verde, sin rechazos por velocidad        |

El canary puso ~16 tests por merchant en paralelo durante ~1 minuto, más presión que la que tendrá
cada réplica en CI. El integrity check no dio falsos positivos después de compras, capturas y
reembolsos reales: `updated_at` de los processors no cambia con la operación normal.

### 4.5 Regresión con el pool en CI (run 36635662176, 2026-09-29, `merchant_pool` activado)

| Métrica                                      | Línea base      | Fase 0         | Fase 1         |
| -------------------------------------------- | --------------- | -------------- | -------------- |
| 5xx o sin respuesta en staging (todos)       | 38              | 129            | **4**          |
| Merchants creados en los shards              | 1921            | 1925           | 1848           |
| Logins admin                                 | 1901            | 638            | 594            |
| Intentos fallidos por setup de merchant      | 29              | 12             | 0              |
| Pico de creación (merchants/min al arrancar) | 328             | 359            | 291            |
| Tests: expected / unexpected / flaky         | 1654 / 117 / 43 | 1650 / 84 / 80 | 1716 / 74 / 24 |

- **El mecanismo funciona en CI**: el job creó 3/3 réplicas antes de la matriz; los 16 specs piloto
  tomaron su merchant del manifiesto (`poolBySource: manifest 16`, reparto 10/4/2), 16/16 en verde,
  0 fallos del integrity check.
- **No atribuible a los cambios**: los 0 fallos de setup y la baja de flaky coinciden con un staging
  mucho más sano ese día (4 errores, todos de `ENTP1-T2210`, webhooks de EMA).
- **El pico de arranque no cambió** (291 merchants/min): con 16 specs en el pool era lo esperado.
  Baja al ampliar el catálogo.
- **Reparto de réplicas desparejo** (10/4/2): la semilla sale del shard y del slot del worker, y los
  specs de una carpeta caen en pocos shards. Mejora posible: elegir la réplica por hash del spec.
- **Falló `cleanup-merchant-pool`**: el rol `E2EDashboardGHAPublisher` no tiene `s3:DeleteObject`.
  El manifiesto de ese run quedó en el bucket y el job marcó el workflow como fallido. Corrección en
  github-actions `fix/merchant-pool-cleanup-without-delete`: revocar sobrescribiendo (el rol tiene
  `PutObject`) y borrar como _best effort_; los shards ignoran un manifiesto revocado (caso
  "Re-run failed jobs"). Pendiente con SRE: `DeleteObject` acotado a `runs/*/merchant-pool/*`,
  confirmar si el bucket tiene versionado y borrar el manifiesto que quedó.
- **Hallazgo aparte (deuda previa, no de estos cambios)**: el stdout de los reportes contiene el
  header `X-Api-Key` (clave privada del merchant) en 1115 intentos y `Authorization: Bearer` (token
  admin, 72 h) en 1342, porque `BaseHttpClient` loguea headers por defecto. Se trata en otra sesión.

### 4.6 Merchants de un solo uso preaprovisionados (`merchant_presupply`)

El pool compartido no alcanza para el pico de arranque: de los 440 merchants creados en los minutos
0–2 del run 36635662176, solo 104 (24%) son de specs elegibles; el resto modifica el merchant por
API (184), desde el admin (54) o tiene otra forma (98). El pico lo forman los primeros archivos de
cada shard, no specs concretos.

Por eso se separa **cuándo** se crea el merchant de **si se comparte**. El job previo a la matriz
crea un merchant simple por spec de cada shard, y `createBasicMerchant` reserva uno del stock de su
shard en lugar de crearlo. Nada se comparte: cada spec sigue teniendo su merchant exclusivo, y
ningún spec cambia.

| Pieza                                       | Qué hace                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `playwright/support/merchantPool/fresh.ts`  | Reserva con archivo exclusivo (`open` con `wx`): los 6 workers de un shard comparten máquina |
| `playwright/support/merchantPool/demand.ts` | Demanda estática por spec (`basicSetup('XX')`, DSL, helpers locales): cubre el 94% real      |
| `scripts/merchant-pool/lib/shards.ts`       | Qué archivos corre cada shard, preguntándole a Playwright (`--list --shard`)                 |
| `scripts/merchant-pool/lib/stock.ts`        | Demanda + 5% de margen + 1 MX de reserva por shard; reparto sin duplicados (ver 4.12)        |
| `scripts/merchant-pool/lib/adaptive.ts`     | Concurrencia adaptativa: arranca en 8, se reduce a la mitad ante fallos (ver 4.12)           |

Reglas: solo se reserva cuando la llamada es estándar (solo `country`); con cualquier otra opción,
sin manifiesto, sin shard (local) o sin stock, se crea como antes. Solo merchants simples: el
checkout es una config de otro servicio y se sigue creando en el test.

Mediciones (staging, desde un laptop):

| Qué                                  | Resultado                                                          |
| ------------------------------------ | ------------------------------------------------------------------ |
| `--list` completo                    | 15 s                                                               |
| 80 × `--list --shard`, 8 en paralelo | 111 s (se solapa con la creación)                                  |
| Creación sostenida, 20 en paralelo   | 2614/min, p99 767 ms, 0 fallos (200 merchants)                     |
| Escalones 5 / 10 / 20 / 40           | 662 / 1185 / 1578 / 3145 por min, 0 fallos                         |
| `@fraud` en 4 shards, punta a punta  | 16 s; 58 creados, 55 repartidos                                    |
| Shard 1 de `@fraud` con el stock     | 0 merchants creados en los workers, 12 reservados, todos distintos |

Reproducir el reparto de Playwright a partir de un solo `--list` no coincidió (37/80 shards): se usan
los listados reales, que no dependen de la versión.

**Pendiente de observar**: `PF-T159`/`PF-T160` fallaron 2 de 16 veces con stock (`DP-8001 error
evaluating fraud processor`) y 0 de 16 sin él; en un A/B de 10 contra 10 con orden invertido pasaron
todas. No es significativo, pero hay que contar los `DP-8001` en la primera regresión con el stock.

En CI (run 36728800226, 2026-09-30): el job de aprovisionamiento tardó 170 s en total (52 s de
setup del repo, 17 s de AWS CLI, 94 s de aprovisionamiento, dominado por los 80 `--list`). Creó
**2106 merchants en 22 s (5765/min) sin un solo fallo** y repartió 2074 entre los 80 shards.

Regresión completa con `merchant_pool` + `merchant_presupply` (run 36728800226, 2026-09-30):

| Métrica                              | Fase 1 (run 36635662176) | Con stock       |
| ------------------------------------ | ------------------------ | --------------- |
| Merchants creados por los workers    | 1848                     | **238**         |
| Merchants tomados del stock          | —                        | ~1684           |
| Merchants creados en los minutos 0–2 | 440                      | **8**           |
| Fallos de setup en los minutos 0–2   | 0                        | 0               |
| Fallos de setup en total             | 0                        | 38              |
| `DP-8001` (intentos)                 | 15                       | 9               |
| Tests: expected / unexpected / flaky | 1716 / 74 / 24           | 1633 / 131 / 50 |

- **El pico de creación del arranque desapareció**: 429 merchants reservados del stock en los
  minutos 0–2 contra 8 creados.
- **Los 38 fallos de setup no son del stock**: 36 caen en los minutos 15–18, un incidente de
  staging de ~4 min con ~330 5xx en merchant-auth y errores también en `users`, `payments`, `wallet`
  y `trace`. No lo causó carga nuestra: en esos minutos hubo 34 y 51 logins y 57 y 68 tests
  arrancando, contra 109 logins y 389 tests en el minuto 1, que pasó sin errores.
- **74 de los 131 `unexpected` empezaron dentro de esa ventana.** De los 57 restantes ninguno es un
  fallo de setup; solo 10 habían pasado el día anterior (OTP de clickToPay, un rechazo de getnet,
  UI de admin).
- **`DP-8001` queda descartado como efecto del stock**: aparece en las cuatro corridas (4, 10, 15 y
  9 intentos) y `PF-T159`/`PF-T160` fallan en todas.
- Los 238 merchants creados por los workers son el fallback: llamadas no estándar, demanda que el
  análisis estático no ve y retries que agotan el margen del shard.

### 4.7 PayPal

26 specs en `wallet/paypal_wallet`, cada uno crea inline un merchant MX con checkout + un processor
PayPal (un webhook) y lo borra en `afterAll`: 19 `paypalWalletProcessor`, 6 con cuotas, 2 USD.
6 modifican el merchant (campañas de cuotas PayPal, config de pagos, conexiones desde el admin).

- **Pool por corrida** (recomendado primero): entradas `PAYPAL_WALLET_MX`, `PAYPAL_WALLET_INSTALLMENTS_MX`
  con pocas réplicas; el job de limpieza borra esos processors al terminar y el janitor
  (`feat/paypal-webhook-janitor`) recoge lo que el backend deje huérfano. Consumo: de ~26 webhooks
  por corrida a réplicas + los 6 dedicados.
- **Pool persistente** (0 webhooks por corrida): viable porque a un merchant existente se le puede
  emitir un par de claves nuevo en cada corrida (verificado), así que solo se guardan IDs. Costo:
  ocupa slots de forma permanente del cupo de 10 que comparten todos los ambientes.
- **Orden en el job previo**: janitor (liberar huérfanos) → pool compartido → stock de un solo uso.

### 4.8 Orden de despliegue

1. Mergear e2e-testing (`feat/merchant-pool-phase1`): sin manifiesto todo corre en modo worker.
2. Mergear github-actions (`feat/merchant-pool-provisioning`): el input nace apagado.
3. `regression.yml` expone el input `merchant_pool` (apagado por defecto) y lo pasa al workflow
   reutilizable; se activa marcando la casilla al lanzar la regresión. Se agregó después del merge
   de github-actions (PR #148); agregarlo antes rompía la regresión: el workflow reutilizable se llama en `@main` y rechaza inputs que no conoce.
4. `merchant_presupply` sigue el mismo camino: primero github-actions (el input nace apagado), después
   el input en `regression.yml`, y la primera regresión con la casilla marcada se compara contra una
   sin ella (`DP-8001`, fallos de setup, pico de arranque).
5. Medir con `scripts/merchant-pool/cli/report.ts` (campos `pool*`) y ampliar el catálogo por
   huella, empezando por las 59 con ≥5 specs.

Qué no hacer:

- `globalSetup` de Playwright: corre una vez por shard (80 veces).
- Mergear la rama `QA-4303-paypal-webhooks` tal cual: usa `SaveConfig`, que la regla
  `no-saveconfig-credentials` bloquea.
- Migrar un spec a ojo: usar el filtro de 4.3 y, ante la duda, dejarlo con `basicSetup`.

## 5. Fase 2 — incorporar mutaciones deterministas a la huella

Network, vault widget, campañas con parámetros fijos, etc. pasan a formar parte del `MerchantSpec`
y se aplican una vez al aprovisionar. Objetivo: 1751 merchants por corrida → ~480.
Siguen dedicados: specs que leen listas/conteos del merchant (settlements, paginación), specs con
`deletePaymentProcessor` y specs cuyo objetivo es la mutación misma.

## 6. Fase 3 — pool persistente para recursos externos escasos

Hoy solo PayPal (cupo de 10 webhooks por app REST, compartido entre entornos; el janitor
está en la rama `feat/paypal-webhook-janitor`, sin push). Merchants de larga vida por huella (~4 de
PayPal Wallet), guardados en un registro y reconciliados al inicio de la corrida: comprobar que
existen y que su configuración coincide; si no, recrearlos. Consumo: 0 webhooks por corrida.

## 7. Resultado esperado

| Etapa                     | Merchants creados por corrida                                  | Forma de la carga                     |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| Línea base (medida)       | 1921, 1901 logins                                              | Ráfaga al arrancar los shards         |
| Fase 0 (medida)           | 1925, 638 logins                                               | Reintentos repartidos, sin duplicados |
| Fase 1, piloto            | −16 specs: 3 aprovisionados antes de la matriz                 | Escalonada, antes de la matriz        |
| Fase 1, catálogo completo | 827 specs elegibles → ~190 huellas × réplicas + ~920 dedicados | Escalonada para los elegibles         |
| Fase 2                    | Incorpora mutaciones deterministas a la huella                 | Escalonada                            |
| Fase 3                    | 0 para recursos escasos (PayPal)                               | —                                     |

### 4.9 Ampliar el catálogo: herramientas y tanda 1

| Script                                     | Qué hace                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `scripts/merchant-pool/cli/eligibility.ts` | Specs elegibles agrupados por MerchantSpec, con clave sugerida (`--min`, `--key`, `--json`)                        |
| `scripts/merchant-pool/cli/migrate.ts`     | Codemod de un grupo; exige que la entrada del catálogo tenga los mismos objetos de config                          |
| `scripts/merchant-pool/cli/canary.ts`      | Modo worker + réplicas con `--repeat-each`; pasa sin fallos de integridad ni fallos sin explicar por la línea base |

Criterio del clasificador (más estricto que la sección 4.3): además de la lista blanca y las páginas
de admin, bloquean el DSL, los processors pasados por variable, el `basicSetup` fuera de `beforeAll`
y un tipo de merchant ambiguo. Resultado: **766 specs elegibles en 176 grupos**; 54 grupos con ≥5
specs cubren 513. El codemod además deja fuera los specs que usan el id que devuelve
`createPaymentProcessor`.

Tanda 1 (~1 réplica cada 8 specs), admitida por canary (`--workers 8 --repeat 2`, línea base: run
36635662176):

| Entrada                               | Specs | Réplicas | Canary                                                           |
| ------------------------------------- | ----- | -------- | ---------------------------------------------------------------- |
| `KUSHKI_PROCESSOR_MX`                 | 24    | 4        | PASS: worker 24/24, compartido 48/48 (dos veces)                 |
| `KUSHKI_PROCESSOR_AUTHORIZE_MX`       | 18    | 3        | PASS: worker 18/18, compartido 36/36 (dos veces)                 |
| `CIELO_AUTHORIZE_BR`                  | 15    | 3        | PASS: worker 15/15, compartido 30/30                             |
| `CONEKTA_PROCESSOR_AUTHORIZE_MX`      | —     | —        | Fuera: sus 37 specs son `test.fixme`, no hay nada que verificar  |
| `MERCADO_PAGO_PROCESSOR_AUTHORIZE_MX` | —     | —        | Fuera: compartido 19/34, rechazos `DP-8001`/`DP-4200` en ráfagas |

57 specs → 10 merchants (más los 16 de `MX_STRIPE` → 3).

Lo que el canary encontró y cambió en las herramientas:

- **Specs que no corren**: con Conekta el canary dio PASS con 0/20 en verde, porque contaba los
  skips como fallos y la línea base los "explicaba". Ahora el clasificador bloquea `fixme`/`skip` y
  el canary da `INCONCLUSIVE` si algún spec no tomó su merchant del pool o no pasó al menos una vez.
- **Usuarios en un merchant compartido**: `PI-T1032` (Cielo, usuario registrado) genera su email una
  vez por módulo; la segunda ejecución sobre el mismo merchant encontró el usuario ya registrado. Los
  usuarios pertenecen al merchant: registrar usuarios y guardar tarjetas salió de la lista blanca.
  Nuevo universo elegible: **563 specs en 156 grupos** (42 grupos con ≥5 specs cubren 334).
- **Velocidad sobre un mismo merchant**: Mercado Pago rechaza compras concurrentes sobre el mismo
  merchant con la misma tarjeta (en modo worker, 17/17). En la primera corrida pasó 34/34: depende de
  la carga, que es lo que lo hace peligroso de compartir. Cualquier PSP nuevo pasa por el canary con
  la misma concurrencia antes de entrar.

### 4.10 Un login de admin por shard (project `setup`)

Con los merchants fuera del arranque, la ráfaga que quedaba era el login del admin: cada proceso
worker hacía el suyo. En el run 37711877316 hubo 116 logins en el primer minuto, con 43 errores 5xx
de merchant-auth.

`auth.setup.ts` ahora hace, además del login de la UI, **un** login por API y deja el token en
`playwright/.auth/admin-api-token.json` (ignorado por git, permisos 600, con la base URL). Los
workers lo usan en lugar de hacer el suyo. Playwright corre el `setup` antes que los workers, así
que no hace falta coordinación entre procesos.

- Si el login del `setup` falla, el `setup` no falla (bloquearía el shard): deja un warning y los
  workers hacen su propio login, como antes.
- El token solo se usa si la base URL coincide y no está por vencer. Un 401 lo descarta para ese
  worker, que hace su propio login.
- Sin `setup` (`--no-deps`, `only_preprod`, el job de aprovisionamiento) cada proceso hace su login.

Alternativas descartadas: reusar el `localStorage.token` de `user.json` (acopla la API a cómo
guarda la sesión admin-ff y deja de servir con Auth0) y un archivo compartido con lock entre
procesos (más piezas para resolver lo que Playwright ya ordena). Verificado en merchant-auth
(2026-10-01): el `sid` del JWT solo se usa para auditoría y no hay revocación de sesiones, así que
compartir el token entre procesos no agrega un modo de falla.

Staging: 12 specs con 6 workers → 14/14 en verde, **1 login** (el del `setup`).

### 4.11 PayPal en el pool compartido (`PAYPAL_WALLET_CHECKOUT_MX`)

En el run 37725483883 los specs de PayPal fallaron con `DP-9999 WEBHOOK_NUMBER_LIMIT_EXCEEDED`:
cada spec crea un processor PayPal, cada processor registra un webhook, y la app REST de sandbox
admite 10 entre todos los ambientes. El backend responde **HTTP 200** con ese error, así que el
fallo aparece más adelante en el checkout y no al crear el processor (bug a reportar a payments).

Entrada nueva: merchant MX con checkout + `paypalWalletProcessor`, 1 réplica, 12 specs migrados
(express, non express y two steps). Con el pool una corrida usa **1 webhook** para esos 12 specs en
lugar de 12, y los 6 specs que modifican el merchant siguen creando el suyo.

Un processor del pool no se borra al terminar cada spec, así que ocuparía su slot hasta que alguien
lo borre. La entrada lleva `releaseProcessorsAfterRun: true`, y los processors se liberan en los
dos modos:

| Modo                   | Quién libera                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Worker (local, sin CI) | El fixture `merchantPool` al cerrar el worker; si falla, el `globalTeardown`                    |
| Manifiesto (CI)        | `merchant-pool:release --manifest m.json` en el job de limpieza, antes de revocar el manifiesto |

Primer canary (2026-10-08): modo worker 12/12, compartido 22/24. Los 2 fallos (`ENTP1-T2087`,
`ENTP1-T2286`) no eran del merchant compartido: el popup de PayPal se abría antes de que el test lo
escuchara (`waitForEvent('popup')` registrado en el paso siguiente al clic). El trace lo muestra:
página de PayPal cargada a las 15:04:38.8, listener registrado a las 15:04:43.7. Con 6 workers el
clic tarda 12–18 s en lugar de 1–5 s, y el popup gana la carrera. En la misma ventana otros specs
sobre el mismo merchant pasaron ese paso en 2–5 s. Se movió el listener antes del clic en los 12
specs con ese patrón (patrón 1 de `docs/flaky-test-patterns.md`), como ya hacía `ENTP1-T2088`.
Canary repetido con el arreglo (2026-10-08): **`PASS`**, modo worker 12/12 y compartido 24/24
(6 workers sobre 1 merchant, 1 webhook). Quedan con el mismo race, fuera de este cambio, 5 specs de `payment_widget_flow`
(`ENTP1-T2090`, `T2131`, `T2427`, `PI-T2005`, `PI-T2006`).

Fuera de la entrada quedan: `ENTP1-T2089` (email generado a nivel de `describe`), los 6 que mutan
(`ENTP1-T2419`, `T2319`, `T2132`, `T2289`, `PI-T2005`, `PI-T2006`), cuotas, cash, USD y `T2300`.

### 4.12 Stock más liviano

Atribución del stock del run 37725483883: demanda 1787, reservados 1619, **205 sin usar por specs
en `fixme`/`skip`**, 135 sin usar por otros motivos y 172 creados en el momento porque la demanda
estática no los vio.

- **Archivos que no corren**: el `--list` en JSON trae `expectedStatus` por test. Un archivo con
  todos sus tests en `skipped` nunca corre su `beforeAll`, así que no pide merchant
  (`runnableSpecFiles` en `lib/shards.ts`). Hoy son 202 archivos y no hay ninguno con solo parte de
  sus tests en skip. Un `test.skip()` en tiempo de ejecución no se ve aquí; deja un merchant sin usar.
- **Margen del 10% al 5%**: el margen cubría menos de lo que se desperdiciaba; lo que falta se
  sigue creando en el momento, como antes del stock.
- **Concurrencia de 20 a 8**: los `--list` por shard tardan ~70 s igual, así que crear los merchants
  más despacio no alarga el job y merchant-auth recibe un tercio del ritmo.

Ningún spec cambia: si el stock no alcanza, el merchant se crea en el test.

### 4.13 Regresión con la tanda 2 (run 37805161207, 2026-10-08)

| Métrica                                     | Run 37725483883 (tanda 1) | Tanda 2                                 |
| ------------------------------------------- | ------------------------- | --------------------------------------- |
| Stock creado por el job                     | ~2100                     | 1741 (en 39 s, 8 en paralelo, 0 fallos) |
| Tomados del stock / creados por workers     | 1619 / 258                | 1538 / 228                              |
| Stock sin usar                              | ~440                      | **203**                                 |
| Merchants en total (stock + pool + workers) | ~2430                     | **~1983**                               |
| Primera pasada: unexpected / flaky          | 141 / 77                  | **53 / 50**                             |
| Fallos finales (tras el retry)              | 38                        | 37 (1 nuevo: getnet DP-4500)            |
| Intentos con `DP-9999`                      | 21                        | 6, todos de specs con processor propio  |
| Errores HTTP de merchant-auth               | —                         | 2 (502)                                 |

- **PayPal**: 1 webhook para los 12 specs del pool, liberado por el job de limpieza
  (`released 6dfe7847…`). Los 6 intentos con `DP-9999` son de `ENTP1-T2090`, `T2131` y `T2132`,
  que siguen creando su processor; todos los specs de PayPal corren en el mismo shard y en esa ventana
  coincidieron con el webhook de otro ambiente.
- **Specs del pool**: 12/12 en verde al final. `ENTP1-T2318` y `T2288` pasaron en el retry interno;
  `ENTP1-T2085` falló sus 2 intentos (`order-details-title` no visible en el admin tras el pago) y pasó
  en la ronda de retry. Sin causa confirmada: el trace quedó en S3, y el mismo paso pasó en el
  canary (4/4 sobre el pool) y para los otros specs del pool sobre el mismo merchant a la misma hora.
- El paso de liberación imprimía el body del DELETE del processor, credenciales del PSP incluidas:
  `deletePaymentProcessor` ya no registra el body de la respuesta.

### 4.14 PayPal: el resto de los grupos (2026-10-09)

En la tanda 2 los 6 intentos con `DP-9999` salieron de specs que todavía creaban su processor. Todos
los specs de PayPal caen en el mismo shard y corren juntos, así que cada processor propio compite
por los 10 slots en el mismo minuto.

| Entrada                                  | Specs                           | Canary (worker / compartido)                 |
| ---------------------------------------- | ------------------------------- | -------------------------------------------- |
| `PAYPAL_WALLET_CHECKOUT_MX` (+ T2089)    | 13                              | `PASS` 13/13 · 26/26                         |
| `PAYPAL_WALLET_INSTALLMENTS_CHECKOUT_MX` | `ENTP1-T2320`, `T2301`          | `PASS` 2/2 · 4/4                             |
| PayPal + cash (rechazado)                | `ENTP1-T2090`, `T2427`, `T2298` | 3/3 · 4/6 y 3/3 · 0/6: ver `lib/rejected.ts` |

- PayPal + cash: `T2298` y `T2427` inician sesión con la misma cuenta compradora de PayPal y la
  vaultean en el merchant; compartiéndolo se colgaron juntos en el login/consentimiento. `T2090`
  falla su screenshot de la vista de redirección (el toast no siempre está), igual que en las
  regresiones.
- Los specs que registran usuario generan el email en cada `beforeAll`: sobre un merchant compartido,
  un email a nivel de módulo se registraría dos veces si el mismo worker repite el archivo.
- Race del popup arreglado también en `payment_widget_flow` (`T2090`, `T2131`, `T2427`, `PI-T2005`,
  `PI-T2006`).
- `globalTeardown` conserva en el registro los processors que no pudo borrar, para que los reintente
  la corrida siguiente (sirve en local: en CI el runner es efímero).
- Quedan con processor propio: los 6 que mutan el merchant, `T2131` (cuotas + cash), `T2300` y los 3
  de PayPal + cash. El janitor (`feat/paypal-webhook-janitor`) libera los huérfanos antes de la matriz.

### 4.15 Tanda 3 (2026-10-09)

17 grupos con 8 o más specs elegibles, ~1 réplica cada 6 specs, cada uno con su canary
(`--workers 2 --shared-workers 6 --repeat 2`):

- **Entran 16 entradas, 159 specs en 35 merchants** (124 merchants menos por corrida): PayU, Rede,
  Stripe, OpenPay y Nuvei authorize; Transbank y Transbank Mall CL; Getnet authorize BR; Kushki
  authorize CL/PE/CO y purchase PE/CO/CL; Cybersource authorize PE; OpenPay MX.
- **PayPal ACDC authorize: rechazado.** Compartido 14/22, 8 rechazos `DP-20000` en 19 segundos; en
  modo worker 10/11. Mismo patrón que Mercado Pago (velocidad por merchant).
- **Getnet authorize BR**: el primer canary falló (`PAYM-T2113` no encontró el input de tarjeta;
  `PAYM-T2125` vio `voiding`, ya fallaba en la regresión); el segundo dio `PASS` 10/10 · 19/20 con
  solo `T2125`.
- **Cybersource authorize PE**: `PI-T1248` es rechazado (`DP-6003`) también en su versión de develop,
  solo y con su propio merchant: queda fuera del pool. Los otros 7: `PASS` 7/7 · 14/14.
- No migrados por el codemod (forma no reconocida): 1 spec en cada grupo de Kushki authorize CL/PE/CO
  y purchase PE/CO/CL.

### 4.16 Tanda 4 (2026-10-09)

Todos los grupos elegibles que quedaban con 3 o más specs (51), ~1 réplica cada 6 specs. Los
canaries corrieron en 2 colas paralelas, cada una en su worktree (comparten `test-results`, `.auth` y
el registro de processors); toda entrada que falló se repitió sola antes de decidir.

- **Entran 49 entradas.** 41 dieron `PASS` en la primera pasada y 8 al repetirlas solas: Kushki 3DS MX
  y Redsys 3DS ES (sus fallos fueron timeouts simultáneos en las dos colas, con `ERR_TIMED_OUT` contra
  el CDN de staging), Pagbank BR, Paymentez EC, MX_STRIPE y los 3 grupos de Cybersource.
- **Rechazados (`lib/rejected.ts`)**: Prisma purchase AR (rechazos `DP-4200` simultáneos al
  compartir) y Prisma authorize AR (rechazos también con un merchant por worker).
- **Fuera del pool**: `PI-T905`, `PI-T1087` y `PI-T1259` (Cybersource los rechaza también sin pool;
  develop ya los marcó `@fixme_preprod`), y los specs que el codemod no migra (crean un segundo
  merchant o usan el id del processor): Kueski, PayU Efecty y PayU PSE checkout quedaron sin specs y se
  quitaron del catálogo.
- **No intentados**: Mercado Pago y PayPal ACDC purchase (velocidad por merchant) y Fiserv (cert
  responde 400 desde el 2026-10-07).
- **Corrección del clasificador**: la regla de helpers locales solo miraba imports relativos.
  `ENTP1-T2105` (en `MX_STRIPE` desde la fase 1) importa `setElementsConfig` como `@tests/...` y crea
  una configuración de checkout en el merchant: con dos copias a la vez falló con `CHKCONFIG-4106
configuration already exists`. La regla ahora incluye `@tests/`; `T2105` y otros 5 specs con helpers
  de `@tests/` salieron del pool.
- `merchant-pool:migrate` encuentra los specs de una entrada por país, tipo y configs, no por la clave
  sugerida (`MX_STRIPE` tiene otro nombre; `paymentezProcessor` y `paymentezProcessorEC` sugerían la
  misma clave).

**Pool completo tras las tandas 3 y 4: 68 entradas, 444 specs en 101 merchants: 343 merchants
menos por corrida** (antes de la tanda 3 eran 71).

### 4.17 Tanda 5 (2026-10-19)

Con la lista blanca casi agotada (209 elegibles en 100 grupos, solo 30 specs en grupos de 4 o más),
la tanda 5 abre tres bolsas que el clasificador o el codemod dejaban afuera. Los canaries corrieron
sin reporte base (las regresiones viven en `github-actions`): cualquier fallo contaba.

- **Merchant sin processors (`NO_PROCESSOR_MX`, 28 specs, 3 réplicas).** Specs que solo crean
  órdenes, payment links o las expiran (`api_ema/expire-order`, `api_ema/paymentlink`,
  `api_orders/paymentlink`, más PI-T1371, PLAT-T1524, PI-T1715, ADM-T462 y ADM-T690). Sus `order_id`
  salen de `crypto.randomUUID()` o del builder, así que no chocan. El clasificador ya no bloquea "creates
  no processor": un spec sin processors es un grupo propio con clave `NO_PROCESSOR_<país>`. Canary
  `PASS` 28/28 worker, 56/56 compartido.
- **El listado de órdenes del admin deja de ser de solo lectura.** En un merchant compartido muestra
  las órdenes de todos los specs (ADM-T505 le saca captura). Ningún spec del pool lo usaba.
- **Codemod: `ConfigMerchant(Checkout)` declarado dentro del `beforeAll`.** Era el "leftover merchant
  creation" que dejó afuera a Kueski y PayU Efecty/PSE checkout en la tanda 4. Entran
  `KUESKI_PROCESSOR_CHECKOUT_MX`, `PAYU_EFECTY_PROCESSOR_CHECKOUT_CO` y `PAYU_PSE_PROCESSOR_CHECKOUT_CO`
  (3 specs y 1 réplica cada una, `PASS` 3/3 y 6/6), y specs sueltos de entradas existentes:
  ENTP1-T2140 (Cash checkout MX), ENTP1-T2552/T2554 (Cash EC).
- **Codemod: id del processor.** Con una entrada de un solo processor,
  `processorId = await apiCallNewman.createPaymentProcessor(...)` pasa a
  `processorId = merchant.processorIds[0]` (los refunds de Kushki lo pasan a
  `sendWebhookRefundIfPreprod`). Con varios processors sigue sin migrarse: el orden de las llamadas
  del spec no dice nada del orden de la entrada. Entran 11 refunds/voids de Kushki (MX, CL, PE, CO);
  las 8 entradas Kushki tocadas dieron `PASS`.
- **Specs rechazados por id (`REJECTED_SPECS` en `lib/rejected.ts`).** El clasificador volvió a
  proponer PI-T905, PI-T1087, PI-T1248 y PI-T1259, que la tanda 4 había dejado afuera a mano. Ahora
  quedan bloqueados por id, junto con PAYM-T2180 (BAZ authorize): espera `DP-7101` y recibe `DP-4303`
  también con merchant propio (3 de 5 corridas sin pool).
- **Cash checkout MX**: el primer canary dio `FAIL` (9/18 compartido); sin T2140 dio 1/8 en worker con
  7 `Tearing down "context" exceeded the test timeout` simultáneos, o sea, la máquina local tras varios
  canaries seguidos. Repetido con T2140 y 4 workers: `PASS` 9/9 y 18/18.

**Tanda 5: 4 entradas nuevas y 51 specs más (37 en entradas nuevas con 6 merchants, 14 en entradas
existentes): 45 merchants menos por corrida. Pool: 72 entradas, 495 specs en 107 merchants, 388
merchants menos por corrida.** Los specs del pool tienen demanda 0 en `demand.ts`, así que salen
solos del stock de `merchant_presupply`.

Lo que queda (`eligibility --min 3`): 178 elegibles en 83 grupos, 32 specs en grupos de 3 o más,
casi todos Mercado Pago / PayPal ACDC purchase (velocidad por merchant) y Fiserv (cert roto). Bajar
más requiere cambiar specs, no el catálogo: los que registran usuarios con email por módulo, y las
configuraciones de merchant deterministas (vault, network, campañas) como receta de la entrada.

### 4.18 Sesión de admin compartida y flujos sin inputs (2026-10-19)

**Problema.** Cada shard corría el proyecto `setup` (dependencia de `chromium`), que hace un login de
admin por UI y otro por API: 80 a la vez al arrancar la corrida primaria y otra vez en cada una de las
3 rondas de reintento (hasta 80 shards cada una). Un login por UI cuesta 5 llamadas a merchant-auth
(`POST /merchants/login`, `/v2/merchants-tokens/me` ×2, `/v2/generate-custom-token` y
`/merchants-all`, que con superadmin lista todos los merchants del ambiente).

**Por qué se puede compartir** (verificado en staging):

- `user.json` es solo el JWT de merchant-auth en `localStorage` (`token`, ~72 h, `sid`) más cookies de
  analítica: no hay refresh token.
- El logout (48 specs, p. ej. ADM-T462) borra el token en el navegador y no llama a ningún endpoint;
  después de correr ADM-T462 el mismo token respondió 200 en `/v2/merchants-tokens/me`.
- Hoy los 6 workers de un shard ya comparten `user.json`, y 80 logins simultáneos del mismo usuario
  conviven sin invalidarse entre sí.
- Ningún spec reescribe `user.json`; las suites de seguridad Auth0 usan `AUTH0_SECURITY_AUTH_FILE`.

**Cómo funciona.**

- Job `admin-session` de `regression_tests.yml`: corre `--project=setup` una vez,
  `merchant-pool:admin-session` arma el paquete (`playwright/support/adminSession.ts`: sesión UI, token
  API, ambiente, modo de login), comprueba con `fetch` que merchant-auth acepta los dos tokens (el
  cliente HTTP del repo imprime headers, el Bearer incluido) y lo sube a S3 cifrado.
- Los shards de la corrida primaria y de los reintentos lo descargan (`ADMIN_SESSION_BUNDLE`) y
  `auth.setup.ts` lo instala sin abrir navegador.
- **Sin fallback**: un paquete de otro ambiente, vencido (<2 h), roto, revocado o de Auth0 (que puede
  rotar refresh tokens) hace fallar `setup`, antes de cualquier test. Si el login falla en
  `admin-session`, ningún shard arranca. Sin `ADMIN_SESSION_BUNDLE` (corridas locales) todo sigue
  igual.
- `cleanup-admin-session` sobrescribe el paquete al terminar la última ronda. merchant-auth no revoca,
  así que el token vence solo (~72 h); esto borra la única copia guardada. Un "Re-run failed jobs"
  posterior falla en `setup` diciendo que hay que relanzar todos los jobs.
- Requiere `report_transport: s3` (el único caller, `regression.yml`, ya lo usa): un token de
  superadmin no viaja como artefacto.

**Verificado en local contra staging**: shard simulado con `playwright/.auth` vacío y el paquete:
ADM-T462 (logout), ADM-T461, ADM-T489 y ADM-T690 pasan con 0 `POST /merchants/login` en los traces y
0 logins por API. Un paquete de otro ambiente hace fallar `setup` y el spec no corre.

**Pool y stock sin inputs.** `merchant_pool` y `merchant_presupply` dejan de ser casillas: siempre
corren. Se apagan en `scripts/merchant-pool/config.ts` (un commit, que vale para la rama cuyas
pruebas corren). En `github-actions` siguen declarados como obsoletos e ignorados solo porque las ramas
`release/*` ya cortadas los pasan y un input no declarado rompe la llamada; se borran cuando ninguna
rama viva los pase.

**Orden de despliegue**: primero `github-actions` (los inputs pasan a ignorados con default `true` y
nace `admin-session`), después e2e-testing (deja de pasarlos). Al revés, el pool quedaría apagado
hasta el segundo merge, porque el default de `github-actions` hoy es `false`.

### 4.19 Tanda 5b: usuarios propios y recetas (2026-10-19)

Con la lista blanca agotada, dos reglas nuevas del clasificador, cada una con su evidencia:

- **Usuarios con email aleatorio.** `registerUser*`, `setCreditCardForUser`, `setCard` y `deleteCard`
  se permiten si el spec genera su email al azar (`Math.random`, `faker`, `randomUUID`,
  `EmailGenerator`, `Date.now`) y no tiene ningún email literal: cada archivo registra un usuario
  propio. El choque de PI-T1032 en la tanda 1 venía del `--repeat-each` del canary, que repite un
  módulo en el mismo worker y reusa su email de módulo; una regresión corre cada archivo una vez y un
  reintento abre otro worker con otro email. Estas entradas se verifican con `canary --repeat 1`.
  **23 specs, todos en entradas existentes** (NO_PROCESSOR_MX 9, Cielo ×4, Rede ×4, Kushki CO,
  Kushki 3DS MX, Globalpay CO, Paymentez EC): 23 merchants menos sin crear ninguno. Canaries `PASS`
  salvo dos casos ajenos al pool: PI-T967/T969/T1066 (Rede, ya en el pool) fallan el refund
  (`refunding`) también solos con merchant propio, y PI-T1955 da timeout también sin pool (2/4) →
  `REJECTED_SPECS`.
- **Recetas (`MerchantSpec.setup`).** `createNetwork()` y `createCheckoutConfigVault()` sin argumentos
  extra escriben siempre lo mismo; aplicados por varios specs a la vez en un merchant compartido
  competirían (CHKCONFIG-4106). La entrada los aplica una vez al aprovisionar y el codemod los quita
  del spec; forman parte de la huella, así que una entrada con receta nunca entrega el merchant de la
  entrada simple. **10 entradas, 25 specs, 10 merchants** (Nupay BR con network, 7 specs; 9 grupos de
  vault + network de Cybersource, Stripe, Worldpay, dLocal y Kushki).
  - **El orden importa**: la primera versión aplicaba la receta después de los processors y dLocal PE
    respondió 422 en todos los purchases, también en modo worker; los specs originales pasaban sin
    pool. Con la receta antes de los processors (como hacían los specs de vault) las 10 entradas dieron
    `PASS`, Nupay incluido (que la aplicaba después).
  - PAYM-T2190 (Cybersource PE vault) da 422 también sin pool (develop lo marca `@fixme_preprod`) →
    `REJECTED_SPECS`.

**Descartados con evidencia:** configuración de vault widget (cada spec arma la suya: decimales,
`user_experience`, `checkout_modules`; compartirla requiere huella por valor, la fase 2 de la sección
5), campañas de Mercado Pago (prueban la campaña misma y MP rechaza por velocidad) y Click to Pay
(límite de enrolamientos por dispositivo).

**Pool tras la tanda 5b: 82 entradas, 543 specs en 117 merchants: 426 merchants menos por corrida**
(388 antes de esta tanda). Los 48 specs nuevos salen además del stock de `merchant_presupply`.
