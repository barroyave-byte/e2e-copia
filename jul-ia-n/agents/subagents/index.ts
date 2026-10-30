import { AgentTool, getStructuredOutput, MODEL_REASONING, runAgent } from '../../models';
import { getSubagentPrompt } from '../../prompts/subagents';
import { RootCauseCategory } from '../../schemas/classifiedFailure';
import { InvestigatedFailure } from '../../schemas/investigatedFailure';
import { KnowledgeEntry } from '../../schemas/knowledgeEntry';
import {
  FileChange,
  Proposal,
  ProposalKind,
  ProposalSchema,
  SubagentName,
} from '../../schemas/proposal';
import { PooledCard } from '../../tools/cardPool';
import { scanForVulnerabilities } from '../../tools/codeScan';
import { scanForSecrets } from '../../tools/secretsScan';
import {
  createProdSreAgentTools,
  createRepoTools,
  createRunTestTool,
} from '../../tools/subagentTools';
import { validateFileChanges } from '../../util/allowlist';
import { log } from '../../util/log';
import { summarizeForOrchestrator } from '../orchestrator';

export interface RepoHints {
  primaryRepo: string;
  logGroup: string;
  owners?: string[];
}

export interface CardAttempt {
  variableName: string;
  /** Short reason it didn't pass — verify's rerun error, or 'verification failed' if none captured. */
  failureSummary: string;
}

export interface SubagentContext {
  failure: InvestigatedFailure;
  alternativeCards?: PooledCard[];
  /** cardFixer only: cards already tried and failed earlier in THIS case's retry loop — never re-propose these. */
  previousCardAttempts?: CardAttempt[];
  repoHints?: RepoHints;
  originalRootCauseCategory?: RootCauseCategory | null;
  /** Pre-formatted advisory section from the knowledge base (prior resolutions). */
  knowledgeSection?: string;
  /**
   * Propagation only: the fix that was already verified for this group's leader.
   * Same root cause, different spec — apply the equivalent change here, or say
   * why it doesn't apply (e.g. this case asserts a specific card brand).
   */
  leaderFixSection?: string;
}

interface ProposalLlmOutput {
  kind: ProposalKind;
  confidence: number;
  reasoning: string;
  fileChanges: FileChange[];
  issueBody: string | null;
}

const proposalToolSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'confidence', 'reasoning', 'fileChanges', 'issueBody'],
  properties: {
    kind: {
      type: 'string',
      enum: ['diff', 'issue', 'enrichment_only'],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasoning: { type: 'string' },
    fileChanges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'action', 'contents', 'diff'],
        properties: {
          path: { type: 'string' },
          action: { type: 'string', enum: ['create', 'update', 'delete'] },
          contents: { type: ['string', 'null'] },
          diff: { type: ['string', 'null'] },
        },
      },
    },
    issueBody: { type: ['string', 'null'] },
  },
};

const formatAlternativeCards = (cards: PooledCard[] | undefined): string => {
  if (!cards || cards.length === 0) {
    return '## Card pool\nNo alternative cards available. Pool exhausted.';
  }
  const lines = [
    '## Card pool',
    `${cards.length} alternatives available, ranked by affinity to this failure's PSP/country/brand ` +
      '(top of the list is the best guess, but ANY card in this list is a valid, curated, ' +
      'known-successful card — sandbox PSP environments are loose enough that a card curated ' +
      'for a different PSP regularly still works here):',
  ];
  for (const c of cards) {
    lines.push(
      `- ${c.variableName}: psp=${c.psp}, brand=${c.brand ?? 'unknown'}, country=${c.country ?? 'generic'}, ending in ${c.number.slice(-4)}`
    );
  }
  return lines.join('\n');
};

const formatPreviousCardAttempts = (attempts: CardAttempt[] | undefined): string => {
  if (!attempts || attempts.length === 0) return '';
  const lines = [
    '## Previous attempts (this case, this run)',
    'Already tried and did NOT pass verification — do not propose these again, pick a different card from the pool above:',
  ];
  for (const a of attempts) {
    lines.push(`- ${a.variableName}: ${a.failureSummary}`);
  }
  return lines.join('\n');
};

const formatRepoHints = (hints: RepoHints | undefined): string => {
  if (!hints) return '';
  const lines = [
    '## Repo hints',
    `- primaryRepo: ${hints.primaryRepo}`,
    `- logGroup: ${hints.logGroup}`,
  ];
  if (hints.owners?.length) lines.push(`- owners: ${hints.owners.join(', ')}`);
  return lines.join('\n');
};

const buildUserInput = (name: SubagentName, ctx: SubagentContext): string => {
  const parts = [summarizeForOrchestrator(ctx.failure)];
  if (name === 'cardFixer' || name === 'testDataFixer') {
    parts.push(formatAlternativeCards(ctx.alternativeCards));
  }
  if (name === 'cardFixer' && ctx.previousCardAttempts?.length) {
    parts.push(formatPreviousCardAttempts(ctx.previousCardAttempts));
  }
  if (name === 'serviceInvestigator') {
    parts.push(formatRepoHints(ctx.repoHints));
  }
  if (ctx.knowledgeSection) {
    parts.push(ctx.knowledgeSection);
  }
  if (ctx.leaderFixSection) {
    parts.push(ctx.leaderFixSection);
  }
  return parts.filter(Boolean).join('\n\n');
};

const enforceKindRules = (name: SubagentName, output: ProposalLlmOutput): ProposalLlmOutput => {
  if (output.kind === 'diff' && output.fileChanges.length === 0) {
    log.warn('subagent', `${name}: downgrade kind=diff → enrichment_only`, {
      reason: 'no fileChanges provided',
    });
    return {
      ...output,
      kind: 'enrichment_only',
      reasoning: `${output.reasoning}\n\n[downgraded to enrichment_only: ${name} returned kind=diff with no fileChanges]`,
      issueBody: null,
    };
  }
  if (output.kind === 'issue' && !output.issueBody) {
    log.warn('subagent', `${name}: downgrade kind=issue → enrichment_only`, {
      reason: 'no issueBody provided',
    });
    return {
      ...output,
      kind: 'enrichment_only',
      reasoning: `${output.reasoning}\n\n[downgraded to enrichment_only: ${name} returned kind=issue with no issueBody]`,
      fileChanges: [],
    };
  }
  if (output.kind === 'enrichment_only') {
    return { ...output, fileChanges: [], issueBody: null };
  }
  const validation = validateFileChanges(name, output.fileChanges);
  if (!validation.ok) {
    log.warn('subagent', `${name}: downgrade kind=diff → enrichment_only`, {
      reason: validation.reason,
    });
    return {
      ...output,
      kind: 'enrichment_only',
      fileChanges: [],
      issueBody: null,
      reasoning: `${output.reasoning}\n\n[downgraded to enrichment_only: ${validation.reason}]`,
    };
  }

  const secretsResult = scanForSecrets(output.fileChanges);
  if (!secretsResult.ok) {
    const summary = secretsResult.findings
      .map((f) => `${f.path}:${f.line} (${f.ruleId})`)
      .join(', ');
    log.warn('subagent', `${name}: downgrade kind=diff → enrichment_only`, {
      reason: `gitleaks flagged ${secretsResult.findings.length} potential secret(s)`,
      findings: summary,
    });
    return {
      ...output,
      kind: 'enrichment_only',
      fileChanges: [],
      issueBody: null,
      reasoning: `${output.reasoning}\n\n[downgraded to enrichment_only: gitleaks flagged ${secretsResult.findings.length} potential secret(s) in the proposed diff — ${summary}]`,
    };
  }

  const codeScanResult = scanForVulnerabilities(output.fileChanges);
  if (!codeScanResult.ok) {
    const summary = codeScanResult.blocking
      .map((f) => `${f.path}:${f.line} (${f.ruleId})`)
      .join(', ');
    log.warn('subagent', `${name}: downgrade kind=diff → enrichment_only`, {
      reason: `semgrep flagged ${codeScanResult.blocking.length} ERROR-severity finding(s)`,
      findings: summary,
      advisoryCount: codeScanResult.advisory.length,
    });
    return {
      ...output,
      kind: 'enrichment_only',
      fileChanges: [],
      issueBody: null,
      reasoning: `${output.reasoning}\n\n[downgraded to enrichment_only: semgrep flagged ${codeScanResult.blocking.length} ERROR-severity finding(s) in the proposed diff — ${summary}]`,
    };
  }
  if (codeScanResult.advisory.length > 0) {
    log.info('subagent', `${name}: semgrep advisory findings (non-blocking)`, {
      count: codeScanResult.advisory.length,
      findings: codeScanResult.advisory
        .map((f) => `${f.path}:${f.line} (${f.ruleId}, ${f.severity})`)
        .join(', '),
    });
  }

  return output;
};

export interface SubagentRunResult {
  proposal: Proposal;
  model: string;
  usage: unknown;
}

const SUBMIT_TOOL_DESCRIPTION =
  'Submit a proposal for the failure. kind=diff with fileChanges to open a PR, kind=issue with issueBody to open an Issue, or kind=enrichment_only to enrich the CSV without action.';

// Agentic subagents reason over a multi-turn tool loop (read the spec, grep the
// repo, or run an RCA session against the prod-sre-agent MCP) before
// submitting. Everything not in this set stays single-shot until migrated.
// selectorFixer added 2026-07-29, after the Playwright-native-healer bake-off
// (Task #6 in that round) found it was the one holdout still working purely
// off the enrich step's static domSnapshot, with zero tool access — and in
// the last real run (2026-07-24), 26/26 real selectorFixer cases produced
// nothing but the generic "AI analysis only" stub. Same fix already proven
// for assertFixer/testDataFixer: give it read_file/grep/glob so it can
// inspect the actual page-object companion before proposing a new locator,
// plus run_test to check that locator actually resolves before submitting.
const AGENTIC_SUBAGENTS = new Set<SubagentName>([
  'assertFixer',
  'cardFixer',
  'selectorFixer',
  'serviceInvestigator',
  'testDataFixer',
]);

const AGENT_MAX_ITERATIONS = 8;

const resolveAgentTools = (name: SubagentName, ctx: SubagentContext): AgentTool[] => {
  switch (name) {
    // Run-it-yourself loop: mirrors cardFixer's external retry (heal.ts), but
    // in-loop since neither subagent has a bespoke orchestrator-level retry.
    case 'assertFixer':
    case 'testDataFixer':
    case 'selectorFixer':
      return [...createRepoTools(), createRunTestTool(ctx.failure, name)];
    case 'cardFixer':
      return createRepoTools();
    case 'serviceInvestigator':
      return createProdSreAgentTools(ctx.failure);
    default:
      return [];
  }
};

const finalizeProposal = (
  name: SubagentName,
  ctx: SubagentContext,
  rawOutput: ProposalLlmOutput,
  reasoningHint: string | undefined,
  model: string,
  usage: unknown
): SubagentRunResult => {
  const safeOutput = enforceKindRules(name, rawOutput);

  const proposal: Proposal = ProposalSchema.parse({
    ...ctx.failure,
    subagent: name,
    confidence: safeOutput.confidence,
    reasoning: reasoningHint ? `${reasoningHint}\n\n${safeOutput.reasoning}` : safeOutput.reasoning,
    kind: safeOutput.kind,
    fileChanges: safeOutput.fileChanges,
    issueBody: safeOutput.issueBody,
    originalRootCauseCategory: ctx.originalRootCauseCategory ?? null,
  });

  log.decision('subagent', `${name} → kind=${proposal.kind}`, safeOutput.reasoning.slice(0, 200), {
    testCaseId: ctx.failure.testCaseId,
    finalKind: proposal.kind,
    confidence: Number(proposal.confidence.toFixed(2)),
    filePaths: proposal.fileChanges.map((c) => `${c.action}:${c.path}`),
  });

  return { proposal, model, usage };
};

const runAgenticSubagent = async (
  name: SubagentName,
  ctx: SubagentContext,
  reasoningHint?: string
): Promise<SubagentRunResult> => {
  const userInput = buildUserInput(name, ctx);
  const tools = resolveAgentTools(name, ctx);
  log.info('subagent', `${ctx.failure.testCaseId}: invoking ${name} (agentic)`, {
    model: MODEL_REASONING,
    userInputChars: userInput.length,
    tools: tools.map((t) => t.name),
    maxIterations: AGENT_MAX_ITERATIONS,
  });

  const result = await runAgent<ProposalLlmOutput>({
    model: MODEL_REASONING,
    systemPrompt: getSubagentPrompt(name),
    userInput,
    tools,
    submitTool: {
      name: 'submit_proposal',
      description: SUBMIT_TOOL_DESCRIPTION,
      inputSchema: proposalToolSchema,
    },
    maxIterations: AGENT_MAX_ITERATIONS,
    temperature: 0,
    maxTokens: 8000,
  });

  log.info('subagent', `${ctx.failure.testCaseId}: ${name} submitted`, {
    iterations: result.iterations,
    toolCalls: result.toolCalls.map((c) => `${c.name}${c.ok ? '' : '✗'}`),
    rawKind: result.data.kind,
    rawConfidence: Number(result.data.confidence.toFixed(2)),
    fileChanges: result.data.fileChanges.length,
    hasIssueBody: Boolean(result.data.issueBody),
  });

  return finalizeProposal(name, ctx, result.data, reasoningHint, result.model, result.usage);
};

const runSingleShotSubagent = async (
  name: SubagentName,
  ctx: SubagentContext,
  reasoningHint?: string
): Promise<SubagentRunResult> => {
  const userInput = buildUserInput(name, ctx);
  log.info('subagent', `${ctx.failure.testCaseId}: invoking ${name}`, {
    model: MODEL_REASONING,
    userInputChars: userInput.length,
    alternativeCards: ctx.alternativeCards?.length ?? 0,
    repoHints: Boolean(ctx.repoHints),
  });

  const result = await getStructuredOutput<ProposalLlmOutput>({
    model: MODEL_REASONING,
    systemPrompt: getSubagentPrompt(name),
    userInput,
    toolName: 'submit_proposal',
    toolDescription: SUBMIT_TOOL_DESCRIPTION,
    inputSchema: proposalToolSchema,
    temperature: 0,
    maxTokens: 8000,
  });

  log.info('subagent', `${ctx.failure.testCaseId}: ${name} responded`, {
    rawKind: result.data.kind,
    rawConfidence: Number(result.data.confidence.toFixed(2)),
    fileChanges: result.data.fileChanges.length,
    hasIssueBody: Boolean(result.data.issueBody),
  });

  return finalizeProposal(name, ctx, result.data, reasoningHint, result.model, result.usage);
};

export const runSubagent = async (
  name: SubagentName,
  ctx: SubagentContext,
  reasoningHint?: string
): Promise<SubagentRunResult> =>
  AGENTIC_SUBAGENTS.has(name)
    ? runAgenticSubagent(name, ctx, reasoningHint)
    : runSingleShotSubagent(name, ctx, reasoningHint);

export type SubagentRunner = (ctx: SubagentContext) => Promise<SubagentRunResult>;

export const SUBAGENT_RUNNERS: Record<SubagentName, SubagentRunner> = {
  credentialsFixer: (ctx) => runSubagent('credentialsFixer', ctx),
  rateLimitHandler: (ctx) => runSubagent('rateLimitHandler', ctx),
  testDataFixer: (ctx) => runSubagent('testDataFixer', ctx),
  payloadFixer: (ctx) => runSubagent('payloadFixer', ctx),
  cardFixer: (ctx) => runSubagent('cardFixer', ctx),
  redirectInvestigator: (ctx) => runSubagent('redirectInvestigator', ctx),
  selectorFixer: (ctx) => runSubagent('selectorFixer', ctx),
  snapshotUpdater: (ctx) => runSubagent('snapshotUpdater', ctx),
  assertFixer: (ctx) => runSubagent('assertFixer', ctx),
  infraMarker: (ctx) => runSubagent('infraMarker', ctx),
  humanEscalator: (ctx) => runSubagent('humanEscalator', ctx),
  serviceInvestigator: (ctx) => runSubagent('serviceInvestigator', ctx),
};

export const dispatchSubagent = (
  name: SubagentName,
  ctx: SubagentContext
): Promise<SubagentRunResult> => SUBAGENT_RUNNERS[name](ctx);

/**
 * Build a Proposal directly from a KB entry's replayableFix, bypassing the
 * subagent LLM entirely (short-circuit tier "apply"). The paths are still run
 * through the allowlist; verify still re-runs the test before any PR.
 */
export const buildShortCircuitProposal = (
  entry: KnowledgeEntry,
  ctx: SubagentContext,
  confidence: number
): SubagentRunResult => {
  if (!entry.subagentHint) {
    throw new Error(`KB entry ${entry.id} has no subagentHint; cannot apply`);
  }
  const fileChanges = entry.replayableFix ?? [];
  if (fileChanges.length === 0) {
    throw new Error(`KB entry ${entry.id} has no replayableFix to apply`);
  }
  const validation = validateFileChanges(entry.subagentHint, fileChanges);
  if (!validation.ok) {
    throw new Error(`KB entry ${entry.id} replayableFix rejected: ${validation.reason}`);
  }

  const proposal: Proposal = ProposalSchema.parse({
    ...ctx.failure,
    subagent: entry.subagentHint,
    confidence,
    reasoning: `Applied known fix from knowledge base "${entry.id}" (${entry.title}) WITHOUT LLM reasoning (short-circuit apply). Recipe: ${entry.recipe}`,
    kind: 'diff',
    fileChanges,
    issueBody: null,
    originalRootCauseCategory: ctx.originalRootCauseCategory ?? null,
  });

  log.decision(
    'subagent',
    `${entry.subagentHint} → kind=diff (KB short-circuit apply)`,
    `from KB entry ${entry.id}`,
    {
      testCaseId: ctx.failure.testCaseId,
      filePaths: proposal.fileChanges.map((c) => `${c.action}:${c.path}`),
    }
  );

  return { proposal, model: 'knowledge-base', usage: {} };
};
