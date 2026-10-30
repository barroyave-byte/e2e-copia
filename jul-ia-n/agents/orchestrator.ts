import { getStructuredOutput, MODEL_REASONING } from '../models';
import { ORCHESTRATOR_PROMPT } from '../prompts/orchestrator';
import {
  RootCauseCategory,
  ROOT_CAUSE_CATEGORIES,
} from '../schemas/classifiedFailure';
import {
  InvestigatedFailure,
} from '../schemas/investigatedFailure';
import { KnowledgeEntry } from '../schemas/knowledgeEntry';
import {
  OrchestratorDecision,
  OrchestratorDecisionSchema,
  SUBAGENT_NAMES,
} from '../schemas/proposal';
import { log } from '../util/log';

const SERVICE_CATEGORIES = new Set<RootCauseCategory>([
  'credentials',
  'infra',
]);

const orchestratorToolSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'subagent',
    'bugLocation',
    'suspectedRepo',
    'confidence',
    'reasoning',
    'categoryOverride',
  ],
  properties: {
    subagent: { type: 'string', enum: [...SUBAGENT_NAMES] },
    bugLocation: { type: 'string', enum: ['e2e', 'service', 'unknown'] },
    suspectedRepo: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasoning: { type: 'string' },
    categoryOverride: {
      anyOf: [
        { type: 'null' },
        { type: 'string', enum: [...ROOT_CAUSE_CATEGORIES] },
      ],
    },
  },
};

const truncate = (s: string | null | undefined, n: number): string =>
  !s ? '' : s.length > n ? s.slice(0, n) + `… [+${s.length - n} chars]` : s;

const summarizeForOrchestrator = (f: InvestigatedFailure): string => {
  const lines: string[] = [];

  lines.push('## Test failure');
  lines.push(`- testCaseId: ${f.testCaseId}`);
  lines.push(`- title: ${f.testDescription}`);
  lines.push(`- teamOwner: ${f.teamOwner}`);
  lines.push(`- failedStep: ${f.failedStep}`);
  lines.push(
    `- specFile: ${f.specFile ?? '(unknown)'}${f.specLine ? `:${f.specLine}` : ''}`,
  );
  if (f.tags.length > 0) lines.push(`- tags: ${f.tags.join(', ')}`);
  lines.push('');

  lines.push('## Classification');
  lines.push(`- rootCauseCategory: ${f.rootCauseCategory}`);
  lines.push(`- isCredentialIssue: ${f.isCredentialIssue}`);
  lines.push(`- errorIdentified: ${f.errorIdentified}`);
  lines.push(`- rootCause: ${f.rootCause}`);
  lines.push('');

  lines.push('## Enrichment IDs');
  lines.push(`- orderId: ${f.orderId ?? '(none)'}`);
  lines.push(`- transactionId: ${f.transactionId ?? '(none)'}`);
  lines.push(
    `- xRequestIds: ${f.xRequestIds.length === 0 ? '(none)' : f.xRequestIds.slice(0, 3).join(', ')}${f.xRequestIds.length > 3 ? ` (+${f.xRequestIds.length - 3} more)` : ''}`,
  );
  lines.push('');

  if (f.httpLogsSnippet) {
    lines.push('## HTTP logs from test stdout (filtered: errors + last 3 calls)');
    lines.push('```');
    lines.push(truncate(f.httpLogsSnippet, 4000));
    lines.push('```');
    lines.push('');
  }

  if (f.networkCalls.length > 0) {
    lines.push(`## Browser network calls from trace.zip (${f.networkCalls.length} kept after filtering)`);
    for (const call of f.networkCalls.slice(0, 10)) {
      lines.push(
        `- [${call.status ?? '?'}] ${call.method} ${truncate(call.url, 120)}${call.xRequestId ? ` xRequestId=${call.xRequestId}` : ''}`,
      );
      if (call.responseSnippet) {
        lines.push(`  body: ${truncate(call.responseSnippet, 400)}`);
      }
    }
    lines.push('');
  }

  if (f.stderrSnippet) {
    lines.push('## stderr (truncated)');
    lines.push('```');
    lines.push(truncate(f.stderrSnippet, 800));
    lines.push('```');
    lines.push('');
  }

  if (f.cloudWatchLogs.length > 0) {
    lines.push(`## CloudWatch logs (${f.cloudWatchLogs.length} events, showing first 5)`);
    for (const ev of f.cloudWatchLogs.slice(0, 5)) {
      lines.push(`- [${ev.logGroup}] ${truncate(ev.message, 300)}`);
    }
    lines.push('');
  }

  if (f.domSnapshot) {
    lines.push('## DOM snapshot (first 1500 chars)');
    lines.push('```');
    lines.push(truncate(f.domSnapshot, 1500));
    lines.push('```');
    lines.push('');
  }

  if (f.suspectedRepo || f.suspectedFiles.length > 0) {
    lines.push('## Pre-existing suspicions (from investigate step)');
    if (f.suspectedRepo) lines.push(`- suspectedRepo: ${f.suspectedRepo}`);
    if (f.suspectedFiles.length > 0)
      lines.push(`- suspectedFiles: ${f.suspectedFiles.join(', ')}`);
    lines.push(`- bugLocation hint: ${f.bugLocation}`);
    lines.push('');
  }

  return lines.join('\n');
};

export interface OrchestratorRunResult {
  decision: OrchestratorDecision;
  model: string;
  usage: unknown;
}

export const runOrchestrator = async (
  failure: InvestigatedFailure,
  knowledgeSection?: string,
): Promise<OrchestratorRunResult> => {
  const userInput = knowledgeSection
    ? `${summarizeForOrchestrator(failure)}\n\n${knowledgeSection}`
    : summarizeForOrchestrator(failure);

  log.info('orchestrator', `${failure.testCaseId}: invoking LLM`, {
    model: MODEL_REASONING,
    userInputChars: userInput.length,
    category: failure.rootCauseCategory,
    isCredentialIssue: failure.isCredentialIssue,
  });

  const result = await getStructuredOutput<OrchestratorDecision>({
    model: MODEL_REASONING,
    systemPrompt: ORCHESTRATOR_PROMPT(),
    userInput,
    toolName: 'route_failure',
    toolDescription:
      'Route the investigated test failure to the most appropriate subagent. Returns the chosen subagent, suspected bug location, suspected repo (if service), confidence, and reasoning.',
    inputSchema: orchestratorToolSchema,
    temperature: 0,
    maxTokens: 4000,
  });

  const decision = OrchestratorDecisionSchema.parse(result.data);
  log.decision(
    'orchestrator',
    `${decision.subagent} (bugLocation=${decision.bugLocation})`,
    decision.reasoning,
    {
      testCaseId: failure.testCaseId,
      confidence: Number(decision.confidence.toFixed(2)),
      suspectedRepo: decision.suspectedRepo,
    },
  );
  if (decision.categoryOverride && decision.categoryOverride !== failure.rootCauseCategory) {
    log.decision(
      'orchestrator',
      `category override ${failure.rootCauseCategory} → ${decision.categoryOverride}`,
      'enriched evidence contradicted classifier',
      { testCaseId: failure.testCaseId },
    );
  }
  return { decision, model: result.model, usage: result.usage };
};

/**
 * Synthesize an OrchestratorDecision from a high-confidence KB match, bypassing
 * the orchestrator LLM call (short-circuit tier "route"). The subagent still
 * runs and verify still gates the PR.
 */
export const decisionFromKnowledge = (
  entry: KnowledgeEntry,
  score: number,
  currentCategory: RootCauseCategory,
): OrchestratorDecision => {
  if (!entry.subagentHint) {
    throw new Error(
      `KB entry ${entry.id} has no subagentHint; cannot short-circuit route`,
    );
  }
  const categoryOverride =
    entry.rootCauseCategory && entry.rootCauseCategory !== currentCategory
      ? entry.rootCauseCategory
      : null;
  return OrchestratorDecisionSchema.parse({
    subagent: entry.subagentHint,
    bugLocation: SERVICE_CATEGORIES.has(entry.rootCauseCategory ?? currentCategory)
      ? 'service'
      : 'e2e',
    suspectedRepo: null,
    confidence: score,
    reasoning: `Short-circuit route from knowledge base "${entry.id}" (${entry.title}): exact test-case match at score ${score.toFixed(2)} ≥ threshold. Routed directly to ${entry.subagentHint} without orchestrator LLM reasoning.`,
    categoryOverride,
  });
};

export { summarizeForOrchestrator };
