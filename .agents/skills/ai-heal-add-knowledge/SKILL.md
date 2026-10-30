---
name: ai-heal-add-knowledge
description: >
  Ingresa de forma narrativa un caso de prueba fallido (de regresiones anteriores) y su solución
  al knowledge base del sistema ai-heal (jul-IA-N), generando una entrada JSON válida en
  jul-ia-n/knowledge/database/. Usa esta skill SIEMPRE que el usuario quiera "agregar al knowledge
  base", "registrar/recordar un caso", "guardar una solución conocida", "mapear un bug recurrente",
  o describa en lenguaje natural un test que falló antes y cómo se arregló (aunque no diga
  explícitamente "knowledge base"). También aplica a frases como "este test fallaba por X y lo
  resolví con Y, guardalo para la próxima".
---

# Ingesta narrativa al knowledge base de ai-heal

Esta skill convierte una descripción en prosa de un fallo de regresión + su resolución en una
**entrada del knowledge base (KB)** del auto-heal (jul-IA-N). El KB se consulta en runtime para
asesorar al orquestador/subagentes con "prior art" y, si el match es muy fuerte, hacer short-circuit
del razonamiento LLM. Por eso la calidad de cada entrada importa.

Trabaja en **español** con el usuario, pero los **valores de enums y los paths van en inglés** (como
en el código).

---

## Antes de empezar: el modelo mental (no te saltes esto)

La distinción más importante de todo el schema:

- **`symptom`** = cómo SE VE el fallo (mensaje de error, paso donde rompe, flujo). Es lo que se
  **embebe** para el match semántico. Escríbelo como leería un fallo real, NO incluyas la solución.
- **`recipe`** = QUÉ HACER para resolverlo, como **directiva legible** para el agente (no un diff
  literal). Aquí sí va la solución.

Si mezclas los dos, el matching se degrada (busca por síntoma) y el agente recibe una guía pobre.

Regla de oro del KB: **no escribas recetas que "pongan el test en verde" ocultando un bug**. Si el
caso fue un bug de producto, la receta debe decir "esto es bug de servicio → flag, no tocar el test".

---

## Flujo

### 1. Reúne la narrativa

Pide al usuario lo que falte (no asumas):

- **Qué test(s)**: los `testCaseId` reales afectados (ej. `PI-T1666`, `ENTP1-T2169`). Crítico: el
  short-circuit solo dispara con match EXACTO de `testCaseId`, así que sin IDs reales la entrada
  solo sirve como asesora difusa.
- **Síntoma/error**: qué falló y dónde (el mensaje, el step, el flujo).
- **Root cause**: por qué pasaba.
- **Solución**: qué se hizo para arreglarlo.
- **Release** en que apareció / se confirmó, y **PR/commit** si existe.

### 2. Enriquece desde el repo (opcional pero recomendado)

Si te dan `testCaseId`, localiza el spec real para precisar el síntoma y validar nombres:

```bash
git ls-files | grep -i "<TESTCASEID>"
```

Lee el spec (y su page-object/helper si aplica) para que `symptom` y `recipe` citen lo correcto
(nombres de aserciones, helpers, endpoints). Si te dan un PR/commit, puedes mirarlo con `gh`/`git`
para afinar la receta.

### 3. Mapea a los campos del schema

El schema vive en `jul-ia-n/schemas/knowledgeEntry.ts` (léelo si dudas). Campos:

| Campo                                       | Qué poner                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `id`                                        | slug kebab-case, **= nombre del archivo** (ej. `nupay-request-race-condition`). |
| `title`                                     | título corto y humano.                                                          |
| `symptom`                                   | síntoma observable para embedding (ver modelo mental).                          |
| `testCaseIds`                               | `string[]` con los IDs reales afectados. Pídelos; no inventes.                  |
| `rootCauseCategory`                         | uno del enum (abajo) o `null`.                                                  |
| `tags`                                      | `string[]`, ej. `["@nupay", "race-condition"]`.                                 |
| `recipe`                                    | la solución como directiva (ver modelo mental).                                 |
| `subagentHint`                              | subagente que suele resolverlo (enum abajo) o `null`.                           |
| `prRefs`                                    | `string[]` con links a PR/commit.                                               |
| `firstSeenRelease` / `lastConfirmedRelease` | strings o `null`.                                                               |
| `createdAt`                                 | fecha ISO (`YYYY-MM-DD`) de hoy.                                                |
| `status`                                    | `"active"` (usa `"deprecated"` para retirar sin borrar).                        |
| `replayableFix`                             | **normalmente `null`** (ver sección dedicada).                                  |

**Enum `rootCauseCategory`**: `credentials`, `setup_failure`, `psp_decline`, `rate_limit`,
`invalid_payload`, `invalid_test_data`, `three_ds_flow`, `external_redirect`, `ui_element_missing`,
`visual_regression`, `assertion_mismatch`, `infra`, `flaky`, `unknown`.

**Enum `subagentHint`**: `credentialsFixer`, `setupFixer`, `rateLimitHandler`, `testDataFixer`,
`payloadFixer`, `cardFixer`, `threeDsInvestigator`, `redirectInvestigator`, `selectorFixer`,
`snapshotUpdater`, `assertFixer`, `infraMarker`, `flakyMarker`, `humanEscalator`,
`serviceInvestigator`.

Usa como plantilla el ejemplo real: `jul-ia-n/knowledge/database/nupay-request-race-condition.json`.

### 4. Escribe el archivo

Crea `jul-ia-n/knowledge/database/<id>.json` con todos los campos (incluye los `null`/`[]`
explícitos para que sea legible). Si ya existe un archivo con ese `id`, **actualízalo** en vez de
duplicar (revisa primero el directorio).

### 5. Valida

Corre el loader/retrieval para confirmar que parsea (warnea entradas inválidas) y que matchea:

```bash
npm run ai-heal:kb -- --query "<un par de frases del síntoma>"
```

Debe aparecer tu entrada en los resultados. Si no parsea, el comando lo reporta — corrige y reintenta.

---

## `replayableFix`: cuándo (casi nunca) usarlo

`replayableFix` habilita el tier más agresivo de short-circuit (saltarse orquestador **y** subagente,
aplicar el parche directo y solo verificar). Por eso es peligroso y de uso restringido:

- **Úsalo SOLO** para fixes **mecánicos y estables del repo**: agregar un tag `@flaky`, subir
  `test.retry`, cambios que no dependen de números de línea concretos.
- **NO lo uses** para fixes con código atado a líneas/estructura que se "pudre" cuando el repo
  cambia (ej. reescribir lógica dentro de un page-object). Esos casos van con `subagentHint` y
  `replayableFix: null` → el subagente regenera el fix con criterio.
- Solo poblarlo si el **usuario lo provee explícitamente** y confirma que es mecánico. Cada item es
  `{ "path", "action": "create|update|delete", "contents": "<contenido COMPLETO>", "diff": null }`
  y el `path` debe estar en el allowlist (`playwright/tests/**`, `playwright/pages/**`,
  `playwright/support/interfaces/**`).

En la duda, deja `replayableFix: null`.

---

## Ejemplo de mapeo

**Narrativa del usuario:**

> "En el release pasado fallaban 6 casos de NuPAY. El problema era que Playwright validaba el estado
> de la orden antes de que el request de purchase terminara (race condition). Lo arreglé haciendo que
> el test espere el request antes de asertar."

**Entrada resultante (extracto):**

- `id`: `nupay-request-race-condition`
- `symptom`: "NuPAY payment tests fail because Playwright asserts the order status before the purchase request resolves; the awaited request hasn't completed, so the assertion reads a stale/missing value. Affects several NuPAY tests at once in a regression."
- `recipe`: "Test-side race condition, not a product bug. Don't relax the assertion: await the order status request (waitForResponse / the assertOrderStatusRequest\* helper) and assert on its resolved body instead of racing the network call."
- `rootCauseCategory`: `assertion_mismatch`
- `subagentHint`: `assertFixer`
- `testCaseIds`: `["PI-T1666", ...]` (los 6 reales)
- `replayableFix`: `null` (el fix vive en código que cambia → no replayable)
