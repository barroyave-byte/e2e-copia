# Plan: baselines visuales reproducibles (Mac local ↔ Linux en preprod y regresiones)

> Snapshot del repo: **2026-10-13**, branch `feat/upgrade-packages-develop-202610092119`.
> Los conteos son un punto en el tiempo: re-correr las mediciones de la sección 2 antes de arrancar.
> Objetivo: ejecutarlo completo en **un sprint (10 días hábiles)**.

## 0. TL;DR

Una imagen de referencia visual depende del **sistema donde se renderiza** (fuentes, rasterizado,
versión de Chromium). Hoy cada colaborador genera los baselines en su Mac y preprod los compara en
Linux. El resultado es que los tests visuales fallan en preprod sin que haya ninguna regresión real.

Caso que lo demostró (ENTP1-T2380, preprod 2026-10-13):

| Hecho medido                                                        | Valor                                         |
| ------------------------------------------------------------------- | --------------------------------------------- |
| Pantalla que falló (3/3 intentos, idéntico)                         | `split-payment-second-card`                   |
| Diferencia contra el baseline (umbral 5%)                           | 23.122 px = **5,11%**                         |
| La misma captura en Mac contra el mismo baseline                    | 535 px = 0,12%                                |
| Causa                                                               | header en 2 líneas en Linux → todo baja 12 px |
| Captura Linux local (Docker en Apple Silicon) vs captura de preprod | **0 px**                                      |
| elements-link de staging vs de la branch, ambos en Linux            | 0 px → no era bug de la branch                |
| Corregir solo el contenido (`C.C.` → `RFC`) sin cambiar de SO       | 5,09% → **sigue fallando**                    |

La solución es de infraestructura, no de disciplina:

1. **Un único entorno de renderizado oficial**: una imagen Docker fijada (Playwright y fuentes).
2. **Todo lo que genera o compara baselines pasa por esa imagen automáticamente**, también desde una Mac.
3. **CI rechaza baselines que no vienen de esa imagen**, para que el problema no vuelva.

## 1. Diagnóstico

### 1.1 Hoy existen tres entornos de renderizado distintos

| Dónde               | Cómo corre                                                                                               | Quién lo usa                   |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Mac del colaborador | `npm run update-snapshot -- <ID>` corre en el host                                                       | Genera **todos** los baselines |
| Regresiones (GHA)   | `github-actions/.../regression_tests.yml` en `gha-runner-e2e`, nativo, con `install-playwright-browsers` | Compara                        |
| Preprod             | Job k8s con `E2E_TEST_IMAGE`, construido desde el `Dockerfile` de este repo (`node:jod-bookworm-slim`)   | Compara                        |

No es solo "Mac vs Linux". El runner de regresiones y la imagen de preprod tampoco tienen por qué
renderizar igual. **Pendiente medirlo en la fase 0.**

### 1.2 La imagen de preprod no es reproducible

- `FROM node:jod-bookworm-slim` sin digest: cualquier rebuild puede traer otro Debian y otras fuentes.
- ~~`"@playwright/test": "^1.60"` con caret: un minor nuevo trae otro Chromium.~~ Resuelto en #3764: fijado a `1.64.1` exacto (la versión que ya corría preprod), y la imagen instala con `npm ci` desde el lockfile (#3763).
- Las fuentes del sistema dependen de lo que instale `npx playwright install-deps` ese día.

### 1.3 No hay barrera que lo detecte antes de mergear

- 165 baselines en 54 specs. Desde 2026-08, unas 10 personas distintas los modificaron.
- Ningún check de PR valida en qué entorno se generó un PNG. El commit `762d85c78` subió baselines
  de Mac (y con contenido de otro entorno: `C.C.` en lugar de `RFC`) 21 minutos antes de la corrida
  de preprod que falló.
- `npm run update-snapshot` usa `--update-snapshots=changed`: solo reescribe lo que supera el umbral
  y deja imágenes de Mac "al borde" (first-card de T2380 estaba en 4,29%).

### 1.4 Superficie de código involucrada

- `playwright/visual/utils/visualTestingUtils.ts`: `verifyVisualConsistency`, `verifyIframeVisualConsistency`,
  `verifyElementVisualConsistency` y `verifyIframeBodyVisualConsistency` (todas llaman `toHaveScreenshot`).
- `playwright/tests/visual_tests/teams/checkout/ENTP1-T2334.spec.ts` llama `toHaveScreenshot` directo
  en el spec. Hay que llevarlo al helper.
- `scripts/update-visual-snapshot.js`, el `Dockerfile`, `package.json`, `playwright.config.ts`
  (proyecto `visual-testing`, `snapshotPathTemplate`).
- `scripts/pr-review-agent/` (reglas), `.github/workflows/`, `.github/CODEOWNERS`.
- Repo `github-actions` (`regression_tests.yml`) y repo `e2e-pre-production` (consume `E2E_TEST_IMAGE`).

## 2. Mediciones a re-correr antes de arrancar

```bash
# Baselines y specs visuales
find playwright/visual/reference_images -name "*.png" | wc -l
ls playwright/visual/reference_images | wc -l

# Llamadas a toHaveScreenshot fuera de los helpers (deben quedar en 0 al final)
grep -rl "toHaveScreenshot" playwright | grep -v reference_images | grep -v visualTestingUtils

# Autores recientes de baselines (para planear la migración por equipo)
git log --since=2026-08-01 --format='%an' -- playwright/visual/reference_images | sort | uniq -c | sort -rn
```

## 3. Principios de diseño

1. **Una sola fuente de verdad de renderizado.** Un baseline solo es válido si salió de la imagen oficial.
2. **El camino correcto es el camino fácil.** El mismo comando de siempre hace lo correcto en cualquier
   SO. No depende de que alguien "se acuerde".
3. **Verificación dinámica, no solo estática.** Un PNG no dice en qué SO se generó. La única prueba
   real es volver a renderizar en la imagen oficial y comparar.
4. **No se esconde el problema.** Nada de subir `maxDiffPixelRatio` ni de baselines por SO (`{platform}`):
   duplica 165 imágenes y las de Mac nunca se validan.
5. **Upgrades deliberados.** Cambiar Playwright o la imagen es un PR explícito que incluye regenerar baselines.
6. **Humano en el loop para el contenido.** La IA clasifica diffs y el código automatiza. La decisión de
   que un cambio visual es intencional la toma una persona en el PR.

## 4. Arquitectura objetivo

```
                    ┌──────────────────────────────────────────────┐
                    │  Imagen oficial  e2e-visual-runner           │
                    │  mcr.microsoft.com/playwright:v1.64.1-noble  │
                    │  @digest fijo · multi-arch (amd64 + arm64)   │
                    │  ENV PW_RENDER_ENV=official                  │
                    └───────┬──────────────┬──────────────┬────────┘
                            │              │              │
         Mac / Windows      │   PR check   │  Regresiones │  Preprod
  npm run visual:update ────┤ visual-verify├──────────────┤ (Dockerfile
  npm run visual:test       │              │ container:   │  FROM ...)
  (docker run automático)   │              │ en job visual│
                            ▼              ▼              ▼
              reference_images/<spec>/*.png  +  .baseline.json (procedencia)
```

### 4.1 Imagen oficial

- **Decisión recomendada:** que el `Dockerfile` de este repo use `FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:<digest>`.
  Trae navegadores y fuentes fijados por Microsoft y es multi-arch (en Apple Silicon corre nativo, sin emulación).
- **Alternativa** (si preprod no puede cambiar de base): mantener `node:jod-bookworm-slim@sha256:<digest>`
  y fijar las fuentes explícitamente. Requiere más mantenimiento.
- Fijar `@playwright/test` a versión exacta (`"1.64.1"`, sin caret) y que el tag de la imagen coincida. Hecho en #3764.
  Un check de CI valida que los dos números sean iguales.
- `ENV PW_RENDER_ENV=official` dentro de la imagen. Los helpers lo usan para saber si están en el entorno oficial.
- Publicada en ECR (el mismo pipeline `action_push_ecr_dev.yml`) y accesible con `docker pull` para los devs.

### 4.2 Comandos para el desarrollador

| Comando                                  | Qué hace                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run visual:update -- <ID>`          | Regenera **todos** los baselines de ese caso dentro de la imagen oficial (`--update-snapshots=all`) y escribe `.baseline.json` |
| `npm run visual:test -- <ID>`            | Corre el caso en la imagen oficial **comparando**: es el "¿pasará en preprod?" local                                           |
| `npm run visual:adopt -- <reporte> <ID>` | Toma los `-actual.png` de un reporte de preprod o regresión y los adopta como baseline                                         |
| `npm run update-snapshot -- <ID>`        | Se mantiene como alias de `visual:update` (compatibilidad)                                                                     |

Detalles del wrapper (`scripts/visual/run-in-container.ts`):

- Si `process.platform === 'linux'` y `PW_RENDER_ENV=official`, corre directo. Si no, hace `docker run` de la imagen oficial.
- Monta el repo y usa un **volumen nombrado para `node_modules` de Linux** (no reutiliza los de Mac: hoy
  funcionó, pero cualquier dependencia nativa lo rompería).
- **Forward de puertos locales.** Por cada `URL_*_LOCAL` presente (elements-link, checkout-base) abre
  un proxy TCP dentro del contenedor: `localhost:<puerto>` → `host.docker.internal:<puerto>`.
  Es necesario porque la página de explore es HTTPS y Chromium bloquea `http://host.docker.internal`
  por mixed content. `localhost` está exento. Ya está probado en el RCA de T2380.
- Exige el ID del caso (como hoy) y nunca regenera la suite completa sin el flag `--all` explícito.
- Al terminar imprime el resumen (qué PNG cambió y el % de diff contra el anterior) y recuerda revisar las imágenes antes del commit.
- Detecta si el elements-link local corre con `next dev` y avisa: el overlay de errores de dev
  (por ejemplo, LogRocket sin `NEXT_PUBLIC_APP_LOGROCKET_ID`) arruina las capturas. Hay que usar `pnpm build && pnpm start`.

### 4.3 Ejecutar en Mac sin falsos rojos

Los helpers de `visualTestingUtils.ts` pasan a llamar una única función interna `assertVisual()`:

- **En la imagen oficial** (`PW_RENDER_ENV=official`): `toHaveScreenshot` normal. Es la comparación que cuenta.
- **En host no oficial** (Mac nativo, debug con `--headed`): no compara. Toma la captura, la adjunta al
  reporte (`test.info().attach`) y agrega la anotación `visual-comparison-skipped: host <os>`. El flujo
  funcional del test se ejecuta completo.
- **Si `CI=true` y no es la imagen oficial**: falla con un mensaje claro. Así nunca se compara (ni se
  salta) en un runner equivocado.
- Escape explícito: `PW_VISUAL_FORCE_COMPARE=1` para quien quiera comparar en Mac sabiendo que no vale.

No se usa `try/catch` para tragar el fallo de la comparación (violaría `no-swallowed-error`). En host no
oficial simplemente no se llama `toHaveScreenshot`.

### 4.4 Procedencia del baseline (`.baseline.json`)

El wrapper escribe, por carpeta de spec:

```json
{
  "image": "mcr.microsoft.com/playwright:v1.64.1-noble@sha256:…",
  "playwright": "1.64.1",
  "source": "visual:update | visual:adopt(<run-id>)",
  "targets": { "URL_ELEMENTS_LINK_LOCAL": "feat/upgrade-packages-…@<sha>" },
  "generatedAt": "2026-10-20T15:00:00Z"
}
```

Es metadata barata para el check estático del PR (5.2) y para auditoría. **No sustituye** a la
verificación dinámica (5.1).

### 4.5 Regresiones dentro de la imagen

En `github-actions/.github/workflows/regression_tests.yml`, el job que corre el proyecto
`visual-testing` (o todos los shards, si se decide unificar) declara `container: image: <imagen oficial>`.
Así regresiones y preprod renderizan igual que el baseline.

## 5. Validaciones en el PR

| #   | Check                                    | Tipo            | Dispara cuando el PR toca…                                                                            | Severidad      |
| --- | ---------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- | -------------- |
| 1   | `visual-verify` (workflow nuevo)         | Dinámico        | `playwright/visual/reference_images/**`, `visualTestingUtils.ts`, `Dockerfile`, versión de Playwright | **Bloqueante** |
| 2   | `visual-baseline-provenance` (PR agent)  | Estático        | Algún `*.png` de `reference_images`                                                                   | error          |
| 3   | `no-direct-toHaveScreenshot` (PR agent)  | Estático        | Un `.spec.ts` o page object llama `toHaveScreenshot` fuera de los helpers                             | error          |
| 4   | `playwright-version-pinned` (CI)         | Estático        | `package.json` o `Dockerfile`                                                                         | **Bloqueante** |
| 5   | CODEOWNERS                               | Revisión humana | `playwright/visual/reference_images/**` → owners del equipo del spec + QA                             | requerido      |
| 6   | Resumen visual con IA (comentario en PR) | Asistencia      | Algún `*.png` de `reference_images`                                                                   | informativo    |

### 5.1 `visual-verify` (el check que realmente garantiza)

- Corre en la imagen oficial, en modo comparación, **solo los specs cuyos baselines cambiaron**.
  Se obtienen del diff de rutas: `reference_images/<spec>/` → `<spec>`.
- Si algún PNG no reproduce (diff > umbral), falla con: "Este baseline no se reproduce en la imagen
  oficial. Regenéralo con `npm run visual:update -- <ID>` o adóptalo con `visual:adopt`".
- Sube como artifact los `-actual.png` y `-diff.png` para revisarlos.
- **Caso UI no publicada.** Si el baseline corresponde a un build de elements-link o checkout-base que
  todavía no está en staging, comparar contra staging da un falso rojo. Mitigación: label
  `visual/unreleased-ui`. Con ese label el check pasa a advertencia y la barrera real es la corrida de
  preprod del slot (que sí despliega la branch). El label exige que `.baseline.json` declare `targets`
  con la branch del front.

### 5.2 Regla `visual-baseline-provenance` (en `scripts/pr-review-agent/rules.repo.ts`)

Error si en el PR:

- cambia un PNG sin que cambie el `.baseline.json` de esa carpeta, o
- el `image`/`playwright` del `.baseline.json` no coincide con la imagen fijada en el `Dockerfile`, o
- aparece un PNG nuevo sin `.baseline.json`.

Mensaje: cómo regenerar correctamente, con enlace a este documento.

### 5.3 Regla `no-direct-toHaveScreenshot`

Fuerza que toda comparación pase por `assertVisual()`, que es donde vive la lógica de entorno de 4.3.
Primer caso a migrar: `ENTP1-T2334.spec.ts`.

### 5.4 Resumen visual asistido por IA

Un job (o el PR Reviewer Agent existente, que ya tiene `llm.ts`) recibe por cada PNG cambiado el par
viejo/nuevo y el diff, y comenta en el PR una tabla:

| Spec / pantalla     | Diff vs anterior | Clasificación IA           | Detalle            |
| ------------------- | ---------------- | -------------------------- | ------------------ |
| T2380 / second-card | 5,1%             | Solo render (fuentes/wrap) | header en 2 líneas |
| T2380 / first-card  | 0,1%             | **Cambio de contenido**    | `C.C.` → `RFC`     |

- Es **informativo**: ayuda al revisor a enfocarse en los cambios de contenido. No aprueba ni bloquea.
- Las imágenes se mandan al LLM vía el gateway que ya usa el agente, sin datos sensibles. Los
  baselines tienen datos de prueba enmascarados (por ejemplo, el recuadro magenta).

## 6. Apoyo con IA (durante y después de la implementación)

| Dónde                                                                      | Qué                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill de Claude Code `visual-baseline` (`.claude/skills/visual-baseline/`) | Guía para regenerar, adoptar o diagnosticar un baseline: verifica que el front local corra en modo prod, ejecuta `visual:update`/`visual:test`, muestra las imágenes y explica el diff. Se invoca con `/visual-baseline ENTP1-T2380`                                                                        |
| Skill `flaky-rca` + `docs/flaky-test-patterns.md`                          | Nuevo patrón: "baseline generado fuera de la imagen oficial". Firma: desplazamiento vertical uniforme, falla solo en CI/preprod, misma cantidad de px en todos los intentos. Incluye el método de comparación con el comparador de Playwright (`playwright-core/lib/coreBundle.js` → `utils.getComparator`) |
| Skill `dsl-test` / `websdk-dsl-test`                                       | Cuando un test nuevo incluye pasos visuales, indicar `visual:update` como forma de crear los baselines                                                                                                                                                                                                      |
| ai-heal (jul-IA-N)                                                         | Entrada en la knowledge base (skill `ai-heal-add-knowledge`) para que ai-heal **no** "arregle" fallos visuales regenerando baselines fuera de la imagen. Ante un fallo visual, su acción es `visual:adopt` desde el reporte + PR con revisión humana                                                        |
| Migración (fase 3)                                                         | Triage de los 165 diffs con Claude: clasificar "solo render" vs "cambio de contenido" para que los humanos revisen solo lo segundo                                                                                                                                                                          |
| PR Reviewer Agent                                                          | Reglas 5.2 y 5.3 + resumen 5.4                                                                                                                                                                                                                                                                              |
| `CLAUDE.md`                                                                | Actualizar "Common Commands" y "Testing" con los comandos `visual:*`, para que cualquier agente use el flujo correcto por defecto                                                                                                                                                                           |

## 7. Plan de ejecución por fases

Orden pensado para que cada fase deje el repo en un estado consistente y se pueda mergear por separado.

### Fase 0: Medición y decisiones (día 1)

| Tarea                                                                                                                                                            | Entregable               | Criterio de aceptación                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| 0.1 Medir si `gha-runner-e2e` (regresiones) renderiza igual que la imagen de preprod: correr T2380 y T2334 en los dos y comparar con el comparador de Playwright | Tabla de px por pantalla | Número medido, no supuesto                |
| 0.2 Confirmar con los dueños de `e2e-pre-production` que el `Dockerfile` puede cambiar de base (`mcr.microsoft.com/playwright`)                                  | Decisión 4.1 (A o B)     | Registrada en este documento              |
| 0.3 Confirmar que todos los colaboradores tienen Docker Desktop (o alternativa: Colima/OrbStack)                                                                 | Lista                    | 100% o plan para el resto                 |
| 0.4 Inventario: las 54 carpetas de baselines → equipo dueño (tag `@team_*` del spec)                                                                             | CSV                      | Sirve para CODEOWNERS y para la migración |

### Fase 1: Imagen oficial (días 2-3)

| Tarea                                                                                                    | Archivos                     | Criterio de aceptación                                             |
| -------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| 1.1 `Dockerfile` con base fijada por digest + `ENV PW_RENDER_ENV=official`                               | `Dockerfile`                 | Build reproducible: dos builds dan el mismo render (0 px en T2380) |
| 1.2 `@playwright/test` a versión exacta                                                                  | `package.json`, lockfile     | Sin caret                                                          |
| 1.3 Check `playwright-version-pinned` (versión en `package.json` == tag de la imagen)                    | `.github/workflows/`, script | Falla si difieren                                                  |
| 1.4 Publicación multi-arch en ECR                                                                        | `action_push_ecr_dev.yml`    | `docker pull` funciona en Apple Silicon e Intel                    |
| 1.5 Validar que preprod sigue verde con la nueva imagen (salvo los visuales, que se regeneran en fase 3) | Corrida de preprod           | Sin regresiones funcionales                                        |

> Si se cambia la base (opción B), **todos** los baselines cambian. Las fases 1 y 3 deben mergearse
> juntas o con los visuales en cuarentena entre medio (tag `@visual` excluido de preprod por máximo 2 días).

### Fase 2: Tooling del desarrollador (días 3-5)

| Tarea                                                                                                                        | Archivos                             | Criterio de aceptación                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 2.1 Wrapper `run-in-container` (4.2): detección de SO, volumen `node_modules`, forward de `URL_*_LOCAL`, aviso de `next dev` | `scripts/visual/run-in-container.ts` | En Mac: `visual:test -- ENTP1-T2380` reproduce el resultado de preprod (mismo px)                          |
| 2.2 Scripts `visual:update`, `visual:test`, `visual:adopt`; `update-snapshot` como alias                                     | `package.json`, `scripts/visual/`    | `visual:update` usa `--update-snapshots=all` acotado al ID y escribe `.baseline.json`                      |
| 2.3 `visual:adopt`: lee `report.json` embebido en `index.html` (o el zip) y copia los `-actual.png` del ID                   | `scripts/visual/adopt.ts`            | Adoptar el reporte de preprod del 2026-10-13 reproduce los baselines del commit `9b4d910e9` (0 px)         |
| 2.4 `assertVisual()` + migrar los 4 helpers + `ENTP1-T2334.spec.ts` (4.3)                                                    | `visualTestingUtils.ts`, spec        | Mac nativo: el test pasa con anotación; imagen oficial: compara; `CI=true` fuera de la imagen: falla claro |
| 2.5 Tests unitarios del wrapper y de `adopt` (parseo del reporte, mapeo spec → carpeta)                                      | `scripts/visual/__tests__/`          | Verdes en CI                                                                                               |

### Fase 3: Migración de los 165 baselines (días 5-7)

| Tarea                                                                                                                                       | Criterio de aceptación                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 3.1 Correr toda la suite `@visual` en la imagen oficial en modo **comparación** para tener la foto inicial: qué pasa, qué falla y con qué % | Reporte guardado como evidencia        |
| 3.2 Regenerar todo con `visual:update --all` contra staging (o contra los fronts de la branch que corresponda)                              | 165 PNG + 54 `.baseline.json`          |
| 3.3 Triage con IA de cada par viejo/nuevo (6) → lista "solo render" vs "cambio de contenido"                                                | Lista revisada                         |
| 3.4 Los "cambio de contenido" los revisa el equipo dueño (inventario 0.4). Si es una regresión real, **no** se adopta: se abre un bug       | Cada uno con decisión explícita        |
| 3.5 Un PR por equipo (o uno solo con commits por equipo) para que CODEOWNERS revise lo suyo                                                 | Aprobados por cada owner               |
| 3.6 Doble corrida de verificación: suite `@visual` en la imagen oficial ×2 (`--repeat-each 2`) y una corrida de preprod                     | 0 fallos visuales atribuibles a render |

### Fase 4: Barreras en CI (días 7-9)

| Tarea                                                                                                                                              | Archivos                                 | Criterio de aceptación                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 4.1 Workflow `visual-verify` (5.1) con label `visual/unreleased-ui`                                                                                | `.github/workflows/visual_verify.yml`    | Probado con 3 PRs de prueba: baseline de Mac → rojo; de la imagen → verde; UI no publicada con label → advertencia |
| 4.2 Reglas `visual-baseline-provenance` y `no-direct-toHaveScreenshot` en el PR agent + tabla de `CLAUDE.md` y `scripts/pr-review-agent/README.md` | `rules.repo.ts`, `rules.review.ts`, docs | Tests de la regla con casos positivos y negativos                                                                  |
| 4.3 Resumen visual con IA en el PR (5.4)                                                                                                           | `scripts/pr-review-agent/`               | Comentario generado en el PR de prueba                                                                             |
| 4.4 CODEOWNERS de `reference_images/**`                                                                                                            | `.github/CODEOWNERS`                     | Revisión requerida activa                                                                                          |
| 4.5 Regresiones dentro de la imagen oficial (4.5)                                                                                                  | Repo `github-actions` (PR cruzado)       | Corrida de regresión `@visual` verde y consistente con preprod                                                     |
| 4.6 Marcar `visual-verify` como required check en la protección de `develop` y `master`                                                            | Settings del repo                        | Activo                                                                                                             |

### Fase 5: Documentación, IA y adopción (días 9-10)

| Tarea                                                                                                | Criterio de aceptación                                     |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 5.1 Skill `visual-baseline` (6)                                                                      | Un colaborador nuevo regenera T2380 con la skill sin ayuda |
| 5.2 Patrón nuevo en `docs/flaky-test-patterns.md` + actualizar la skill `flaky-rca`                  | Mergeado                                                   |
| 5.3 Entrada en la knowledge base de ai-heal                                                          | Mergeado                                                   |
| 5.4 `CLAUDE.md`: comandos `visual:*` y la regla "los baselines solo se generan en la imagen oficial" | Mergeado                                                   |
| 5.5 Demo de 15 min al equipo + mensaje en el canal con el flujo de 3 comandos                        | Hecho                                                      |
| 5.6 Retirar la cuarentena de `@visual` si se usó en fase 1                                           | Preprod completo verde                                     |

## 8. Cronograma del sprint

| Día  | Fase                          | Dependencias                            |
| ---- | ----------------------------- | --------------------------------------- |
| 1    | 0 Medición y decisiones       | —                                       |
| 2-3  | 1 Imagen oficial              | 0.2                                     |
| 3-5  | 2 Tooling (en paralelo con 1) | 1.1 para probar contra la imagen        |
| 5-7  | 3 Migración de baselines      | 1 y 2 mergeadas                         |
| 7-9  | 4 Barreras en CI              | 3 (si no, `visual-verify` rechaza todo) |
| 9-10 | 5 Docs, IA, adopción          | 4                                       |

Camino crítico: **0.2 → 1 → 3 → 4.6**. Las fases 2 y 5 se pueden repartir entre más personas.

## 9. Definición de terminado

- [ ] Existe una sola imagen oficial, fijada por digest, multi-arch, con la misma versión de Playwright que `package.json`.
- [ ] Preprod y regresiones comparan dentro de esa imagen.
- [ ] Los 165 baselines (o los que haya al momento) fueron regenerados en la imagen y tienen `.baseline.json`.
- [ ] `npm run visual:update -- <ID>` desde una Mac produce un baseline que pasa en preprod (0 px vs preprod, como en T2380).
- [ ] Correr un visual nativo en Mac no da rojo por render: anota y adjunta.
- [ ] Un PR con baselines de Mac es rechazado por `visual-verify` (required) y por `visual-baseline-provenance`.
- [ ] No queda ningún `toHaveScreenshot` fuera de `assertVisual()`.
- [ ] Documentación, skill de Claude, patrón de flaky y knowledge base de ai-heal actualizados.

## 10. Métricas de éxito (medir 4 semanas después)

| Métrica                                                                 | Hoy                                               | Meta                       |
| ----------------------------------------------------------------------- | ------------------------------------------------- | -------------------------- |
| Fallos visuales en preprod/regresión cuya causa es el entorno de render | ≥1 por release (T2380, T2334/T2381 el 2026-10-06) | 0                          |
| Baselines con procedencia verificable (`.baseline.json` válido)         | 0%                                                | 100%                       |
| Tiempo para regenerar los baselines de un caso desde una Mac            | Manual / ad hoc                                   | < 5 min con un comando     |
| PRs con baselines rechazados por `visual-verify`                        | n/a                                               | Se mide, y debe tender a 0 |

## 11. Riesgos y mitigaciones

| Riesgo                                                          | Mitigación                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar la base del `Dockerfile` afecta a preprod (otro equipo) | Fase 0.2 con los dueños de `e2e-pre-production`; las fases 1 y 3 juntas o con cuarentena corta de `@visual`                                                         |
| ARM (Mac) vs amd64 (CI) renderizan distinto en algún caso       | En T2380 se midieron 0 px. En la fase 3.6 se verifica la suite completa; si aparece diferencia, el wrapper fuerza `--platform linux/amd64` (más lento, pero exacto) |
| Datos variables de staging cambian el contenido de una captura  | Ya mitigado con `maskLocators`. Revisar en el triage 3.3 los casos con diff de contenido sin cambio de UI                                                           |
| `visual-verify` da falso rojo con UI aún no publicada           | Label `visual/unreleased-ui` + preprod del slot como barrera (5.1)                                                                                                  |
| Docker Desktop: licencias, rendimiento o espacio en las Macs    | Alternativas OrbStack/Colima. Volumen de `node_modules` cacheado. Imagen única para todo                                                                            |
| La IA clasifica mal un diff                                     | Es solo informativa. La decisión es humana vía CODEOWNERS                                                                                                           |
| Se migra una regresión real como baseline                       | 3.1 deja la foto inicial y 3.4 exige decisión explícita por cada cambio de contenido                                                                                |

## 12. Preguntas abiertas

1. ¿El runner `gha-runner-e2e` renderiza igual que la imagen de preprod? (fase 0.1)
2. ¿Opción A o B para la base de la imagen? (fase 0.2)
3. ¿`visual-verify` compara contra staging o contra un slot de preprod efímero? Contra staging es más
   barato. Un slot efímero es más fiel para UI no publicada.
4. ¿Quién es dueño de la imagen oficial a largo plazo (upgrades trimestrales de Playwright)?

## Anexo A: evidencia del RCA de ENTP1-T2380 (2026-10-13)

- Reporte de preprod: 956 tests, T2380 único `unexpected`. 3/3 intentos fallan en `validate-split-payment-second-card`
  con 23.122 px (5,11%). El `expected` del reporte es byte a byte el baseline del repo (mismo md5).
- Captura local Mac (elements-link de la branch, `next start`): 0,12% en las 4 pantallas.
- Captura en `node:jod-bookworm-slim` local (Docker, arm64): second-card 23.120 px. Contra el `actual` de preprod: **0 px**.
- elements-link de staging en Linux vs el de la branch en Linux: 0 px en las 3 pantallas de split payment.
- Fix aplicado: baselines regenerados en Linux, commit `9b4d910e9`.

## Anexo B: comandos usados en el RCA (base para el wrapper)

```bash
# Captura en Linux contra un front local (forward localhost → host por mixed content)
docker run --rm -v "$PWD":/app -v "$FWD":/fwd.js -w /app -e CI= \
  -e URL_ELEMENTS_LINK_LOCAL=http://localhost:5001 node:jod-bookworm-slim bash -c \
  "node /fwd.js & npx playwright install-deps chromium && npx playwright install chromium && \
   npx playwright test <ID> --project=visual-testing --update-snapshots=all --retries=0"

# fwd.js
require('net').createServer(c => {
  const u = require('net').connect(5001, 'host.docker.internal');
  c.pipe(u).pipe(c); u.on('error', () => c.destroy()); c.on('error', () => u.destroy());
}).listen(5001, '127.0.0.1');
```

```js
// Comparar dos PNG con el mismo comparador que usa toHaveScreenshot
const { getComparator } = require('playwright-core/lib/coreBundle.js').utils;
const r = getComparator('image/png')(fs.readFileSync(actual), fs.readFileSync(expected), {
  threshold: 0.2,
  maxDiffPixelRatio: 0.05,
});
console.log(r ? r.errorMessage : 'PASS');
```
