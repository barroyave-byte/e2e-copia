# Evaluación técnica: Lightpanda como browser principal de la suite E2E

**Fecha del análisis:** 2026-09-07
**Ventana de ejecución de la PoC:** 16:32 – 17:25 (UTC-05, America/Bogota) · 21:32 – 22:25 UTC
**Repositorio:** `e2e-testing` · rama `fix/preprod-kushki-visa`
**Autor:** Julián Novoa (jnovoa@deuna.com), con asistencia de Claude Code
**Audiencia:** Líderes de QA / Ingeniería y staff técnico
**Estado del documento:** Conclusiones finales — evaluación cerrada

---

## 1. Resumen ejecutivo

Se evaluó [Lightpanda](https://github.com/lightpanda-io/browser) como reemplazo de Chromium en la suite E2E de DEUNA, motivado por el alto consumo de recursos de Chromium y la dificultad de escalar el volumen de casos E2E actuales.

**Conclusión: a hoy (2026-09-07) Lightpanda no es una opción viable como browser principal de nuestra suite, ni como proyecto paralelo.**

El motivo no es la dificultad de configuración —que resultó ser la parte fácil— sino tres limitaciones funcionales que hacen inejecutable la mayor parte del catálogo de pruebas, sumado a que **la ventaja de performance que promete el proyecto no se reproduce en nuestro workload real: en la medición hecha, Chromium fue 2× más rápido y consumió menos memoria que Lightpanda.**

| Dimensión                      | Veredicto            | Evidencia resumida                                                                             |
| ------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------- |
| **Estabilidad**                | ❌ No apta           | Caso `ENTP1-T2308` falla por timeout; traces de Playwright lanzan excepción en cada navegación |
| **Compatibilidad funcional**   | ❌ Bloqueante        | Sin soporte de iframes; sin motor de layout; sin `browserContext` (rompe `storageState`)       |
| **Rapidez**                    | ❌ Peor que Chromium | 1055 ms vs 469 ms por página en app real                                                       |
| **Consumo de recursos**        | ❌ Sin ganancia      | 215 MB vs 192 MB de pico RSS                                                                   |
| **Facilidad de configuración** | ✅ Alta              | Binario único / imagen Docker oficial; trivial en Dockerfile y GitHub Actions                  |
| **Escalabilidad**              | ❌ No aplica         | Sin ganancia de recursos, no habilita más workers ni más casos                                 |

---

## 2. Contexto y objetivo

La suite actual ejecuta sobre Chromium headless (Playwright 1.60), con ~100+ procesadores de pago cubiertos, flujos de checkout, admin, fraude y analítica. El consumo de recursos de Chromium se identificó como limitante para aumentar el paralelismo y el volumen de casos ejecutados por corrida.

Lightpanda se presenta como _"the headless browser built from scratch for AI agents and automation"_: escrito en Zig, con V8 para JavaScript, sin motor de renderizado gráfico ni de layout CSS. Su README publicita, frente a Chrome sobre 100 páginas:

- Memoria: 123 MB vs 2 GB (**16× menos**)
- Tiempo de ejecución: 5 s vs 46 s (**9× más rápido**)

El objetivo de esta evaluación fue verificar empíricamente si esas cifras se sostienen en nuestro contexto y si la suite es portable a ese runtime.

---

## 3. Metodología

**Versión evaluada:** `lightpanda 1.0.0-nightly.9231+b21ec6085`, binario `lightpanda-aarch64-macos` (82 MB), descargado del release `nightly` del repositorio oficial.

**Entorno:** macOS 14.5, Apple Silicon (arm64), Node.js v22.22.3, Playwright 1.60.0, entorno de pruebas `staging`.

**Integración:** Lightpanda expone un servidor CDP vía `lightpanda serve --host 127.0.0.1 --port 9222`. Playwright se conectó con `chromium.connectOverCDP()`.

Se ejecutaron cuatro tandas de pruebas:

1. **Sonda de capacidades** sobre un fixture HTML controlado (botón, formulario oculto por CSS, dropdown anidado, iframe hijo) — 26 verificaciones de API de Playwright.
2. **Sonda de semántica de visibilidad e iframes** sobre el mismo fixture — 9 verificaciones dirigidas.
3. **Carga de aplicaciones reales** de staging (`admin.stg.deuna.io`, `explore.stg.deuna.io`), comparando Lightpanda contra Chromium.
4. **Ejecución del caso real `ENTP1-T2308`** (`playwright/tests/teams/checkout/modules/ENTP1-T2308.spec.ts`), completo, contra ambos browsers.

Para la tanda 4 se parcheó temporalmente el fixture `browser` en `playwright/support/fixtures/globalAfterEach.ts` para enrutar por CDP. **El parche fue revertido; el repositorio quedó limpio (`git status` sin cambios).**

---

## 4. Resultado de la prueba de concepto: `ENTP1-T2308`

Caso elegido: _Checkout - Billing Pattern assert fallback option for states without cities_. Es representativo del núcleo de la suite: configuración de merchant por API, login en admin vía `storageState`, apertura del Payment Widget (iframe Zoid), interacción con dropdowns dependientes y pago con tarjeta Kushki.

|                    | Chromium                        | Lightpanda                                                   |
| ------------------ | ------------------------------- | ------------------------------------------------------------ |
| **Resultado**      | ✅ PASS                         | ❌ FAIL                                                      |
| **Duración**       | **30.3 s** (42.9 s incl. setup) | **240 s timeout × 2 reintentos = 8.4 min**                   |
| **Punto de falla** | —                               | Primer step: `gotoAdmin()` / `setMerchantIdSessionStorage()` |

### Diagnóstico de la falla

El setup por API funcionó sin problemas (creación de merchant, tokenización de orden, alta del procesador Kushki — todo HTTP puro, independiente del browser). La aplicación de admin **sí renderizó el React correctamente** (el snapshot de Playwright muestra el formulario de login completo), pero el test quedó bloqueado en la pantalla de login en lugar de la sesión autenticada.

La causa está en el log de Lightpanda, que reporta explícitamente los comandos CDP no implementados:

```
not_implemented  Target.createBrowserContext          (6 ocurrencias)
not_implemented  Browser.grantPermissions             (6)
not_implemented  Emulation.setDeviceMetricsOverride   (6)
not_implemented  Emulation.setUserAgentOverride       (5)
not_implemented  addScriptOnNewDocument (runImmediately) (3)
not_implemented  Emulation.setLocaleOverride          (3)
not_implemented  Browser.setDownloadBehavior          (3)
```

**Implicación crítica:** sin `Target.createBrowserContext`, la llamada `newContext({ storageState })` es un no-op. El archivo `playwright/.auth/user.json` —del que dependen los proyectos `chromium` y `visual-testing` en `playwright.config.ts`— nunca se aplica. Y como `addScriptOnNewDocument` con `runImmediately` tampoco está implementado, no existe workaround vía `addInitScript()` para inyectar la sesión manualmente.

Adicionalmente, el instrumentado de tracing de Playwright falla en cada navegación:

```
TypeError: Cannot read properties of undefined (reading 'prototype')
    at new Streamer (anonymous:55:58)
    at frameSnapshotStreamer (anonymous:537:30)
```

---

## 5. Bloqueadores funcionales

### 5.1 Sin soporte de iframes — bloqueador principal

Es la limitación más grave para nuestro caso de uso. Sonda sobre un iframe hijo simple:

| Verificación                                       | Chromium        | Lightpanda               |
| -------------------------------------------------- | --------------- | ------------------------ |
| `page.frames()`                                    | 2 (root + hijo) | **1** (solo root)        |
| `elementHandle.contentFrame()`                     | Frame           | **null**                 |
| `iframe.contentDocument` (vía `evaluate`)          | Document        | **"NO contentDocument"** |
| `frameLocator('#zoid').locator(...).textContent()` | OK              | **Timeout 30000 ms**     |

El Payment Widget de DEUNA se renderiza dentro de un iframe de Zoid. **53 archivos del repositorio usan `frameLocator` o `contentFrame`.** Todo el dominio de checkout, payment widget, 3DS y validación de PSPs es directamente inejecutable — no "inestable" o "flaky": imposible.

### 5.2 Sin motor de layout

Lightpanda no implementa layout CSS. `boundingBox()` devuelve valores sintéticos sin relación con la página real:

```
<h1 id="title">   → { x: 0, y: 40, width: 5,  height: 5  }   (stub fijo de 5×5)
<button id="save"> → { x: 0, y: 0,  width: 0,  height: 0  }   (elemento visible reportado como 0×0)
```

Queda inutilizable todo lo que depende de geometría: `scrollIntoView`, `hover`, `toBeInViewport`, coordenadas de mouse, detección de solapamiento de elementos y las comprobaciones de _actionability_ de Playwright que dependen de posición.

**Aspecto positivo a destacar:** la visibilidad por cascada CSS sí funciona correctamente, mejor de lo esperado. Se verificó que `display:none` heredado se evalúa bien —incluido el patrón dropdown `.dropdown.open .options`— y que un click sobre un elemento oculto correctamente hace timeout en lugar de dar un falso positivo. Es un punto sólido de la implementación, pero no compensa la ausencia de geometría.

### 5.3 Screenshots y artefactos de depuración inservibles

El screenshot de fallo se genera (1280×720 PNG válido), pero es un **render de solo texto plano**: sin CSS aplicado, sin imágenes, sin layout, sin colores de marca. Los elementos aparecen apilados como líneas de texto en la esquina superior izquierda.

Consecuencias:

- El proyecto `visual-testing` y todo el tag `@visual` quedan sin sentido: no hay comparación visual posible.
- La depuración de fallos se degrada severamente: hoy el screenshot de fallo es la primera herramienta de diagnóstico del equipo.
- Los traces de Playwright directamente no se generan (excepción en `frameSnapshotStreamer`).

---

## 6. Medición de performance y recursos

Prueba: 20 cargas secuenciales de `https://explore.stg.deuna.io/` (aplicación real de staging), `waitUntil: 'load'`, mismo script para ambos browsers, medición de pico de RSS agregado de los procesos del browser.

| Métrica                   | Chromium headless | Lightpanda | Diferencia                     |
| ------------------------- | ----------------- | ---------- | ------------------------------ |
| Tiempo total (20 páginas) | **9.38 s**        | 21.11 s    | Lightpanda **2.25× más lento** |
| Tiempo medio por página   | **469 ms**        | 1055 ms    | Lightpanda **2.25× más lento** |
| Mediana por página        | **345 ms**        | 983 ms     | Lightpanda **2.85× más lento** |
| Pico de RSS               | **192.1 MB**      | 214.6 MB   | Lightpanda **12% más memoria** |

Comparación puntual de carga inicial (primera visita, incluye handshake):

| Página                 | Chromium | Lightpanda |
| ---------------------- | -------- | ---------- |
| `admin.stg.deuna.io`   | 1663 ms  | 3370 ms    |
| `explore.stg.deuna.io` | 1222 ms  | 2557 ms    |

### Por qué no se reproducen las cifras del README

El benchmark publicado (9× / 16×) mide **páginas locales triviales**, donde el costo dominante es el arranque del proceso del browser: ahí Chromium paga un precio alto que Lightpanda evita.

En nuestra suite el perfil es el opuesto:

1. **Domina la latencia de red**: staging, APIs de merchants, PSPs externos, tokenización.
2. **Domina el setup por test**: creación de merchant, alta de procesador, tokenización de orden — todo HTTP, indiferente al browser.
3. **El arranque del browser se amortiza**: un browser sirve muchos tests dentro de un worker.

**Conclusión de negocio: el cuello de botella de la suite no es el browser.** Cambiar de runtime no toca las dos causas reales del tiempo de corrida.

En términos de fidelidad de DOM sobre apps reales, la paridad sí fue buena (`explore`: 349 vs 348 nodos, 8 vs 8 inputs, texto renderizado equivalente; cero `pageerror` en ambos). El motor de JS es sólido; lo que falta es todo lo demás.

---

## 7. Facilidad de configuración

Irónicamente, esta es la dimensión más favorable, y por eso conviene dejar claro que **no es el motivo del rechazo**.

| Frente                | Dificultad      | Detalle                                                                                                                                                                                                           |
| --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instalación local** | 🟢 Trivial      | Binario único sin dependencias (`curl` + `chmod +x`). También Homebrew y AUR.                                                                                                                                     |
| **Dockerfile**        | 🟢 Trivial      | Imagen oficial `lightpanda/browser:nightly`. Sustituiría `npx playwright install-deps chromium` + `npx playwright install chromium` por un `COPY --from=`. Imagen resultante más liviana, sin `install-deps`.     |
| **GitHub Actions**    | 🟢 Trivial      | Se declara como _service container_ en `regression.yml`, exponiendo el puerto 9222.                                                                                                                               |
| **Playwright Test**   | 🟡 Con fricción | `use.connectOptions` habla el protocolo Playwright, **no CDP**, así que no se puede apuntar desde `playwright.config.ts`. Hay que sobrescribir el fixture `browser` con `chromium.connectOverCDP()` (~10 líneas). |

El costo oculto de esa fricción: al conectar por CDP, **dejan de aplicarse** `launchOptions` (incluido nuestro `--unsafely-treat-insecure-origin-as-secure`), `devices['Desktop Chrome']`, `permissions` y `storageState` definidos en `playwright.config.ts`.

---

## 8. Recomendación

**No adoptar Lightpanda**, ni como browser principal ni como proyecto paralelo para un subconjunto de la suite.

El subconjunto de casos que hoy podría ejecutar —sin iframes, sin autenticación por `storageState`, sin geometría, sin screenshots ni traces— es tan reducido que el costo de mantener dos runtimes, dos configuraciones de CI y dos conjuntos de expectativas supera cualquier ahorro. Y el ahorro medido, en nuestro workload, es **negativo**.

### Dónde sí atacar el problema de escalabilidad

Si el objetivo real es aumentar el volumen de casos E2E ejecutables por corrida, las palancas con retorno real son:

1. **`fullyParallel: false` en `playwright.config.ts`** — hoy los archivos de test no corren en paralelo entre sí. Es probablemente la palanca de mayor impacto disponible.
2. **Shardeo en GitHub Actions** — repartir la suite entre varios runners.
3. **Setup por test vía API** — continuar la migración Postman/Newman → Axios ya en curso, que reduce el tiempo previo a cada caso.
4. **Perfilado de una corrida de regresión real** — medir dónde se va efectivamente el tiempo antes de invertir en optimizaciones. La evidencia de esta evaluación sugiere que el browser no es el culpable.

### Criterios para reabrir la evaluación

Reevaluar Lightpanda cuando **ambas** condiciones se cumplan:

- ✅ Soporte de iframes (`page.frames()`, `frameLocator`, `contentFrame`)
- ✅ `Target.createBrowserContext` implementado (habilita `storageState` y aislamiento de contextos)

Sin esas dos, ninguna otra mejora del proyecto nos resulta aprovechable. Deseables adicionales para una adopción amplia: motor de layout (`boundingBox` real), `addScriptOnNewDocument`, y compatibilidad con el tracing de Playwright.

---

## 9. Anexo — Reproducción

```bash
# 1. Descargar y levantar Lightpanda
curl -sL -o lightpanda \
  https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-aarch64-macos
chmod +x lightpanda
./lightpanda serve --host 127.0.0.1 --port 9222

# 2. Enrutar Playwright por CDP: sobrescribir el fixture `browser`
#    en playwright/support/fixtures/globalAfterEach.ts
#
#    browser: async ({}, use) => {
#      const b = await chromium.connectOverCDP(process.env.LP_CDP);
#      await use(b as any);
#      await b.close().catch(() => {});
#    },

# 3. Ejecutar el caso
LP_CDP=http://127.0.0.1:9222 \
  npx playwright test ENTP1-T2308 --project=chromium --reporter=list --workers=1

# 4. Baseline con Chromium (revertir el parche del fixture primero)
npx playwright test ENTP1-T2308 --project=chromium --reporter=list --workers=1
```

### Cronología de la ejecución (UTC-05)

| Hora           | Evento                                                            |
| -------------- | ----------------------------------------------------------------- |
| 16:32:15       | Servidor CDP de Lightpanda levantado en `127.0.0.1:9222`          |
| 16:33 – 16:36  | Sondas de capacidades y semántica de visibilidad / iframes        |
| 16:37:02       | Inicio de `ENTP1-T2308` sobre Lightpanda                          |
| 16:41:10       | Timeout del intento 1 (240 s); inicio del reintento               |
| 16:45          | Timeout del reintento — **FAIL**, 8.4 min totales                 |
| ~17:10 – 17:20 | Benchmark de 20 cargas: Lightpanda y Chromium                     |
| ~17:22         | `ENTP1-T2308` sobre Chromium — **PASS** en 30.3 s                 |
| 17:25          | Limpieza: parche revertido, servidor detenido, repositorio limpio |

---

_Informe generado el 2026-09-07 a las 17:33 (UTC-05) sobre mediciones tomadas en la misma sesión. Todas las cifras provienen de ejecuciones reales contra el entorno de staging de DEUNA; ninguna es estimada._
