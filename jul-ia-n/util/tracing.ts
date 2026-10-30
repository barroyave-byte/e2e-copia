import { Langfuse } from 'langfuse';

import { estimateCostUsd, UsageRecord } from './cost';
import { log } from './log';

// Tracing is opt-in: unset LANGFUSE_SECRET_KEY/LANGFUSE_PUBLIC_KEY (e.g. no
// local Langfuse running) and every call below becomes a no-op. Nothing in
// the pipeline depends on a trace actually landing.
const ENABLED = Boolean(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY);

let _client: Langfuse | null = null;
const client = (): Langfuse | null => {
  if (!ENABLED) return null;
  if (!_client) {
    _client = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || 'http://localhost:3000',
    });
  }
  return _client;
};

export interface GenerationLogInput {
  /** e.g. 'classify', 'orchestrator', 'subagent:assertFixer' — shows up as the trace/generation name in Langfuse. */
  name: string;
  provider: 'openai' | 'anthropic';
  model: string;
  input: unknown;
  output: unknown;
  usage?: UsageRecord;
  /** Correlates every call within one heal.ts case (testCaseId is the natural session id). */
  sessionId?: string;
  metadata?: Record<string, unknown>;
  /** Set on failure — records the generation as errored instead of successful. */
  error?: string;
}

/**
 * Records one already-completed LLM call as a Langfuse trace+generation. Called
 * at each of the four getStructuredOutput/runAgent return points in
 * models/openai.ts and models/anthropic.ts, right after usage/model are known
 * — not a wrapper around the call itself, so it can't change control flow or
 * swallow an error from the real API call.
 *
 * Flushes immediately (rather than relying on Langfuse's background batching)
 * because heal.ts/eval/bench are short-lived scripts that call process.exit()
 * — an un-flushed batch would be silently dropped on exit.
 */
export const logGeneration = async (rec: GenerationLogInput): Promise<void> => {
  const lf = client();
  if (!lf) return;

  try {
    const trace = lf.trace({
      name: rec.name,
      sessionId: rec.sessionId,
      input: rec.input,
      metadata: { provider: rec.provider, ...rec.metadata },
    });
    const generation = trace.generation({
      name: rec.name,
      model: rec.model,
      input: rec.input,
    });
    generation.end({
      output: rec.output,
      level: rec.error ? 'ERROR' : 'DEFAULT',
      statusMessage: rec.error,
      usageDetails: rec.usage
        ? {
            input: rec.usage.inputTokens ?? 0,
            output: rec.usage.outputTokens ?? 0,
            ...(rec.usage.cacheReadTokens ? { cache_read: rec.usage.cacheReadTokens } : {}),
            ...(rec.usage.cacheCreationTokens
              ? { cache_creation: rec.usage.cacheCreationTokens }
              : {}),
          }
        : undefined,
      costDetails: rec.usage
        ? { total: estimateCostUsd(rec.model, rec.usage) }
        : undefined,
    });
    await lf.flushAsync();
  } catch (err) {
    // Tracing must never break the pipeline — log and move on.
    log.warn('tracing', 'failed to log generation to Langfuse', {
      name: rec.name,
      error: (err as Error).message,
    });
  }
};

export interface ResolutionMetricsLogInput {
  releaseId: string;
  totalLeaders: number;
  resolved: number;
  assisted: number;
  escalated: number;
  classifiedOnly: number;
  resolvedPct: number;
  assistedPct: number;
  escalatedPct: number;
  classifiedOnlyPct: number;
}

/**
 * Publishes the four-tier %-resolved breakdown (steps/metrics.ts) as Langfuse
 * scores on one release-level trace (sessionId=releaseId), so it's chartable
 * release-over-release in Langfuse's own Scores view — not a bespoke
 * dashboard. Same opt-in/fail-safe contract as logGeneration: no-op without
 * Langfuse configured, never throws into the caller.
 */
export const logResolutionMetrics = async (m: ResolutionMetricsLogInput): Promise<void> => {
  const lf = client();
  if (!lf) return;

  try {
    const trace = lf.trace({
      name: 'release-summary',
      sessionId: m.releaseId,
      metadata: {
        totalLeaders: m.totalLeaders,
        resolved: m.resolved,
        assisted: m.assisted,
        escalated: m.escalated,
        classifiedOnly: m.classifiedOnly,
      },
    });
    trace.score({ name: 'resolved-pct', value: m.resolvedPct, dataType: 'NUMERIC' });
    trace.score({ name: 'assisted-pct', value: m.assistedPct, dataType: 'NUMERIC' });
    trace.score({ name: 'escalated-pct', value: m.escalatedPct, dataType: 'NUMERIC' });
    trace.score({ name: 'classified-only-pct', value: m.classifiedOnlyPct, dataType: 'NUMERIC' });
    await lf.flushAsync();
  } catch (err) {
    log.warn('tracing', 'failed to log resolution metrics to Langfuse', {
      releaseId: m.releaseId,
      error: (err as Error).message,
    });
  }
};
