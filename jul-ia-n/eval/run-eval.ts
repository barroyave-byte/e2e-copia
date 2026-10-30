import 'dotenv/config';

import { readFileSync } from 'fs';
import { resolve } from 'path';

import promptfoo from 'promptfoo';

import { dispatchSubagent, SubagentContext } from '../agents';
import { AI_PROVIDER, MODEL_REASONING } from '../models';
import { InvestigatedFailureSchema } from '../schemas/investigatedFailure';
import { SubagentName } from '../schemas/proposal';
import { formatKnowledgeSection, lookupKnowledge } from '../steps/knowledge';

/**
 * The golden-case regression runner `package.json`'s `ai-heal:eval` script has
 * pointed at since before this file existed. Runs each hand-curated fixture in
 * eval/fixtures/**\/*.json through the real subagent (real LLM call, same
 * dispatchSubagent() the pipeline uses) and asserts on the resulting
 * Proposal's structured fields via Promptfoo.
 *
 *   npm run ai-heal:eval
 *
 * The expected behavior per fixture is human-authored in that fixture's
 * "_note" field — GOLDENS below is a mechanical translation of those notes
 * into checkable assertions, not an independent source of truth. When you add
 * a fixture, read its _note and add a matching entry here.
 *
 * Two non-obvious things about the Promptfoo integration itself:
 *  - A custom provider's `id` must be a *function* (`() => 'name'`), not a
 *    string. Passing a string silently fails provider resolution inside
 *    Promptfoo (surfaces as an unrelated `chalk.default.bold is not a
 *    function` crash in its own error-formatting path — the real problem is
 *    "could not identify provider", not chalk).
 *  - We call promptfoo.evaluate() programmatically rather than shelling out
 *    to the `promptfoo` CLI against a YAML config, so the provider can just be
 *    a plain async function that calls dispatchSubagent() directly — no need
 *    to get Promptfoo's config loader to transpile our TypeScript.
 */

interface GoldenCase {
  fixture: string;
  kb?: boolean;
  description: string;
  /** JS expression evaluated with `output` (the returned Proposal-shaped object) in scope. */
  assert: string;
}

const GOLDENS: GoldenCase[] = [
  {
    fixture: 'eval/fixtures/assertFixer/PAYM-T1931.json',
    description:
      'assertFixer: low-signal boolean assertion (trace logs) — must NOT rewrite, must flag enrichment_only',
    assert: "output.kind === 'enrichment_only'",
  },
  {
    fixture: 'eval/fixtures/assertFixer/RECON-T18.json',
    description:
      'assertFixer: assertion is correct (real propagation bug) — must NOT rewrite, must flag enrichment_only',
    assert: "output.kind === 'enrichment_only'",
  },
  {
    fixture: 'eval/fixtures/assertFixer/PI-T1666.json',
    kb: true,
    description:
      'assertFixer + KB prior art: race condition — must propose a diff that awaits before asserting',
    assert: "output.kind === 'diff' && output.fileChanges.some(f => /await/i.test(f.contents || ''))",
  },
];

const JUL_IA_N_ROOT = resolve(__dirname, '..');

const aiHealProvider = {
  id: () => 'ai-heal-subagent',
  callApi: async (_prompt: string, context?: { vars: Record<string, unknown> }) => {
    const fixturePath = String(context?.vars.fixture ?? '');
    const useKb = Boolean(context?.vars.kb);

    const raw = JSON.parse(readFileSync(resolve(JUL_IA_N_ROOT, fixturePath), 'utf-8'));
    const subagent = raw._subagent as SubagentName;
    const failure = InvestigatedFailureSchema.parse(raw);
    const ctx: SubagentContext = { failure };

    if (useKb) {
      const matches = await lookupKnowledge(failure);
      ctx.knowledgeSection = formatKnowledgeSection(matches) || undefined;
    }

    const { proposal, model, usage } = await dispatchSubagent(subagent, ctx);
    return {
      output: {
        testCaseId: failure.testCaseId,
        subagent: proposal.subagent,
        kind: proposal.kind,
        confidence: proposal.confidence,
        fileChanges: proposal.fileChanges,
        reasoning: proposal.reasoning,
        model,
      },
      tokenUsage: usage as Record<string, number> | undefined,
    };
  },
};

const main = async (): Promise<void> => {
  console.log(
    `\n=== ai-heal golden eval — ${GOLDENS.length} case(s), provider=${AI_PROVIDER}, model=${MODEL_REASONING} ===\n`,
  );

  const evalResult = await promptfoo.evaluate(
    {
      prompts: ['{{fixture}}'],
      providers: [aiHealProvider],
      tests: GOLDENS.map((g) => ({
        description: g.description,
        vars: { fixture: g.fixture, kb: g.kb ?? false },
        assert: [{ type: 'javascript' as const, value: g.assert }],
      })),
    },
    { showProgressBar: false, maxConcurrency: 1 },
  );

  let failures = 0;
  for (const r of evalResult.results) {
    const status = r.success ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${r.testCase.description}`);
    if (!r.success) {
      failures++;
      console.log(`       reason: ${r.gradingResult?.reason ?? r.error ?? 'unknown'}`);
      const out = r.response?.output;
      console.log(`       got: ${JSON.stringify(out).slice(0, 300)}`);
    }
  }

  console.log(`\n${GOLDENS.length - failures}/${GOLDENS.length} golden case(s) passed.\n`);
  if (failures > 0) process.exit(1);
};

main().catch((err) => {
  console.error('eval error:', err);
  process.exit(1);
});
