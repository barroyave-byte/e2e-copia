# CLAUDE.md — jul-ia-n (ai-heal)

Guidance for Claude Code when working inside `jul-ia-n/`. This overrides nothing in the root
`CLAUDE.md` (Playwright DSL rules etc. still apply to any `playwright/**` file a subagent touches);
it adds context specific to this subsystem, which is NOT a Playwright test suite — it's an AI agent
pipeline that reads Playwright failures and proposes fixes for them.

## What this is

**jul-IA-N** is an AI pipeline that classifies Playwright test failures, investigates root cause, and
proposes/opens fixes (PR draft, GitHub Issue, or just enrichment) for DEUNA's e2e-testing suite.

There are **two entry points** — do not confuse them:

| Entry point | Command                                                  | What it does                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`  | `npm run jul-ia-n` / `npm run ai-summarize`              | Legacy/simple flow: normalize → one LLM summarization call → `release.csv`. This is the ONLY flow `README.md` documents.                                                                                                                                |
| `heal.ts`   | `npm run ai-heal -- --input <test-results.json> [flags]` | The real auto-heal pipeline — classify, dedup, route, fix, verify, open PR/Issue. **This is where active development happens.** Fully documented in `PIPELINE.md` (read it first for any pipeline question — it's kept up to date, unlike `README.md`). |

## Pipeline shape (heal.ts)

```
test-results.json → normalize → classify (LLM) → dedup (by signatureKey)
  → prepare KB once (embed entries + all leaders' query vectors)
  → per leader (pool of AI_HEAL_CONCURRENCY, default 10):
       enrich (lazy: trace.zip, error-context.md, IDs) → investigate (trivial adapter)
       → KB score → decideShortCircuit (none|route|apply|known-issue)
       → tier known-issue: write CSV/telemetry directly, STOP (no orchestrator/subagent/verify)
       → orchestrator (LLM, or synthesized from KB if route/apply) → confidence gate (0.8)
       → subagent dispatch (agentic or single-shot, or replayableFix if tier=apply)
       → enforceKindRules + validateFileChanges (allowlist)
       → verify (git worktree, Playwright x3, own semaphore AI_HEAL_VERIFY_CONCURRENCY=2)
       → submit (PR draft | Issue | nothing)
  → propagation (AI_HEAL_PROPAGATE, default on): for each duplicate of a leader whose
    fix reached a PR with verdict='ready-to-pr' — enrich → same subagent, with the
    leader's verified fix as input → verify (AI_HEAL_PROPAGATE_VERIFY_REPEAT, default 1)
    → commit onto the LEADER's branch + one summary comment on its PR
  → every other duplicate inherits leader's decision (0 LLM, 0 I/O); a known-issue leader's
    disposition is inherited structurally (csvStatus/csvIssueType copied), not just as text
  → telemetry/runs/<date>-<release>.json + release.csv rewritten
```

Read `PIPELINE.md` for the full stage-by-stage breakdown, the gates/safety-nets table, and the full
list of `AI_HEAL_*` env vars — don't duplicate that detail in conversation; cite it.

## Propagating a leader's fix to its duplicates

Dedup exists so one root cause costs one analysis. Until 2026-09-22 it also meant one
**fix**: duplicates inherited the leader's CSV text and their own specs stayed broken —
regression 39.2 opened 5 PRs for a rejected Kushki BIN and left 21 specs failing.

The propagation phase (`heal.ts`, after the leaders finish) closes that. Per duplicate of a
leader whose fix actually worked (`prResult='pr'` **and** `verdict='ready-to-pr'` — an
unverified fix is never propagated):

1. Skip when the leader's commit already covers it (shared helper/page object) →
   `prResult='propagated-covered'`.
2. Dispatch the **leader's own subagent** with `leaderFixSection` (the leader's verified
   fileChanges + reasoning) so it adapts the same idea to this spec's own file.
3. Refuse a proposal that touches a file the leader already changed: its contents come from
   the BASE version of that file, so committing it on the leader's branch would overwrite the
   leader's fix, and verify (which runs against base) could not judge it either →
   `propagation-declined`, re-check once the leader's PR merges.
4. `verify` it on its own, with `AI_HEAL_PROPAGATE_VERIFY_REPEAT` runs (default 1 — the
   leader already paid the majority-of-3 for this root cause).
5. Commit onto the **leader's PR branch** (`submitPropagatedFix`), then one
   `commentPropagationSummary` per leader listing what was carried over and what wasn't.
   Deliberately not N extra PRs: 20 one-line PRs for one bad BIN is review noise.

**verify is the safety net, not the prompt.** The subagent is told to decline when the fix
does not apply, and it does not always listen: asked to propagate the Kushki Visa swap to
`PI-T1606` (a debit-Mastercard case) it proposed the swap anyway. verify re-ran the spec,
the `assertPaymentMethod('debit_card')` assertion failed, the case became
`propagation-failed` and nothing was committed. Never let a propagated fix skip verify.

New `prResult` values, all rendered in the CSV (`steps/csv.ts`): `propagated`,
`propagated-covered`, `propagation-declined` (subagent said it doesn't apply),
`propagation-failed` (adapted fix didn't pass its re-run). `computeResolutionMetrics` is
untouched — its four tiers are leaders-only so they stay comparable across releases; the
run's propagated count lives in telemetry as `propagatedDuplicates`.

Caps: `AI_HEAL_PROPAGATE_MAX` (default 25 per run) bounds wall-clock, since each case is a
real Playwright run; the token budget is re-checked per case like everywhere else.

## Schema chain (zod, in `schemas/`)

Each stage extends the previous one — never bypass a stage or hand-construct a later type without
going through its builder function:

```
ClassifiedFailure → EnrichedFailure → InvestigatedFailure → Proposal → VerifiedProposal
```

`KnowledgeEntry` is separate (curated, not derived from a failure).

## The 12 subagents

Defined in `schemas/proposal.ts` (`SUBAGENT_NAMES`), routed by `agents/orchestrator.ts`, run via
`agents/subagents/index.ts`. **`assertFixer`**, **`cardFixer`** (added 2026-07-10 — a single-shot
`cardFixer` was found to hallucinate entire fabricated spec files with no grounding in the real one,
since it never saw the actual file contents; giving it read access fixed it), **`serviceInvestigator`**,
and **`testDataFixer`** (added 2026-07-09) are agentic (multi-turn tool loop via `runAgent`).
`assertFixer`/`cardFixer`/`testDataFixer` use `read_file`/`grep`/`glob` from `tools/subagentTools.ts`.
**`serviceInvestigator`** (migrated 2026-07-24, transport rebuilt 2026-08-04) instead calls DEUNA's
deployed **SRE Agent** through the central **LiteLLM `company_ai` MCP gateway**
(`https://dev-portal.deuna.io/litellm/company_ai/mcp`) via `tools/prodSreAgentClient.ts` +
`createProdSreAgentTools` in `tools/subagentTools.ts` — `rca_session_run` (starts an RCA
session from an auto-built scenario, no filesystem/scenarioPath needed), `rca_session_investigate`
(continuation — executes planned live-evidence actions), `artifact_read` (reads a bounded excerpt of
a server-local artifact path), plus `sre_agent_capabilities` (diagnostic only — the prompt tells the
agent NOT to open with it, since `rca_session_run` needs no discovery and iterations are capped at 8).
It no longer uses `query_cloudwatch`/repo tools at all — that raw
AWS-SDK tool (`createCloudWatchTool` in `tools/subagentTools.ts`, backed by `tools/cloudwatch.ts`) is
now dead code, kept around rather than deleted in case it's wanted again. serviceInvestigator's
`reasoning` is the RCA itself and now flows into the CSV's "AI Proposed Solution" column for
`bugLocation='service'` rows (see `steps/csv.ts` `HealCaseDecision.reasoning`) — not just telemetry.
The other 8 subagents are single-shot (`getStructuredOutput`). The agentic set is the
`AGENTIC_SUBAGENTS` constant in `agents/subagents/index.ts` — migrating another subagent to agentic
means adding it there and giving it tools in `resolveAgentTools`.

**The only supported route to the SRE Agent is the LiteLLM `company_ai` gateway — everything else is
explicitly retired.** Read this before "simplifying" the transport:

- The direct endpoint `https://dev-portal.deuna.io/sre-agent/mcp` is still routed but deprecated for
  clients and now only accepts LiteLLM-issued delegation (`sre-dev-portal/services/sre-agent/README.md`:
  "Direct employee client configuration is deprecated"). The old approach in this repo — a per-user
  Google OAuth ID token from `repograph-mcp-auth token` in `AI_HEAL_SRE_AGENT_MCP_TOKEN` — is named
  item-by-item on the "Unsupported legacy patterns" list in
  `sre-dev-portal/docs/DEUNA_AI_ARCHITECTURE.md` (workstation ID-token helper, `SRE_AGENT_MCP_TOKEN`,
  direct upstream URLs). Do not restore any of it, and do not add an interactive OAuth flow to `heal.ts`.
- Auth is a **workload** credential: `AI_HEAL_LITELLM_MCP_KEY`, the MCP-only virtual key of ai-heal's
  own LiteLLM team, injected as a CI secret. Precedent and call contract:
  `sre-dev-portal/services/aws-devops-agent-repograph-edge/internal/edge/handler.go`. Never reuse an
  employee `deuna-ai` session for this.
- **The team grant is the real dependency, not the code.** `rca_session_run` /
  `rca_session_investigate` / `artifact_read` are `ai-operator` tier with `approval:
"operator_entitlement"` in `sre-dev-portal/services/litellm/policy/mcp-tools.staging.json`, so a
  workload holding them needs explicit SRE/AI-Platform sign-off. Status and the exact ask live in
  `docs/sre-agent-workload-access-request.md`. Until that key exists `serviceInvestigator` throws
  immediately with an actionable message instead of silently degrading — that's deliberate.
- Transport specifics that are easy to get wrong: the gateway is **streamable-HTTP MCP with session
  semantics** (needs `initialize`, echoes `mcp-session-id`, may answer `text/event-stream`), and tool
  names are namespaced by upstream alias (`prod_sre_agent-rca_session_run`). The alias, the
  `company_ai` access group on that server, and the four tools being inside the server's global
  `allowed_tools` ceiling were all read off the live LiteLLM Admin UI on 2026-08-04 — **not** inferred
  from `teams.staging.json`, which is bootstrap-only and is already behind runtime (the live server also
  carries `monitoring` and `execs` access groups that appear nowhere in the fixture). Hand-rolled in
  `prodSreAgentClient.ts` on purpose rather than pulling in `@modelcontextprotocol/sdk` — this
  `package.json` is shared with the whole Playwright suite and its ECR image, where a new runtime dep
  has broken CI before. Retries are narrow by design: only 429 and expired-session (both provably
  pre-dispatch), never 5xx/timeout, because `rca_session_run` is not in the gateway's `retryable_tools`
  allowlist and a replay would open a second RCA session for the same failure.
- `rca_session_run` now requires `accountAlias` **together with** `environment` for any scenario that
  plans CloudWatch/log evidence, and rejects an alias that contradicts the scenario's own evidence
  (`internal/tools/rca_session_run.go` → `validateRCASessionRuntimeTarget`). `subagentTools.ts` derives
  it from `AI_HEAL_ENVIRONMENT` using `sre-dev-portal/docs/MCP_AWS_ACCOUNT_CONTEXT.md`'s vocabulary —
  note staging E2E traffic is account alias **`dev`** (790714449507), not `sre`.

**`assertFixer`/`testDataFixer`/`selectorFixer` also get `run_test`** (`assertFixer`/`testDataFixer`
added 2026-07-28, `selectorFixer` added 2026-07-29; `tools/subagentTools.ts` → `createRunTestTool`) —
the run-it-yourself pattern `cardFixer` already had externally (its retry loop in `heal.ts`), given to
these three as an in-loop tool instead, since none has a bespoke orchestrator-level retry. Lets the
agent apply a candidate `fileChanges` to a throwaway worktree and run the real test once
(`tools/playwrightRunner.ts` → `runIsolated`, its own concurrency budget —
`AI_HEAL_AGENT_VERIFY_CONCURRENCY`, def. 2, separate from `steps/verify.ts`'s own semaphore) — before
ever calling `submit_proposal`. Enforces the same path allowlist as the final gate
(`util/allowlist.ts`, shared — not a second copy). Real effect observed on the `PI-T1666` golden (see
Known gaps below): the subagent now actually tries a candidate fix and reads back _why_ it failed,
instead of only speculating — materially more grounded `enrichment_only` reasoning even in cases that
still don't cross into a verified `diff`. Trade-off: a case that exercises this can cost 10x the tokens
and take minutes instead of seconds (worktree + real browser run, possibly more than once) — the tool's
own description tells the model to use it "sparingly," but there's no hard cap yet beyond the shared
`AGENT_MAX_ITERATIONS` (8).

**`selectorFixer` migrated to agentic 2026-07-29**, after a bake-off against Playwright's native
`playwright-test-healer` (`.claude/agents/playwright-test-healer.md`, scaffolded by
`npx playwright init-agents` — already in this repo since 2026-02-21, per `git log`) turned up two
things:

1. **Not a drop-in swap.** The native healer only runs inside an interactive agentic-loop session
   (Claude Code/Copilot/VS Code — `init-agents --loop <provider>`), driving a live browser via MCP
   (`test_run`/`test_debug`/`browser_snapshot`). There's no headless/programmatic entry point to call it
   from `heal.ts`'s unattended batch loop the way `dispatchSubagent` calls `selectorFixer`. Its
   `Edit`/`Write`/`MultiEdit` tools also carry **no path allowlist** — using it as-is would regress the
   safety posture every other subagent is held to. `docs/ai-heal-plan.md` (the original jul-IA-N design
   doc, written before any of this code existed) already lists this exact agent file as `selectorFixer`'s
   **conceptual reference** — the native healer was the seed idea, not an unexplored alternative.
2. **The real gap was elsewhere.** Checking `selectorFixer`'s actual output on the last real run
   (2026-07-24): **26 of 26** real cases produced nothing but the generic "AI analysis only — manual
   review required" stub — not because the category was unfixable, but because `selectorFixer` was the
   one subagent still single-shot with **zero tool access**, reasoning only off the frozen `domSnapshot`
   from `enrich` and never reading the actual page-object file it would need to ground a new locator in.
   Same fix already proven for `assertFixer`/`testDataFixer` (item above) applies directly. No fixture
   exists yet to validate this end-to-end the way the 3 `assertFixer` goldens do — see Known gaps.

**Pruned (2026-06-22):** `threeDsInvestigator`, `flakyMarker`, `setupFixer` were removed (with their
`three_ds_flow`/`flaky`/`setup_failure` `rootCauseCategory` values) after a deliberate review —
`threeDsInvestigator` never produced anything actionable (always `kind="enrichment_only"`);
`flakyMarker`/`setupFixer` did produce mechanical diffs (`@flaky` tag, `test.retry`) but the team
decided they weren't worth keeping either. Failures that used to hit these three now classify as
`unknown` and route to `humanEscalator` (`prompts/group.ts` + `prompts/orchestrator.ts` both have the
remapping spelled out explicitly — read those before re-introducing any of the three categories).

Every subagent output passes through `enforceKindRules` (downgrades invalid `kind=diff`/`issue` to
`enrichment_only`), then `validateFileChanges` (allowlist below), then `scanForSecrets`
(`tools/secretsScan.ts`, gitleaks) and `scanForVulnerabilities` (`tools/codeScan.ts`, semgrep) — see
safety rails below for both. Never weaken these checks to "fix" a failing case — fix the prompt or the
subagent logic instead.

## Safety rails — do not loosen without explicit user sign-off

- **Path allowlist** (`agents/subagents/index.ts`): subagents may only touch
  `playwright/tests/**`, `playwright/pages/**`, `playwright/support/interfaces/**`.
  Denylist explicitly blocks `playwright.config.ts`, `playwright/support/fixtures/`,
  `playwright/support/http/`, `jul-ia-n/`, `.github/`.
- **Confidence gate**: orchestrator decision below `--confidence-threshold` (default 0.8) halts the
  case for human triage — never auto-lowers this from code.
- **verify gate**: a PR only opens if the worktree re-run of the test passes ≥2/3 times
  (`steps/verify.ts`). `kind=diff` always goes through this; other kinds skip it (nothing to verify).
- **KB short-circuit tiers** (`steps/knowledge.ts`, `decideShortCircuit`): `apply` (skips both LLM
  calls) requires an **exact `testCaseId` match** + `replayableFix` on the KB entry — this is
  deliberately strict (no fuzzy-match short-circuits). Don't relax the exact-match requirement.
- **`known-issue` tier** (same function): exact `testCaseId` match + score ≥
  `AI_HEAL_KB_KNOWN_ISSUE_THRESHOLD` (default 0.95, deliberately stricter than the 0.9 used by
  `route`/`apply`) + entry has `knownExternalIssue` + category agrees when the entry sets one. This
  tier skips `verify` too — there is **no safety net** if the match is wrong, since nothing gets
  executed. Don't lower this threshold or drop the category check without a real false-positive cost
  analysis: a wrong match here silently tells QA/devs "don't review this," hiding a real bug.
- **Budget/PR caps**: `AI_HEAL_BUDGET_USD` (default 5) and `AI_HEAL_PR_CAP` (default 50) stop the run;
  under concurrency the overshoot is bounded by `AI_HEAL_CONCURRENCY`, a known/accepted tradeoff.
- **Secrets scan** (`tools/secretsScan.ts`, added 2026-07-28): every `kind=diff` proposal is written to
  a throwaway directory and scanned with `gitleaks detect --no-git` (default ruleset) before it can
  reach `verify`/PR. A match downgrades to `enrichment_only`, same as an allowlist violation. **Fails
  closed** if the `gitleaks` binary isn't installed (throws, does not silently skip) — mirrors the
  `prod-sre-agent` client's convention for required external dependencies. Not yet wired into CI as a
  standalone check; only runs inline as part of `heal.ts`.
- **Code scan** (`tools/codeScan.ts`, added 2026-07-28): same throwaway-directory approach, scanned with
  `semgrep scan --config p/security-audit --config p/typescript`. Two gotchas worth knowing before
  touching this: (1) semgrep's **default** `.semgrepignore` excludes any path containing `test`/`spec`
  — i.e. jul-IA-N's entire allowlist — so an empty `.semgrepignore` is written into the scan root to
  override it; without that the scan silently finds nothing. (2) `--config auto` logs in to the Semgrep
  Registry with the project URL, so named public rulesets are used instead. Only **`ERROR`**-severity
  findings downgrade the proposal to `enrichment_only`; `WARNING`/`INFO` are logged as advisory only,
  since the community ruleset has a real false-positive rate against a repo whose allowlisted surface is
  deliberately full of test card numbers and mock credentials (`tools/cardPool.ts`). Revisit the
  severity cutoff once there's a few weeks of real findings to tune against. Same fail-closed convention
  as the secrets scan if the `semgrep` binary is missing.

## Knowledge base (`knowledge/database/*.json`)

One JSON file per entry, schema in `schemas/knowledgeEntry.ts`. `symptom` is what gets embedded
(OBSERVABLE failure text, not the fix); `recipe` is the human-readable fix directive; `replayableFix`
(optional) is a literal `FileChange[]` patch — only set it for mechanical, repo-stable fixes (not
fixes tied to line numbers that will drift). `knownExternalIssue` (optional, `{csvStatus,
csvIssueType}`) marks a recurring, non-actionable failure (e.g. a PSP decline with no fix on our
side) — **mutually exclusive with `replayableFix`**; an entry with both is skipped at load time
(`loadKnowledgeBase` logs a warning). Adding a new entry: prefer the `ai-heal-add-knowledge` skill
over hand-writing the JSON.

## CSV columns outside A-H (`steps/csv.ts`)

`release.csv` gets imported into a master regression spreadsheet in Sheets that has more columns
than this pipeline generates. Columns I-L (`Owner (dev)`, `Evidence by team...`, `Dev Solution`,
`Status Review Dev`) exist in `CSV_HEADERS` purely as position placeholders — **never write to
them**, they're filled manually downstream. Columns M (`QA Review`) and N (`Root cause QA`) are the
only ones this pipeline writes outside A-H, and only when `shortCircuit === 'known-issue'` (values
come straight from the matched entry's `knownExternalIssue.csvStatus`/`csvIssueType`). Every other
row leaves M/N empty — don't default them to anything else.

## Models (`models/`)

Provider-agnostic via `AI_PROVIDER=openai|anthropic` (`models/index.ts` dispatches). Two primitives:
`getStructuredOutput` (single-shot, forced tool call) and `runAgent` (multi-turn loop, terminal
`submit_proposal`/`route_failure` tool). Both implemented for **both** providers — if you change the
agent loop semantics, update `models/anthropic.ts` AND `models/openai.ts`, and re-run parity
(`npm run ai-heal:parity`). Embeddings (`models.embed`) are **always OpenAI** regardless of
`AI_PROVIDER` — requires `OPENAI_API_KEY` even when running fully on Anthropic.

Every `getStructuredOutput`/`runAgent` call in both provider files reports itself to Langfuse via
`util/tracing.ts` → `logGeneration()` (added 2026-07-28) right before returning — model, input, output,
usage, and cost (reusing `util/cost.ts`, the same pricing table `heal.ts` uses for its own budget
tracking; extracted from `heal.ts` into a shared module specifically so tracing could use it too, not
just to avoid duplication). **Opt-in and fail-safe**: unset `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`
in `.env` and every call becomes a no-op; a Langfuse ingestion failure is caught and logged, never
thrown — tracing can't break a run. Local self-host lives at `jul-ia-n/infra/langfuse/` (Docker Compose,
Langfuse's own official compose file) — see that folder's `README.md` for setup and two real gotchas
hit standing it up (Postgres/MinIO passwords aren't auto-derived from the vars you'd expect). Each call
flushes immediately (`flushAsync()`) rather than relying on background batching, because `heal.ts` /
`eval` / `bench` are short-lived scripts that `process.exit()` — an unflushed batch would be silently
dropped.

**Four-tier %-resolved metric** (`steps/metrics.ts` → `computeResolutionMetrics`, added 2026-07-29) —
the honest version of "% resolved" presented to the CEO/CTO: a single number invites the wrong
follow-up question. Tiers, over **leaders only** (duplicates would double-count a root cause):
`resolved` (`pr`/`issue`/`known-issue`), `assisted` (`prResult='none'` but a real verified attempt was
made and failed — `verdict='needs-human'` or `cardAttempts.length>0`), `escalated`
(`skipped-low-confidence*`), `classifiedOnly` (everything else — still got classify+enrich, no
actionable signal). Computed at the end of every `heal.ts` run from the same `cases: CaseTelemetry[]`
already in memory — not a new data source. Written into the run's own `telemetry/runs/*.json` (new
`resolutionMetrics` field) and pushed to Langfuse as four `NUMERIC` scores (`resolved-pct` etc.) on a
`release-summary` trace tagged `sessionId=releaseId`, so it's chartable release-over-release directly in
Langfuse's Scores view — no bespoke dashboard. `npm run ai-heal:metrics -- --run <telemetry.json>
[--push]` recomputes/backfills this for any historical run (all 17 pre-existing files in
`telemetry/runs/` were backfilled this way when the metric was added — one had no `cardAttempts` field
at all, predating that addition to the schema, which is why `computeResolutionMetrics` treats it as
optional rather than assuming every historical file matches today's shape).

## Iterating without running the full pipeline

| Command                                                                    | Use for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ai-heal -- --input <test-results.json> --testcase <ID> --dry-run` | One case, no PR/Issue side effects.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run ai-heal:bench -- --fixture <path> [--kb]`                         | Run a single subagent in isolation against a fixture (`eval/fixtures/assertFixer/*.json`). `AI_HEAL_LOG_LEVEL=debug` to see tool calls.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `npm run ai-heal:kb -- --query "<text>" \| --fixture <path>`               | Test KB retrieval/scoring only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `npm run ai-heal:parity <test-results.json>`                               | Compare OpenAI vs Anthropic classifier output (needs both API keys).                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `npm run ai-heal:eval`                                                     | Golden-case regression suite (Promptfoo, real LLM calls) — see Known gaps below for current pass rate.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `npm run ai-heal:metrics -- --run <telemetry.json> [--push]`               | Recompute the four-tier %-resolved breakdown for any run; `--push` (re-)publishes it to Langfuse.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npm run ai-heal:sre-smoke`                                                | Offline check of `serviceInvestigator`'s SRE Agent transport (fake `company_ai` gateway: handshake, session reuse, SSE, tool prefix, 429/expired-session retries). No credential, no LLM, no network.                                                                                                                                                                                                                                                                                                                                   |
| `npm run ai-heal:sre-preflight [-- --rca]`                                 | Real-gateway check that the workload key's **grants** landed — run once per key issue/rotation. Without `--rca` it stops at `sre_agent_capabilities`, which a team missing `operator_entitlement` still passes; `--rca` fires `rca_session_run` and is the only conclusive stage. Needs the key in the env, so in practice it runs via the `ai-heal SRE Agent preflight` workflow (`.github/workflows/ai-heal-sre-preflight.yml`, `workflow_dispatch`) — the key exists only as a GitHub Actions secret and secrets can't be read back. |

## Known gaps (check before assuming these are solved)

- **Real, still-failing gap found by the eval suite (2026-07-28, re-checked after `run_test` landed):**
  `PI-T1666` is a golden case that exists specifically to exercise the `diff` branch — its `_note`
  describes a race condition with an exact-match KB entry (`nupay-request-race-condition`) whose recipe
  is "await the request before asserting." Run with `--kb`, `lookupKnowledge` does find the exact match
  (score 0.742) and injects the prior-art section, but `assertFixer` still returns `kind=enrichment_only`
  instead of applying the recipe. Before `run_test` existed, this was a black-box "it just says
  enrichment_only" gap. With `run_test`, `assertFixer` now actually **tries** the recipe — it proposed a
  waiter on the purchase POST response, ran it, watched it fail (the response it waits on isn't the
  final-status one; a broader GET-based waiter tried in a second attempt also failed because the matcher
  caught another order's response), and gave up after 2 verified-failing attempts with a much more
  precise, evidence-grounded `enrichment_only` explanation than before — not "I can't tell", but
  "I tried X, it failed because Y, here's exactly which page-object method needs a narrower matcher."
  That's arguably the _correct_ call, not a bug: the KB recipe's one-line summary undersells how fiddly
  this specific race condition is. Still counts as the golden failing by its literal assertion (kind
  must be `diff`) — don't fix by editing the fixture/prompt to force a pass; if anything this suggests
  the KB entry's `recipe` field needs more detail, or the golden's expectation needs revisiting once a
  human confirms the narrower-matcher fix actually works. See `eval/run-eval.ts`.
- `ai-heal:eval` (`eval/run-eval.ts`) is now implemented — a Promptfoo-based golden runner, real LLM
  calls against `eval/fixtures/**`, run via `npm run ai-heal:eval`. As of 2026-07-28: 2/3 pass (see gap
  above for the one failure). Two non-obvious integration details if touching this file: a custom
  provider's `id` must be a function (`() => 'name'`), not a string — a string silently fails provider
  resolution and surfaces as an unrelated `chalk.default.bold is not a function` crash; and evaluation
  runs via `promptfoo.evaluate()` called programmatically (not the `promptfoo` CLI against a YAML
  config), so the provider can call `dispatchSubagent()` directly in TypeScript.
- `README.md` only documents the legacy `index.ts` flow; it does not mention `heal.ts` at all. Don't
  treat it as current docs for the auto-heal pipeline — use `PIPELINE.md`.
- Anthropic's `runAgent` loop has working code for both providers but historically only
  `AI_PROVIDER=openai` has been exercised in real runs — verify before assuming the Anthropic path is
  battle-tested.
- `serviceInvestigator`'s agentic path (real `rca_session_run`/`rca_session_investigate`/`artifact_read`
  calls) **still has not been exercised end-to-end against the deployed SRE Agent** — no bench fixture
  exists for it (`eval/fixtures/` has none for this subagent). As of 2026-08-04 the reason is no longer
  a per-user token: the transport was rebuilt onto the supported LiteLLM `company_ai` gateway and is
  CI-safe by design, but ai-heal's LiteLLM workload team and its MCP-only key don't exist yet — that ask
  is `docs/sre-agent-workload-access-request.md` and needs SRE/AI-Platform approval, since the three RCA
  tools are `operator_entitlement`. Two consequences: the handshake/SSE/tool-prefix path in
  `prodSreAgentClient.ts` is type-checked but **unverified against the real gateway** (first smoke test
  is in that doc), and until then the subagent fails fast rather than producing an RCA. A no-credential
  way to get a first fixture: `sre-dev-portal/services/sre-agent/app` has
  `go run ./cmd/sre-agent rca quick-slice --report <test-results.json>` (see its `docs/E2E_CONTEXT_LAB.md`),
  which ingests a Playwright report locally and emits an `agent-packet.json`.
- **No `selectorFixer` fixture exists** (`eval/fixtures/` only has `assertFixer/*.json`) — its 2026-07-29
  migration to agentic (see "The 12 subagents" above) is type-checked and structurally wired the same
  way as `assertFixer`/`testDataFixer`, but hasn't been run end-to-end against a real `ui_element_missing`
  case the way the `assertFixer` goldens validate that migration. Building one from a real recent
  `ui_element_missing` failure (e.g. `ADM-T511`, `ADM-T548` — see `release.csv`) and adding it to
  `eval/run-eval.ts` is the natural next step before trusting this in production.
- ~~The CSV throws away real subagent reasoning for `bugLocation='e2e'` + `kind=enrichment_only`
  cases~~ **Fixed 2026-07-29.** `CaseTelemetry`/`HealCaseDecision` had no `reasoning` field at all —
  `steps/csv.ts` always wrote a generic literal string ("AI analysis only — manual review required...")
  for `enrichment_only`/`needs-human`/`skipped-low-confidence` rows, regardless of what the model
  actually said, because the text was never threaded through in the first place (not a deliberate
  discard). Found while investigating why `selectorFixer` looked non-functional (above) — the CSV column
  made it _look_ like the subagent produced nothing, when the real issue there was tool access, but this
  generic-stub behavior was separately real and affected every subagent's `bugLocation='e2e'`
  enrichment_only case (roughly the largest outcome bucket — `none` was 55/87 leaders in the 2026-07-24
  run). Fix: `heal.ts` now sets `caseLog.reasoning` from `decision.reasoning` (orchestrator, as soon as
  it runs) and overwrites it with `verified.reasoning` (subagent's own, a superset) once a subagent
  dispatches; `steps/csv.ts`'s `formatHealSolutionBase` uses it (trimmed to 500 chars,
  `reasoningSnippet()`) wherever it used to hardcode a stub, falling back to the exact original stub text
  when `reasoning` is null (short-circuit tiers that never call an LLM). Duplicates get this for free —
  they already embed the leader's fully-formatted string.
