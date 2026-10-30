# jul-IA-N — eval suite

Tests internos para validar el agente sin pegar a producción.

## Parity test (OpenAI vs Anthropic)

Ejecuta ambos clasificadores sobre el mismo `test-results.json` y compara los `ClassifiedFailure[]` resultantes. Permite validar la migración de OpenAI GPT-5.2 a Anthropic Claude Haiku 4.5.

**Threshold:** ≤5% diferencia por campo (≥95% match en `rootCauseCategory`, `isCredentialIssue`, `teamOwner`).

```bash
# Ambas keys en .env (OPENAI_API_KEY + ANTHROPIC_API_KEY)
npm run ai-heal:parity playwright-report/test-results.json
```

Si el test falla, revisa los primeros 5 mismatches por campo (se imprimen en stdout) para identificar si es un caso edge legítimo (revisar en `prompts/group.ts`) o un patrón sistemático de divergencia entre modelos (puede requerir ajuste del prompt o del schema).

**Exit code:** 0 si todos los campos pasan el threshold, 1 si alguno falla. Útil para CI.

## Golden cases (`run-eval.ts`)

No-regresión real contra `eval/fixtures/**/*.json`, vía [Promptfoo](https://www.promptfoo.dev/) llamado programáticamente (no la CLI de promptfoo contra un YAML — el provider es una función TS que llama `dispatchSubagent()` directo, así no hace falta que promptfoo transpile nuestro TypeScript).

```bash
npm run ai-heal:eval
```

Promptfoo no está en el `package.json` raíz: arrastra ~1 GB de dependencias (Codex, Claude Agent SDK, onnxruntime, un Chromium propio…) que ningún test ni shard de CI usa. Vive en `jul-ia-n/eval/package.json` con su propio lockfile; `npm run ai-heal:eval` corre primero `npm run ai-heal:eval:install` (`npm ci --prefix jul-ia-n/eval`). Por eso el `tsconfig.json` raíz excluye `run-eval.ts`; para typecheckearlo: `npm run ai-heal:eval:install && npx tsc -p jul-ia-n/eval`.

Cada fixture es un `InvestigatedFailure` real con un campo `_note` escrito a mano describiendo el comportamiento esperado (el `_note` es la fuente de verdad — los casos golden en `run-eval.ts` son una traducción mecánica de esas notas a asserts). Al día de hoy solo hay fixtures de `assertFixer`; agregar fixtures de otros subagentes es agregar más `GoldenCase` en `run-eval.ts`, no un mecanismo nuevo.

**Estado (2026-07-28):** 2/3 casos pasan. `PI-T1666` (con `--kb`) encuentra el match exacto en la memoria (`nupay-request-race-condition`, score 0.742) pero `assertFixer` igual devuelve `enrichment_only` en vez de aplicar la receta — gap real de cómo se usa el "prior art" de la KB, documentado en `CLAUDE.md` → Known gaps. No se "arregló" ajustando el fixture o el prompt para que pase; queda abierto a propósito.

**Exit code:** 0 si todos los casos pasan, 1 si alguno falla. Pensado para gatear CI una vez que el pipeline se conecte ahí.
