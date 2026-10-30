# jul-IA-N — Pipeline de auto-heal (visión general)

Este documento describe el recorrido completo que hace **cada fallo de un test case** a través del
pipeline de auto-heal (`jul-ia-n/heal.ts`), tal como está hoy.

Entry point: `npm run ai-heal -- --input <test-results.json> [--testcase ID] [--dry-run] [--no-pr] …`

---

## Vista general (una corrida de regresión)

```
test-results.json
  │
  ├─ A. normalize ──────────── extrae los tests fallidos + texto del reporte
  │
  ├─ B. classify (LLM·clasif) ─ rootCauseCategory, teamOwner, isCredentialIssue…
  │
  ├─ C. dedup ──────────────── agrupa por signature (rootCause); 1 leader / N duplicados
  │
  ├─ prepare KB (1 vez) ────── carga KB + embeddings de entradas + batch de query-vectors (todos los leaders)
  │
  └─ FASE 1 · LEADERS EN POOL CONCURRENTE (AI_HEAL_CONCURRENCY, def. 10):
        │   (fase 2 = duplicados; heredan la decisión del leader, sin LLM, sin I/O)
        │
        ├─ D. enrich (lazy) ──── trace.zip, error-context, orderId/txId, network, DOM, stderr
        │
        ├─ E. investigate ────── adaptador trivial (ya NO pega a CloudWatch)
        │
        ├─ F. KB score ───────── coseno en memoria vs KB precomputado → matches + sección asesora
        │        │
        │        └─ decideShortCircuit → tier: none | route | apply
        │
        ├─ G. routing ────────── tier route/apply: decisión sintetizada (sin LLM)
        │                         tier none: orquestador (LLM·razona) → subagente + bugLocation
        │
        │        └─ gate: confidence < 0.8 → se detiene (low-confidence)
        │
        ├─ H. subagente ──────── tier apply: aplica replayableFix (sin LLM)
        │                         resto: subagente propone (agéntico o single-shot) → proposal
        │
        ├─ I. verify ─────────── si kind=diff: worktree + corre el test AI_HEAL_VERIFY_REPEAT veces (def. 3, mayoría=ok) · semáforo propio (AI_HEAL_VERIFY_CONCURRENCY, def. 2)
        │        │
        │        └─ subagente=cardFixer: si falla y sigue oliendo a rechazo de tarjeta, reintenta
        │                                con otra tarjeta del pool (AI_HEAL_CARDFIXER_MAX_ATTEMPTS, def. 2)
        │
        └─ J. submit ─────────── PR draft | Issue | nada  → CSV + telemetry
```

---

## Detalle por etapa

### A. normalize — `steps/normalize.ts`

Parsea el `test-results.json` de Playwright a una lista de fallos normalizados + el texto que consume
el clasificador.

### B. classify — `steps/group.ts` (LLM clasificador = `MODEL_CLASSIFY`)

Produce, por cada fallo: `rootCauseCategory` (11 categorías), `teamOwner`, `errorIdentified`,
`rootCause`, `isCredentialIssue`, `failedStep`.

- **Default (una sola llamada) por debajo del umbral de auto-chunk:** `max_tokens` alto
  (`AI_HEAL_CLASSIFY_MAX_TOKENS`, default 64000 = máximo de Sonnet 4). Como el dedup agrupa por el
  `rootCause` (texto libre del LLM), clasificar todo en una llamada maximiza la consistencia de
  redacción entre errores idénticos y **no pone en riesgo el agrupamiento**.
- **Chunking:** divide por nº de fallos (`AI_HEAL_CLASSIFY_CHUNK_SIZE`, default 40) y clasifica en
  paralelo (`AI_HEAL_CLASSIFY_CONCURRENCY`, default 4), mergeando en orden. Escala sin límite de
  latencia, pero como fallos idénticos en chunks distintos se clasifican por separado, su `rootCause`
  (y por tanto el agrupamiento) podría divergir.
  - **Auto-chunk (`AI_HEAL_CLASSIFY_AUTOCHUNK`, default true):** se activa solo cuando el nº de fallos
    supera `AI_HEAL_CLASSIFY_CHUNK_SIZE`, sin depender de un flag manual. Existe porque una corrida de
    308 fallos (vs. los ~180 habituales) mandó todo en una sola llamada no-streamed a un modelo de
    razonamiento y superó el timeout de la request (~10 min) — con esto, un pico de volumen se
    reparte en paralelo en vez de arriesgar timeout en un único call gigante.
  - `AI_HEAL_CLASSIFY_CHUNKING` (explícito `true`/`false`) **sobreescribe** la decisión automática en
    cualquier sentido (forzar ON para debug, o forzar OFF para preservar consistencia de
    `signatureKey` en una corrida que se sabe pequeña).

Si el `tool_use` se trunca por `max_tokens`, el guard lanza un error claro indicando qué flag activar.

`AI_HEAL_CLASSIFY_REASONING_EFFORT` (default `low`, solo OpenAI): classify es clasificación
estructurada repetitiva sobre texto de fallo ya normalizado, no razonamiento profundo — un nivel de
esfuerzo bajo reduce la latencia por tokens de razonamiento oculto sin aportar calidad extra. Junto
con esto, el default de `OPENAI_MODEL_CLASSIFY` pasó de `gpt-5.2` a `gpt-5.6-luna` (tier
costo-optimizado). `OPENAI_MODEL_REASONING` (orquestador + subagentes agénticos) pasó de `gpt-5.2` a
`gpt-5.6-terra` (tier balanceado) — a diferencia de classify, acá no se bajó el `reasoning_effort`
porque el orquestador/subagentes leen archivos reales en un loop multi-turn y sus diffs terminan en
PRs reales vía `verify`; un error ahí sale más caro que unos segundos extra de latencia. **Validado
parcialmente** (2026-07-28) contra los goldens reales (`PAYM-T1931`, `RECON-T18`, `PI-T1666` — no
`ENTP1-T2169`, que nunca existió como fixture, solo como ejemplo ilustrativo en un comentario de
`eval/subagent-bench.ts`) vía `npm run ai-heal:eval`: 2/3 pasan con este default. El fallo restante
(`PI-T1666`) es un gap real de uso de la KB, no del modelo — ver "Known gaps" en `CLAUDE.md`.

### C. dedup — `steps/dedup.ts`

Agrupa por `rootCause` normalizado. El menor `testCaseId` es **leader**; el resto son **duplicados**
que heredan la decisión del leader **sin gastar LLM**. Es el dedup intra-corrida; el knowledge base
es el equivalente persistente cross-release.

> A partir de aquí, **solo los leaders** pagan el costo de I/O y LLM.

### prepare KB (1 vez) — `steps/knowledge.ts`

Antes del loop, el KB se prepara **una sola vez** por corrida: `prepareKnowledgeBase` carga y embebe
las entradas (usando/refrescando el cache en disco), y `embedQueries` embebe en **lotes**
(`AI_HEAL_EMBED_BATCH_SIZE`, default 128) los query-vectors de **todos** los leaders. Esto reemplaza
las 1 lectura+Zod del KB y 1 round-trip de embeddings _por leader_ del diseño anterior. Una falla aquí
es no-fatal: la corrida sigue sin "prior art".

### Concurrencia (fases) — `heal.ts` + `util/concurrency.ts`

Los leaders son independientes y su trabajo es network/LLM-bound, así que se procesan en **dos fases**:

- **Fase 1 — leaders en pool concurrente** (`pLimit(AI_HEAL_CONCURRENCY)`, default 10). El paso `verify`
  (Playwright, pesado en CPU/browser) pasa por su **propio semáforo** (`AI_HEAL_VERIFY_CONCURRENCY`,
  default 2), independiente del pool LLM, para no lanzar N test-runs a la vez.
- **Fase 2 — duplicados**: se anexan después (no hacen trabajo) y heredan la decisión de su leader en
  el CSV.

> Bajo concurrencia, los caps de presupuesto/PR se chequean antes del trabajo caro de cada leader, pero
> hasta `CONCURRENCY` leaders pueden estar en vuelo al cruzarse el cap: el overshoot queda **acotado por
> `CONCURRENCY`** (tradeoff deliberado por el wall-clock).

### D. enrich (lazy) — `steps/enrich.ts`

Abre `trace.zip`, lee `error-context.md`, extrae `orderId`/`transactionId`/`xRequestIds`, filtra
network calls relevantes (status + body), DOM snapshot y stderr. Solo para leaders (ahorra I/O).

### E. investigate — `steps/investigate.ts`

Adaptador `EnrichedFailure → InvestigatedFailure`. **Ya NO consulta CloudWatch de forma eager.** El
orquestador rutea con la evidencia trace-level que ya trae el enrich. CloudWatch pasó a ser una tool
opcional del subagente (`query_cloudwatch`, scoped por el `suspectedRepo`), pero desde que
`serviceInvestigator` migró al MCP `prod-sre-agent` (2026-07-24, ver sección H) ya no está cableada a
ningún subagente — queda como código muerto en `tools/subagentTools.ts`, no eliminado por si se
necesita de nuevo.

### F. KB score — `steps/knowledge.ts`

Por leader **ya no hay embeddings ni disco**: `scoreKnowledge` es puro y síncrono — hace coseno entre
el query-vector ya precomputado (ver _prepare KB_) y los vectores de las entradas del KB en memoria.
Devuelve matches sobre umbral (`AI_HEAL_KB_MIN_SIMILARITY`, default 0.45) y arma una **sección asesora**
("prior art"). Los embeddings (siempre OpenAI, independiente de `AI_PROVIDER`) se calcularon una sola
vez en la fase de preparación.

Luego `decideShortCircuit` evalúa si el match es lo bastante fuerte para saltar razonamiento LLM:

| Tier          | Condición                                                                                                                                                                                                                       | Qué se salta                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `none`        | sin match fuerte                                                                                                                                                                                                                | nada (puede inyectar sección asesora)                                       |
| `route`       | score ≥ `AI_HEAL_KB_SC_THRESHOLD` (0.9) **+ match exacto de testCaseId** + `subagentHint`                                                                                                                                       | el **orquestador LLM**                                                      |
| `apply`       | lo anterior **+ la entrada trae `replayableFix`**                                                                                                                                                                               | el **orquestador Y el subagente LLM**                                       |
| `known-issue` | score ≥ `AI_HEAL_KB_KNOWN_ISSUE_THRESHOLD` (0.95, más estricto) **+ match exacto de testCaseId** + la entrada trae `knownExternalIssue` (+ `rootCauseCategory` de la entrada coincide con la categoría actual, si está seteado) | **orquestador, subagente Y verify** — no hay nada que arreglar ni re-correr |

El requisito de **match exacto de `testCaseId`** es deliberado: el short-circuit solo dispara ante
una recurrencia probada del mismo test, no ante un vecino semántico difuso.

`known-issue` existe para errores recurrentes y no accionables (ej. un PSP que devuelve el mismo
decline en cada regresión, sin fix posible de nuestro lado). Como acá no corre `verify`, un falso
positivo queda **sin red de seguridad** — por eso su umbral es propio y más estricto que el de
`route`/`apply`, y exige además que la categoría coincida cuando la entrada la especifica. El leader
escribe directo en `release.csv` (columnas **QA Review**/**Root cause QA**, vía
`KnowledgeEntry.knownExternalIssue.csvStatus`/`csvIssueType`, más la marca `[AI-HEAL: KB <entry id>]`
en **Comments QA** — ver "Marca `[AI-HEAL: …]`" abajo) y en telemetry (`prResult:
'known-issue'`); los duplicados del mismo grupo de dedup heredan la misma disposición sin volver a
consultar la KB (ver `heal.ts`, loop de duplicados).

### G. routing — `agents/orchestrator.ts`

- tier `known-issue`: no hay decisión que sintetizar — el leader retorna directo desde el loop
  principal de `heal.ts` antes de tocar el orquestador.
- tier `route`/`apply`: la decisión se **sintetiza desde la entrada del KB** (`decisionFromKnowledge`),
  saltando la llamada al orquestador.
- tier `none`: el **orquestador (LLM razonador, `MODEL_REASONING`)** decide: subagente, `bugLocation`
  (`e2e`/`service`), `suspectedRepo`, `confidence` y posible `categoryOverride` — usando la evidencia
  trace-level (network/DOM/stderr) más la sección asesora del KB.

**Gate de confianza:** si `confidence < --confidence-threshold` (default 0.8), el caso se registra
pero **se detiene** (espera triage humano).

### H. subagente — `agents/subagents/index.ts`

- tier `apply`: `buildShortCircuitProposal` arma el `diff` directamente desde `replayableFix`,
  **sin LLM**.
- `assertFixer` / `cardFixer` / `selectorFixer` / `serviceInvestigator` / `testDataFixer`: **agénticos**
  → loop multi-turno (`models/`: `runAgent`, implementado para Anthropic y OpenAI). Tools por subagente
  (`resolveAgentTools` en `agents/subagents/index.ts`):
  - `assertFixer` / `testDataFixer` / `selectorFixer`: `read_file`, `grep` (git grep), `glob` (git
    ls-files) — solo lectura del repo real, `tools/subagentTools.ts` → `createRepoTools()` — más
    `run_test` (`assertFixer`/`testDataFixer` desde 2026-07-28, `selectorFixer` desde 2026-07-29):
    aplica un `fileChanges` candidato a un worktree descartable y corre el test real una vez
    (`tools/playwrightRunner.ts` → `runIsolated`, semáforo propio `AI_HEAL_AGENT_VERIFY_CONCURRENCY`,
    def. 2). No es de solo lectura, pero nunca toca el repo real — mismo allowlist que el gate final
    (`util/allowlist.ts`, compartido). Deja al subagente probar una hipótesis concreta antes de
    proponerla, en vez de adivinar.
  - `cardFixer`: solo `createRepoTools()` (sin `run_test` — tiene su propio retry loop externo en
    `heal.ts`, ver "I bis" más abajo).
  - `serviceInvestigator` (migrado 2026-07-24, transporte rehecho 2026-08-04; ya NO usa
    `query_cloudwatch` ni los repo tools): tools contra el **SRE Agent** vía el gateway MCP central
    **LiteLLM `company_ai`** (`https://dev-portal.deuna.io/litellm/company_ai/mcp`, en
    `tools/prodSreAgentClient.ts` → `createProdSreAgentTools`) — `rca_session_run` (inicia sesión de
    RCA desde un `scenario` armado automáticamente desde el failure), `rca_session_investigate`
    (continuación — ejecuta acciones de evidencia planificadas), `artifact_read` (lee un extracto
    acotado de un artifact path devuelto por las anteriores), `sre_agent_capabilities` (solo
    diagnóstico). Requiere `AI_HEAL_LITELLM_MCP_KEY`: la virtual key MCP-only del **workload team** de
    ai-heal en LiteLLM. El endpoint directo `/sre-agent/mcp` y los tokens OAuth per-user están
    explícitamente prohibidos (`sre-dev-portal/docs/DEUNA_AI_ARCHITECTURE.md`, "Unsupported legacy
    patterns") — ver `docs/sre-agent-workload-access-request.md` para el pedido de acceso y su estado.
  - tool terminal (todos): `submit_proposal`
- los otros 7 subagentes: single-shot (`getStructuredOutput`).
- Toda salida pasa por `enforceKindRules` (degrada propuestas inválidas a `enrichment_only`) +
  `validateFileChanges` (allowlist). Resultado: `proposal` con `kind` = `diff` | `issue` |
  `enrichment_only`.

### I. verify — `steps/verify.ts`

Si `kind=diff`: crea un git worktree desde la base, aplica los `fileChanges` y **corre el test
`AI_HEAL_VERIFY_REPEAT` veces** (default **3**). Veredicto `ready-to-pr` si pasan al menos la mayoría
de esas corridas (`Math.ceil(repeat / 2)` — con el default de 3, hacen falta 2/3; si se baja
`AI_HEAL_VERIFY_REPEAT` a 1, alcanza con que pase 1 vez, pero es una señal débil para fixes
probabilísticos como un swap de tarjeta — confirmado en la práctica 2026-07-29: PR #3190 abrió con
1/1 y falló 3/3 en re-validación manual, el swap nunca arregló el decline real) o `needs-human` si no.
Los otros `kind` se saltan. Es la **red de seguridad final**: ningún PR se abre si el fix no pasa el
re-run. Bajo concurrencia, este paso pasa por su **propio semáforo** (`AI_HEAL_VERIFY_CONCURRENCY`,
default 2), separado del pool de leaders.

Si al menos un intento pasa, `verify` también extrae `orderId`/`transactionId`/`xRequestIds` frescos
del stdout de ESA corrida (`extractIdsFromText` en `enrich.ts`, reusado — no del `trace.zip` original)
y los expone como `verifyOrderId`/`verifyTransactionId`/`verifyXRequestIds`, separados de los mismos
campos de `Proposal` (que quedan congelados desde `enrich` con datos de la falla ORIGINAL, previa al
fix, y nunca se actualizan). `steps/pr.ts` los muestra en una sección aparte, "Evidencia de la
re-ejecución exitosa" — antes de esto un reviewer solo veía la evidencia pre-fix, que en un caso real
(PR #3190) mostraba una transacción `denied`, aunque el fix sí había pasado su única re-corrida
(confuso pero no falso — es exactamente el motivo del fix del párrafo anterior).

### I bis. cardFixer — pool de tarjetas + retry loop (`tools/cardPool.ts`, `heal.ts`)

`cardFixer` es el único subagente con un loop de reintento propio, orquestado en `heal.ts` (no dentro
del subagente ni del LLM). Es **agéntico** (migrado 2026-07-10): la primera versión single-shot nunca
veía el contenido real del spec file y terminaba **alucinando un archivo entero** (imports, page
objects y métodos inventados) en vez de editar el real — el archivo fabricado no compilaba, Playwright
no lograba recolectar ningún test de él, y `verify` reportaba `0/0` sin ninguna pista de por qué.
Con `read_file`/`grep`/`glob` (mismo patrón que `testDataFixer`), cardFixer lee el spec real antes de
proponer el swap y devuelve el archivo completo con un cambio mínimo y grounded, no una reconstrucción
de memoria.

1. `getCardCandidates({psp, country})` arma el pool: cada tarjeta viene de un registro **curado**
   (`knowledge/card-pool/*.json`, uno por PSP, generado por `npm run ai-heal:bootstrap-cards` y
   revisado por PR) — nunca se infiere en runtime qué tarjeta es "segura", así se evita ofrecerle a
   cardFixer una tarjeta como `...Failed`/`...Fraud`/`...ManualReview` que otro test usa a propósito
   para fallar. `psp`/`country`/`brand` son **hints de ranking, no filtros**: el pool completo siempre
   está disponible (un entorno sandbox de PSP suele aceptar una tarjeta curada para otro PSP), solo
   cambia el orden.
2. cardFixer propone un swap (`kind=diff`) → `verifyProposal` (`AI_HEAL_VERIFY_REPEAT`x, def. 3). Si
   pasa la mayoría de esas corridas → PR, listo.
3. Si falla, se revisa `reruns[].errorMessage`: si ya no matchea un patrón de rechazo de
   tarjeta/BIN (`CARD_ISSUE_PATTERN` en `heal.ts`), el loop **se detiene ahí** — no tiene sentido
   gastar otro intento si el fallo cambió de naturaleza (p.ej. un timeout).
4. Si sigue oliendo a rechazo de tarjeta: se vuelve a invocar `cardFixer` (agéntico — vuelve a leer el
   spec desde cero, no reutiliza el file-read del intento anterior) excluyendo las tarjetas ya
   probadas (`previousCardAttempts` en el contexto) → nueva propuesta → `verifyProposal` de nuevo.
   Tope: `AI_HEAL_CARDFIXER_MAX_ATTEMPTS` tarjetas distintas (default 2).
5. Si se agotan los intentos (o el pool) sin pasar verify: no se abre PR: la fila del CSV documenta
   qué tarjetas se probaron y con qué resultado (`steps/csv.ts`, columna "AI Proposed Solution").

**Sin estado persistente entre corridas:** a diferencia de un pool con "tarjetas usadas", acá ninguna
tarjeta queda marcada como declinada permanentemente — un rechazo puede ser un problema puntual del
entorno de pruebas del PSP, así que la misma tarjeta vuelve a ser candidata en la próxima corrida.
`tools/cardPool.ts` es una función pura (sin escritura a disco); solo dentro de un mismo caso se
excluyen las tarjetas ya probadas (en memoria, vía `exclude`).

### J. submit — `steps/pr.ts`

Según `kind` + veredicto: abre **PR draft**, **Issue**, o nada. Todo queda en
`telemetry/runs/<fecha>-<release>.json` y se reescribe `release.csv` (con sufijo
`[KB prior art: …, short-circuit …]` cuando aplica). Para tier `known-issue` no pasa por aquí —
`heal.ts` ya escribió la disposición directo en el `CaseTelemetry` del leader (y de sus duplicados).

### K. propagation — `heal.ts` + `steps/pr.ts`

Un fix arregla el spec del leader; sus duplicados viven en archivos propios y quedaban rotos (en la
regresión 39.2 se abrieron 5 PRs por un BIN de Kushki rechazado y 21 specs siguieron fallando). Esta
fase corre **después** de todos los leaders, y solo para los duplicados de un leader cuyo fix
**realmente funcionó** (`prResult='pr'` **y** `verdict='ready-to-pr'`; un fix sin verificar nunca se
propaga). Por cada duplicado:

1. Si el commit del leader ya lo cubre (helper o page object compartido) → `propagated-covered`, sin
   proponer nada.
2. Se despacha **el mismo subagente del leader** con `leaderFixSection` (los `fileChanges` verificados
   del leader + su razonamiento), para que adapte la misma idea al archivo de este caso.
3. Se rechaza la propuesta que toque un archivo que el leader ya cambió: su contenido sale de la
   versión **base** de ese archivo, así que commitearla sobre la rama del leader sobreescribiría el fix
   del leader, y `verify` (que corre contra base) tampoco podría juzgarla → `propagation-declined`,
   a revisar cuando el PR del leader esté mergeado.
4. `verify` propio, con `AI_HEAL_PROPAGATE_VERIFY_REPEAT` corridas (def. 1: el leader ya pagó la
   mayoría de 3 para esta causa raíz).
5. Commit sobre la **rama del PR del leader** (`submitPropagatedFix`) y un comentario por leader
   (`commentPropagationSummary`) con lo que se propagó y lo que no. A propósito **no** son N PRs
   nuevos: 20 PRs de una línea por un mismo BIN es ruido de revisión.

**La red de seguridad es `verify`, no el prompt.** Al subagente se le pide declinar cuando el fix no
aplica, y no siempre obedece: propagando el cambio de tarjeta Kushki a `PI-T1606` (caso de débito
Mastercard) propuso el cambio igual; `verify` volvió a correr el spec, falló
`assertPaymentMethod('debit_card')`, el caso quedó `propagation-failed` y no se commiteó nada.

Valores de `prResult` nuevos, todos con su propio texto en `release.csv`: `propagated`,
`propagated-covered`, `propagation-declined` (el subagente dijo que no aplica) y
`propagation-failed` (el fix adaptado no pasó su re-run). `computeResolutionMetrics` no cambia — sus
cuatro tiers son solo de leaders para seguir siendo comparables entre releases; el conteo de la
corrida va en la telemetría como `propagatedDuplicates`.

---

## Puntos de decisión y redes de seguridad

| Gate                                          | Qué hace                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **dedup**                                     | Duplicados no gastan LLM salvo en propagation (heredan al leader).                                                                                                                                                                                                                                                                            |
| **propagation**                               | Solo desde un leader con `verdict='ready-to-pr'` y PR abierto. Cada duplicado pasa por su propio subagente **y su propio `verify`** antes de commitear; tope `AI_HEAL_PROPAGATE_MAX` (def. 25 por corrida) y se revalida el budget por caso. Se apaga con `AI_HEAL_PROPAGATE=false`.                                                          |
| **concurrencia**                              | Leaders en pool (`AI_HEAL_CONCURRENCY`, def. 10); `verify` con semáforo propio (`AI_HEAL_VERIFY_CONCURRENCY`, def. 2).                                                                                                                                                                                                                        |
| **budget cap / PR cap**                       | `AI_HEAL_BUDGET_USD` / `AI_HEAL_PR_CAP` cortan la corrida. Overshoot acotado por `CONCURRENCY`.                                                                                                                                                                                                                                               |
| **short-circuit**                             | Exige match exacto de testCaseId + score ≥ 0.9 (`route`/`apply`) o ≥ 0.95 + categoría (`known-issue`) para saltar LLM. Conservador.                                                                                                                                                                                                           |
| **confidence ≥ 0.8**                          | Bajo el umbral, el caso se registra pero espera a un humano.                                                                                                                                                                                                                                                                                  |
| **allowlist**                                 | Cambios solo en `playwright/tests/**`, `playwright/pages/**`, `playwright/support/interfaces/**`.                                                                                                                                                                                                                                             |
| **secrets scan**                              | `tools/secretsScan.ts` corre gitleaks sobre cada propuesta `kind=diff` antes de verify/PR; un match degrada a `enrichment_only`. Falla cerrado si falta el binario de gitleaks.                                                                                                                                                               |
| **code scan**                                 | `tools/codeScan.ts` corre semgrep (`p/security-audit` + `p/typescript`) sobre cada propuesta `kind=diff`; solo hallazgos `ERROR` degradan a `enrichment_only` (`WARNING`/`INFO` quedan como advisory en el log, por el ruido esperable contra specs llenas de tarjetas/credenciales de prueba). Falla cerrado si falta el binario de semgrep. |
| **verify (`AI_HEAL_VERIFY_REPEAT`x, def. 3)** | Ningún PR se abre si el fix no pasa el re-run. **No aplica a `known-issue`** — no hay nada que correr, por eso ese tier exige el umbral más alto.                                                                                                                                                                                             |
| **cardFixer retry cap**                       | Hasta `AI_HEAL_CARDFIXER_MAX_ATTEMPTS` tarjetas distintas (def. 2), cada una con su propio `verify`. El loop se corta antes si el fallo deja de parecer un rechazo de tarjeta, o si el pool se agota.                                                                                                                                         |
| **Phase 1**                                   | No se abren PRs en repos de servicio; `serviceInvestigator` es read-only.                                                                                                                                                                                                                                                                     |

---

## Dónde se gasta (y se ahorra) LLM

- **Clasificador**: 1 llamada por corrida (default); con chunking opt-in, 1 por chunk de ~40 fallos en paralelo.
- **Orquestador**: 1 llamada por leader — se salta en tier `route`/`apply`/`known-issue`.
- **Subagente**: la parte cara (agéntico, multi-turno) — se salta en tier `apply` y en `known-issue`.
- **Verify**: se salta en `known-issue` (no hay `fileChanges` que correr; ni siquiera abre worktree).
- **Embeddings**: siempre OpenAI, costo marginal — entradas del KB y query-vectors se embeben **en lote, una vez** por corrida (no por leader).
- **Duplicados**: 0 LLM.
- **Wall-clock**: la fase 1 corre los leaders en paralelo (pool acotado), así que el tiempo total lo marcan los rate limits del proveedor, no la serialización.

> El modo **asesor** (tier `none` con match medio) NO ahorra LLM: el agente razona igual. El ahorro
> real viene de `route` (salta orquestador) y `apply` (salta ambos). `apply` solo dispara para
> entradas que el autor marcó con `replayableFix` (fixes mecánicos y estables del repo).

**Trazabilidad (opcional):** cada llamada de `classify`/orquestador/subagente se reporta a Langfuse
(`util/tracing.ts`, agregado 2026-07-28) — modelo, input, output, tokens y costo, visible por corrida y
entre corridas en vez de solo en el JSON de telemetría de esa corrida. Self-host local vía Docker Compose
en `jul-ia-n/infra/langfuse/`. Sin `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` en `.env`, es un no-op —
no cambia el comportamiento del pipeline.

**Métrica de %-resuelto en 4 niveles** (`steps/metrics.ts`, agregado 2026-07-29): al final de cada
corrida, sobre los leaders únicamente — `resolved` (`pr`/`issue`/`known-issue`), `assisted` (`none` pero
con un intento real verificado que falló — `verdict='needs-human'` o intentos de `cardFixer`),
`escalated` (`skipped-low-confidence`), `classifiedOnly` (el resto). Se escribe en el propio JSON de
telemetría de la corrida y se publica a Langfuse como 4 scores numéricos sobre un trace
`release-summary` (`sessionId` = releaseId) — así se puede graficar release contra release directo en
Langfuse, sin dashboard aparte. `npm run ai-heal:metrics -- --run <telemetry.json> [--push]` recalcula
esto para cualquier corrida histórica.

---

## Herramientas para iterar

| Comando / skill                                               | Para qué                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| `npm run ai-heal -- --input <json>`                           | Corrida completa del pipeline.                              |
| `npm run ai-heal:bench -- --fixture <json> [--kb]`            | Corre un subagente aislado sobre un fixture (con o sin KB). |
| `npm run ai-heal:kb -- --query "<texto>" \| --fixture <json>` | Prueba el retrieval del knowledge base.                     |
| `npm run ai-heal:parity <json>`                               | Compara clasificador OpenAI vs Anthropic.                   |
| skill `ai-heal-add-knowledge`                                 | Ingresa un caso resuelto al KB de forma narrativa.          |

Variables de entorno relevantes: `AI_PROVIDER`, `MODEL_CLASSIFY`/`MODEL_REASONING` (por proveedor),
`AI_HEAL_CONFIDENCE_THRESHOLD`, `AI_HEAL_BUDGET_USD`, `AI_HEAL_PR_CAP`,
`AI_HEAL_CONCURRENCY` (leaders en paralelo, def. 10), `AI_HEAL_VERIFY_CONCURRENCY` (test-runs de verify en paralelo, def. 2),
`AI_HEAL_VERIFY_REPEAT` (veces que se corre el test por intento de verify, def. **3** — exige mayoría,
2 de 3; bajarlo a 1 alcanza con pasar una vez para abrir PR, pero es una señal débil para fixes
probabilísticos — no bajar sin una razón clara de costo/tiempo),
`AI_HEAL_CLASSIFY_AUTOCHUNK` (auto-chunk por volumen, def. **true**), `AI_HEAL_CLASSIFY_CHUNKING`
(override explícito true/false del auto-chunk), `AI_HEAL_CLASSIFY_MAX_TOKENS` (cap de output del clasificador, def. 64000),
`AI_HEAL_CLASSIFY_CHUNK_SIZE` (fallos por chunk / umbral de auto-chunk, def. 40), `AI_HEAL_CLASSIFY_CONCURRENCY` (chunks en paralelo, def. 4),
`AI_HEAL_CLASSIFY_REASONING_EFFORT` (esfuerzo de razonamiento del clasificador, solo OpenAI, def. `low`),
`AI_HEAL_CARDFIXER_MAX_ATTEMPTS` (tarjetas distintas que cardFixer puede probar por caso, def. 2),
`AI_HEAL_PROPAGATE` (propagar el fix verificado del leader a sus duplicados, def. **true**),
`AI_HEAL_PROPAGATE_MAX` (duplicados propagados por corrida, def. 25 — acota el wall-clock porque cada
uno es una corrida real de Playwright), `AI_HEAL_PROPAGATE_VERIFY_REPEAT` (corridas de verify por
duplicado propagado, def. **1**),
`AI_HEAL_EMBED_BATCH_SIZE` (lote de embeddings, def. 128), `AI_HEAL_LOG_GROUPS` /
`AI_HEAL_LOG_GROUPS_BY_REPO`, `AI_HEAL_KB_ENABLED`, `AI_HEAL_KB_MIN_SIMILARITY`,
`AI_HEAL_KB_SHORTCIRCUIT`, `AI_HEAL_KB_SC_THRESHOLD`, `AI_HEAL_KB_KNOWN_ISSUE_THRESHOLD` (umbral del
tier `known-issue`, def. 0.95 — propio y más estricto que `AI_HEAL_KB_SC_THRESHOLD` porque no hay
`verify` de respaldo), `AI_HEAL_CSV_SHOW_KB_PRIOR_ART` (def. **false** — solo afecta si el sufijo
`[KB prior art: ...]` se imprime en la columna "AI Proposed Solution" del CSV; el scoring/short-circuit
del KB no cambia con este flag, siempre corren igual), `AI_HEAL_EMBEDDINGS_MODEL`, `AI_HEAL_LOG_LEVEL`,
`AI_HEAL_RELEASE_COMPARE_THRESHOLD` (umbral de similitud para la comparación entre releases, def. 0.75),
`AI_HEAL_PREVIOUS_RELEASE_CSV` (override opcional: path a un CSV puntual en vez de auto-descubrir el
más reciente en `jul-ia-n/releases/`), `AI_HEAL_PREVIOUS_RELEASE_ID` (override opcional del label que
se usa como ref de la marca `[AI-HEAL: <ref>]` en Comments QA; si no se setea, se infiere del nombre
del archivo elegido),
`AI_HEAL_LITELLM_MCP_KEY` (virtual key MCP-only del workload team de ai-heal en LiteLLM; requerida
para que `serviceInvestigator` funcione — sin ella `prodSreAgentClient.ts` falla de inmediato con un
mensaje explícito en vez de degradar en silencio), `AI_HEAL_LITELLM_MCP_URL` (endpoint del gateway,
def. `https://dev-portal.deuna.io/litellm/company_ai/mcp`), `AI_HEAL_SRE_AGENT_MCP_SERVER` (alias del
server upstream que prefija los nombres de tool en el gateway, def. `prod_sre_agent`),
`AI_HEAL_SRE_AGENT_CONCURRENCY` (llamadas MCP en paralelo, def. 2 — el registry del server acota 8
in-flight por worker y abre circuito a los 3 fallos 5xx consecutivos),
`AI_HEAL_SRE_AGENT_TIMEOUT_MS` (def. 180000), `AI_HEAL_ENVIRONMENT` (ambiente reportado al `scenario`
de `rca_session_run`, def. `staging`), `AI_HEAL_SRE_ACCOUNT_ALIAS` (override del alias de cuenta AWS
que `rca_session_run` exige junto con `environment`; por defecto se deriva de `AI_HEAL_ENVIRONMENT`
→ `dev` para staging, ver `MCP_AWS_ACCOUNT_CONTEXT.md`), `AI_HEAL_SRE_REGION` (def. `us-east-2`),
`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` (activan la trazabilidad hacia Langfuse — sin ambas,
`util/tracing.ts` es un no-op), `LANGFUSE_BASE_URL` (def. `http://localhost:3000`, el self-host local en
`jul-ia-n/infra/langfuse/`).

## CSV — columnas fuera de A-H

`release.csv` se importa a una planilla maestra de regresión en Sheets que tiene más columnas que las
que este pipeline genera. Las columnas I-L (`Owner (dev)`, `Evidence by team...`, `Dev Solution`,
`Status Review Dev`) existen en el header pero el pipeline **nunca** las escribe — son de llenado
manual; existen solo para que M y N caigan en la posición correcta al importar. Las columnas M
(`QA Review`) y N (`Root cause QA`) solo se llenan cuando el tier fue `known-issue`, tomando los
valores literales de `KnowledgeEntry.knownExternalIssue.csvStatus`/`csvIssueType` (típicamente `"OK"`
/ `"External issue"`). Cualquier otro caso deja M/N vacías. La columna O (`Comments QA`) también se
llena para `known-issue`, solo con la marca `[AI-HEAL: KB <entry id>]`; en cualquier otro caso queda
vacía hasta que corre la comparación entre releases (ver abajo).

### Comparación entre releases — `steps/compareReleases.ts` (+ `tools/compareReleases.ts` para uso manual)

Reemplaza el paso manual de "adjuntar el CSV actual y el del release anterior a un prompt". La lógica
vive en `steps/compareReleases.ts` (`compareWithPreviousRelease`) y tiene **dos formas de correr**:

**1. Automático, dentro de `npm run ai-heal`**: al final de `rewriteReleaseCsv` en `heal.ts`, justo
después de escribir `release.csv`, se busca el baseline más reciente en `jul-ia-n/releases/` (ver
abajo) y, si existe, se le aplica la comparación ahí mismo — el CSV que sale del pipeline **ya viene
anotado**, nada que orquestar aparte en CI. Si no hay ningún archivo en `jul-ia-n/releases/`, o la
comparación falla por cualquier motivo (ej. sin `OPENAI_API_KEY` para embeddings): **no rompe la
corrida** — solo `log.warn` y el CSV sale sin anotar.

**2. Manual y aislado, vía CLI** (`tools/compareReleases.ts`) — sin correr `ai-heal` para nada:

```bash
# caso común: usa jul-ia-n/release.csv y el baseline más reciente de jul-ia-n/releases/
npm run ai-heal:compare-release

# caso manual/aislado: dos CSVs cualquiera, sin tocar jul-ia-n/release.csv
npm run ai-heal:compare-release -- \
  --current path/a/un.csv \
  --previous path/a/otro.csv \
  --previous-release-id v19.2 \
  --output path/de/salida.csv
```

En ambos casos: para cada fila del CSV actual (fresco, M/N todavía vacías salvo lo que haya escrito el
pipeline por `known-issue`), busca el mismo `Test Case Id` en el CSV anterior **entre las filas que sí
fueron revisadas** (M y N no vacías ahí). Si lo encuentra, compara el texto de `Error Identified` +
`Root Cause` de ambos releases con **embeddings** (mismo modelo/infra que la knowledge base,
`steps/knowledge.ts` — coseno, sin llamada a LLM por fila). Si la similitud supera
`AI_HEAL_RELEASE_COMPARE_THRESHOLD` (default **0.75** — más estricto que el umbral asesor de la KB
porque acá se copia una disposición humana completa, pero más laxo que el umbral de `known-issue`
porque no hay nada automático corriendo detrás, un humano sigue revisando el sheet):

- Copia **QA Review** y **Root cause QA** del release anterior **solo si esas celdas están vacías** en
  el CSV actual (nunca pisa algo que un humano ya haya escrito).
- Escribe **Comments QA** (columna O) como `[AI-HEAL: <release base>] <comentario del release base>`,
  ej. `[AI-HEAL: 41.2] Falla conocida del PSP`. Si el release base no tenía comentario queda solo la
  marca (`[AI-HEAL: 41.2]`). Si la celda ya tenía texto se conserva y solo se le antepone la marca; si
  ya traía una marca (p. ej. la de `known-issue`) no se toca.

No modifica el ruteo del pipeline ni el mecanismo `known-issue`.

#### Marca `[AI-HEAL: …]` en Comments QA — `steps/aiHealMarker.ts`

Es lo que permite distinguir una fila que dispuso ai-heal de una que revisó QA a mano. El dashboard
`e2e-dashboard` (sre-dev-portal) la cuenta en el panel 4 de Visualizations ("test cases with a known bug
identified by AI") y en la cobertura AI heal del Release Tracker, buscando el prefijo literal `[AI-HEAL:`
**al inicio** de Comments QA. Por eso:

- La marca va siempre primera en la celda, sin espacios delante.
- Se escribe aunque no haya comentario que copiar; sin ella la fila no cuenta.
- El baseline exportado desde el dashboard ya trae la marca del release anterior: se reemplaza en vez
  de encadenarse (`[AI-HEAL: 41.2] [AI-HEAL: 41.1] …`).
- Si QA edita Comments QA en el dashboard y borra el prefijo, la fila deja de contar como AI-heal en
  ese release. Para corregir el texto, conservar el prefijo.

Tests: `npm run ai-heal:test`.

#### `jul-ia-n/releases/` — dónde vive el baseline

Carpeta **git-tracked** (no está en `.gitignore` — a diferencia de `jul-ia-n/*.csv` y
`jul-ia-n/telemetry/runs/`, que sí lo están) con un archivo por release, cargado **a mano** una vez que
QA/dev terminan de revisar ese release:

```bash
cp path/al/csv-ya-revisado.csv jul-ia-n/releases/2026-07-01-v20.1.csv
git add jul-ia-n/releases/2026-07-01-v20.1.csv
git commit -m "ai-heal: promote v20.1 as cross-release comparison baseline"
```

Convención de nombre obligatoria: **`<YYYY-MM-DD>-<label>.csv`**. `findLatestReleaseCsv`
(`steps/compareReleases.ts`) elige el baseline por **sort de nombre de archivo**, no por fecha de
modificación — un checkout de git en CI resetea el mtime de todos los archivos al momento del checkout,
así que "el modificado más recientemente" no sirve para distinguir cuál es el release más nuevo; un
prefijo de fecha ISO sí ordena correctamente como string. Si algún archivo no sigue la convención,
`findLatestReleaseCsv` sigue funcionando pero deja un `log.warn` avisando que el orden podría no ser
el correcto.

Como el checkout de GitHub Actions (`actions/checkout`) ya trae esta carpeta con el resto del repo,
**no hace falta ningún step nuevo en el workflow** (nada de S3, nada de credenciales extra) — el
archivo ya está ahí cuando corre `npm run ai-heal`. La "promoción" de un nuevo baseline (punto de
arriba) es **deliberadamente manual y separada** de la corrida de CI: el CSV recién generado no sirve
de baseline hasta que QA/dev lo revisan, y eso pasa horas/días después de que termina la regresión,
fuera del ciclo de vida del job.

`AI_HEAL_PREVIOUS_RELEASE_CSV` sigue existiendo como override explícito (apuntar a un archivo puntual
en vez de auto-descubrir), útil para pruebas locales.
