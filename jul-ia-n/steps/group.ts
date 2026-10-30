import { getStructuredOutput, MODEL_CLASSIFY, ReasoningEffort } from '../models';
import { GROUP_PROMPT } from '../prompts/group';
import {
  ClassifiedFailure,
  FailureAnalysis,
  FailureAnalysisSchema,
  ROOT_CAUSE_CATEGORIES,
  TEAM_OWNERS,
} from '../schemas/classifiedFailure';
import { pLimit } from '../util/concurrency';
import { log } from '../util/log';
import { buildCsv } from './csv';

// A classify call must keep its JSON output under the model's max_tokens, or the
// tool_use gets truncated and `failures` comes back undefined. It must also
// finish inside the provider's request timeout — a single call covering
// hundreds of failures generates a huge non-streamed structured-output
// response and can simply run too long (this is what happened with a
// 308-failure run: one giant call to a reasoning model timed out after
// ~10 minutes). Two levers:
//
// 1. Default (chunking OFF below the auto-chunk threshold): one call with a
//    high max_tokens. Simple, and dedup groups on the LLM's `signatureKey` —
//    keeping every failure in a single call maximises consistent fingerprints
//    across identical errors, so grouping is not at risk. Fine for small runs.
// 2. Chunking ON: split by failure count and classify in parallel. Scales
//    without a hard ceiling on latency, but identical failures in different
//    chunks are classified separately, so their `signatureKey` (and thus dedup
//    grouping) could diverge.
//
// Chunking auto-enables once the failure count exceeds CLASSIFY_CHUNK_SIZE, so
// a normal-sized run stays a single call while an unusually large run (like
// the 308-failure spike) is automatically split instead of blowing past the
// request timeout — no one has to remember to flip a flag as volume grows.
// AI_HEAL_CLASSIFY_CHUNKING, when explicitly set, overrides this auto-decision
// either way (force on for debugging, or force off e.g. to keep signatureKey
// consistency for a known-small run).
const CLASSIFY_CHUNKING_OVERRIDE =
  process.env.AI_HEAL_CLASSIFY_CHUNKING === undefined
    ? null
    : process.env.AI_HEAL_CLASSIFY_CHUNKING === 'true';
const CLASSIFY_AUTOCHUNK_ENABLED = (process.env.AI_HEAL_CLASSIFY_AUTOCHUNK || 'true') === 'true';
const CLASSIFY_CHUNK_SIZE = Math.max(1, Number(process.env.AI_HEAL_CLASSIFY_CHUNK_SIZE || '40'));
const CLASSIFY_CONCURRENCY = Math.max(1, Number(process.env.AI_HEAL_CLASSIFY_CONCURRENCY || '4'));
// Output cap per classify call. Default 64000 = Claude Sonnet 4's max output;
// lower it (or switch models) via env if your model's ceiling differs.
const CLASSIFY_MAX_TOKENS = Math.max(1, Number(process.env.AI_HEAL_CLASSIFY_MAX_TOKENS || '64000'));
// OpenAI-only (models/openai.ts reads it, Anthropic ignores it): classify is
// repetitive structured output over already-normalized failure text, not deep
// reasoning, so a low effort level trades away hidden reasoning-token latency
// that isn't buying us anything here.
const CLASSIFY_REASONING_EFFORT = process.env.AI_HEAL_CLASSIFY_REASONING_EFFORT || 'low';

interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

const failureAnalysisToolSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['failures'],
  properties: {
    failures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'testCaseId',
          'testDescription',
          'teamOwner',
          'errorIdentified',
          'rootCause',
          'signatureKey',
          'rootCauseCategory',
          'isCredentialIssue',
          'failedStep',
        ],
        properties: {
          testCaseId: { type: 'string' },
          testDescription: { type: 'string' },
          teamOwner: { type: 'string', enum: [...TEAM_OWNERS] },
          errorIdentified: { type: 'string' },
          rootCause: { type: 'string' },
          signatureKey: { type: 'string' },
          rootCauseCategory: { type: 'string', enum: [...ROOT_CAUSE_CATEGORIES] },
          isCredentialIssue: { type: 'boolean' },
          failedStep: { type: 'string' },
        },
      },
    },
  },
};

/**
 * Split the normalized report into per-failure blocks. normalize.ts collapses
 * each error to a single line, so the only `\n---\n` in the report is the block
 * delimiter — the split is unambiguous.
 */
const splitReportIntoBlocks = (reportText: string): string[] => {
  const body = reportText.replace(/^FAILED TESTS:[^\n]*\n+/, '');
  return body
    .split(/\n-{3}\n/)
    .map((b) => b.trim())
    .filter(Boolean);
};

const buildChunkReport = (blocks: string[]): string =>
  `FAILED TESTS: ${blocks.length}\n\n${blocks.join('\n---\n\n')}\n---\n`;

const classifyChunk = async (
  chunkReport: string,
  chunkIndex: number,
  chunkCount: number
): Promise<{ failures: ClassifiedFailure[]; model: string; usage: TokenUsage }> => {
  const result = await getStructuredOutput<FailureAnalysis>({
    model: MODEL_CLASSIFY,
    systemPrompt: GROUP_PROMPT(),
    userInput: chunkReport,
    toolName: 'classify_failures',
    toolDescription:
      'Classify a list of Playwright E2E test failures by root cause and team owner.',
    inputSchema: failureAnalysisToolSchema,
    temperature: 0,
    maxTokens: CLASSIFY_MAX_TOKENS,
    reasoningEffort: CLASSIFY_REASONING_EFFORT as ReasoningEffort,
  });

  // Truncated tool_use comes back without `failures`; surface a clear, actionable
  // error instead of the opaque ZodError that FailureAnalysisSchema.parse throws.
  const data = result.data as Partial<FailureAnalysis> | undefined;
  if (!data || !Array.isArray(data.failures)) {
    throw new Error(
      `classify chunk ${chunkIndex + 1}/${chunkCount} returned no failures array ` +
        `(model=${result.model}, stopReason=${result.stopReason ?? 'n/a'}). ` +
        `Likely output truncation — enable chunking (AI_HEAL_CLASSIFY_CHUNKING=true) ` +
        `or raise AI_HEAL_CLASSIFY_MAX_TOKENS.`
    );
  }

  const parsed = FailureAnalysisSchema.parse(result.data);
  return {
    failures: parsed.failures,
    model: result.model,
    usage: (result.usage ?? {}) as TokenUsage,
  };
};

export const classifyFailures = async (
  reportText: string
): Promise<{ analysis: FailureAnalysis; model: string; usage: TokenUsage }> => {
  const blocks = splitReportIntoBlocks(reportText);

  // Chunking decision: explicit override wins; otherwise auto-chunk once the
  // failure count exceeds one chunk's worth, so growth in failure volume can
  // never push a single call past its request timeout on its own.
  const autoChunk = CLASSIFY_AUTOCHUNK_ENABLED && blocks.length > CLASSIFY_CHUNK_SIZE;
  const chunkingEnabled =
    CLASSIFY_CHUNKING_OVERRIDE !== null ? CLASSIFY_CHUNKING_OVERRIDE : autoChunk;

  // Build chunks. Unparseable input (blocks.length === 0) always falls back to
  // the single call regardless of the decision above.
  const chunks: string[] = [];
  if (!chunkingEnabled || blocks.length === 0) {
    chunks.push(reportText);
  } else {
    for (let i = 0; i < blocks.length; i += CLASSIFY_CHUNK_SIZE) {
      chunks.push(buildChunkReport(blocks.slice(i, i + CLASSIFY_CHUNK_SIZE)));
    }
  }

  log.info('classify', 'invoking LLM', {
    model: MODEL_CLASSIFY,
    inputChars: reportText.length,
    failures: blocks.length,
    chunking: chunkingEnabled,
    autoChunk: CLASSIFY_CHUNKING_OVERRIDE === null && autoChunk,
    chunks: chunks.length,
    chunkSize: chunkingEnabled ? CLASSIFY_CHUNK_SIZE : null,
    maxTokens: CLASSIFY_MAX_TOKENS,
    reasoningEffort: CLASSIFY_REASONING_EFFORT,
  });

  const limit = pLimit(CLASSIFY_CONCURRENCY);
  const results = await Promise.all(
    chunks.map((chunk, i) => limit(() => classifyChunk(chunk, i, chunks.length)))
  );

  // Promise.all preserves order, so failures stay in report order.
  const failures = results.flatMap((r) => r.failures);
  const analysis: FailureAnalysis = { failures };

  const usage = results.reduce<TokenUsage>(
    (acc, r) => ({
      inputTokens: (acc.inputTokens ?? 0) + (r.usage.inputTokens ?? 0),
      outputTokens: (acc.outputTokens ?? 0) + (r.usage.outputTokens ?? 0),
      cacheReadTokens: (acc.cacheReadTokens ?? 0) + (r.usage.cacheReadTokens ?? 0),
      cacheCreationTokens: (acc.cacheCreationTokens ?? 0) + (r.usage.cacheCreationTokens ?? 0),
    }),
    {}
  );
  const model = results[0]?.model ?? MODEL_CLASSIFY;

  const breakdown: Record<string, number> = {};
  let credentialIssues = 0;
  for (const f of failures) {
    breakdown[f.rootCauseCategory] = (breakdown[f.rootCauseCategory] || 0) + 1;
    if (f.isCredentialIssue) credentialIssues++;
  }
  log.info('classify', `${failures.length} failures classified`, {
    model,
    chunks: chunks.length,
    breakdown,
    credentialIssues,
  });

  return { analysis, model, usage };
};

export const groupSummary = async (reportText: string): Promise<string> => {
  const { analysis } = await classifyFailures(reportText);
  return buildCsv(analysis);
};

export type { ClassifiedFailure, FailureAnalysis };
