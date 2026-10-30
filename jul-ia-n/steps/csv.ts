import { mkdirSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import { ClassifiedFailure, FailureAnalysis } from '../schemas/classifiedFailure';
import { ProposalKind, SubagentName } from '../schemas/proposal';
import { VerifyVerdict } from '../schemas/verifiedProposal';
import { log } from '../util/log';
import { withAiHealMarker } from './aiHealMarker';

const BIZDEV_MESSAGE = 'Contact us in the #bizdev-public channel requesting new credentials.';

const BACKEND_TEAM_REVIEW_MESSAGE = 'This error must be reviewed by the backend team.';

// Off by default: the KB retrieval/short-circuit logic itself is unchanged
// (still scores, still advises the LLM, still can short-circuit) — this only
// controls whether the "[KB prior art: ...]" trailer gets appended to the
// CSV's "AI Proposed Solution" column. Column is meant to fill up
// progressively with other agents' decisions; the KB suffix was adding noise
// (low-similarity matches with no real bearing on the case) more often than
// useful signal. Flip via AI_HEAL_CSV_SHOW_KB_PRIOR_ART=true.
const CSV_SHOW_KB_PRIOR_ART = process.env.AI_HEAL_CSV_SHOW_KB_PRIOR_ART === 'true';

// Columns I, J, L are populated manually by devs/QA in the master regression
// spreadsheet (this pipeline never writes to them — left empty so the header
// row exists and M/N land in the right position on import). Column K (Dev
// Solution) is normally manual too, except this pipeline writes
// BACKEND_TEAM_REVIEW_MESSAGE into it when the failing test carries the
// '@api' tag (see hasApiTag below) — every other row leaves it empty.
// Columns M/N are the only other ones this pipeline writes to outside A-H,
// and only for the 'known-issue' disposition (see
// HealCaseDecision.csvStatus/csvIssueType). Column O (Comments QA) is left
// empty except for that same 'known-issue' disposition, which gets the
// "[AI-HEAL: KB <entry id>]" marker (see aiHealMarker.ts); the cross-release
// comparison (steps/compareReleases.ts) fills it afterwards for cases that
// recur from the PREVIOUS reviewed release.
export const CSV_HEADERS = [
  'Test Case Id',
  'Test Description',
  'Team Owner',
  'Error Identified',
  'Root Cause',
  'Root Cause Category',
  'AI Proposed Solution',
  'Failed Step',
  'Owner (dev)',
  'Evidence by team of the fix or that it does not apply and why',
  'Dev Solution',
  'Status Review Dev',
  'QA Review',
  'Root cause QA',
  'Comments QA',
];

const RCA_MAX_CHARS = 1500;

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}… [truncated, see telemetry for full RCA]` : text;

export const escapeCsvField = (value: string): string => {
  if (value === '' || value === null || value === undefined) return '';
  const needsQuoting = /[",\n\r]/.test(value);
  if (!needsQuoting) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

export const toCsvRow = (fields: string[]): string => fields.map(escapeCsvField).join(',');

/**
 * Heal pipeline decision for a single test case. Used by buildCsv to render
 * the "AI Proposed Solution" column when the case went through ai-heal.
 *
 * If a case did not go through heal (e.g. ai-summarize only, or --testcase
 * filtered it out), the Map should not have an entry for it — buildCsv falls
 * back to the legacy behavior (bizdev message for credentials, empty otherwise).
 */
export interface HealCaseDecision {
  /** What the pipeline did. Maps to caseLog.prResult in heal.ts. */
  prResult:
    | 'pr'
    | 'issue'
    | 'none'
    | 'dry-run'
    | 'no-pr-flag'
    | 'skipped-low-confidence'
    | 'skipped-budget-cap'
    | 'skipped-pr-cap'
    | 'duplicate'
    // Propagation (heal.ts): a duplicate that got the leader's verified fix
    // adapted to its own file, instead of only inheriting the leader's text.
    | 'propagated'
    | 'propagated-covered'
    | 'propagation-declined'
    | 'propagation-failed'
    | 'pending'
    | 'known-issue'
    | string;
  prUrl: string | null;
  subagent: SubagentName | null;
  proposalKind: ProposalKind | null;
  verdict: VerifyVerdict | null;
  bugLocation: 'e2e' | 'service' | 'unknown' | null;
  suspectedRepo: string | null;
  orchestratorConfidence: number | null;
  confidenceThreshold: number;
  totalCostUsd: number;
  budgetUsd: number;
  prsOpened: number;
  prCap: number;
  errors: string[];
  /** True when this case was skipped because another case in the same root-cause group was processed as the leader. */
  isDuplicate: boolean;
  /** When isDuplicate=true, the testCaseId of the leader whose result this duplicate inherits. */
  leaderTestCaseId: string | null;
  /** Knowledge-base entry ids matched for this case (advisory prior art). */
  kbMatchIds?: string[];
  /** cardFixer only: every card tried this run (in order), for the "AI Proposed Solution" detail. */
  cardAttempts?: {
    variableName: string;
    outcome: 'passed' | 'failed' | 'not-run';
    errorMessage: string | null;
  }[];
  /** Short-circuit tier applied via the KB ('none' | 'route' | 'apply' | 'known-issue'). */
  shortCircuit?: 'none' | 'route' | 'apply' | 'known-issue';
  /** Written into the "QA Review" column (M) when shortCircuit='known-issue'. */
  csvStatus?: string | null;
  /** Written into the "Root cause QA" column (N) when shortCircuit='known-issue'. */
  csvIssueType?: string | null;
  /**
   * The orchestrator's (pre-subagent) or subagent's (post-dispatch, superset —
   * see heal.ts) actual reasoning text. Was missing from this interface
   * entirely until 2026-07-29 — every enrichment_only/needs-human/
   * low-confidence row silently fell back to a generic stub in
   * formatHealSolutionBase below regardless of what the model actually said,
   * even though the model always generates real reasoning. Null only for
   * dispositions that never call an LLM (known-issue, budget/PR-cap skips,
   * pipeline errors).
   */
  reasoning?: string | null;
}

const kbSuffix = (d: HealCaseDecision): string => {
  if (!CSV_SHOW_KB_PRIOR_ART) return '';
  if (!d.kbMatchIds || d.kbMatchIds.length === 0) return '';
  const sc = d.shortCircuit && d.shortCircuit !== 'none' ? `, short-circuit ${d.shortCircuit}` : '';
  return ` [KB prior art: ${d.kbMatchIds.join(', ')}${sc}]`;
};

const REASONING_MAX_CHARS = 500;

/** Trims the model's real reasoning to a spreadsheet-friendly length. '' if none captured. */
const reasoningSnippet = (d: HealCaseDecision): string => {
  const trimmed = d.reasoning?.trim();
  if (!trimmed) return '';
  return trimmed.length > REASONING_MAX_CHARS
    ? `${trimmed.slice(0, REASONING_MAX_CHARS)}…`
    : trimmed;
};

const formatHealSolution = (failure: ClassifiedFailure, d: HealCaseDecision): string =>
  formatHealSolutionBase(failure, d) + kbSuffix(d);

const formatHealSolutionBase = (failure: ClassifiedFailure, d: HealCaseDecision): string => {
  const subagent = d.subagent ?? 'unknown';

  // Successful submissions
  if (d.prResult === 'pr' && d.prUrl) {
    return `Draft PR opened (${subagent}): ${d.prUrl}`;
  }
  if (d.prResult === 'issue' && d.prUrl) {
    if (failure.isCredentialIssue) {
      return `Issue opened (${subagent}): ${d.prUrl}. ${BIZDEV_MESSAGE}`;
    }
    return `Issue opened (${subagent}): ${d.prUrl}`;
  }

  // Known, recurring, non-actionable failure (e.g. PSP-side decline) — marked
  // directly in the QA Review / Root cause QA columns, no PR/Issue/verify.
  if (d.prResult === 'known-issue') {
    const score = d.orchestratorConfidence?.toFixed(2) ?? '?';
    return `Known external/PSP issue (similarity ${score}) — recurring failure with no fix on our side. Marked "${d.csvStatus}" / "${d.csvIssueType}" per knowledge base.`;
  }

  // Propagated from the group's leader: the leader's verified fix, adapted to
  // this test case's own file, re-run on its own and committed to the leader's PR.
  const leaderId = d.leaderTestCaseId ?? '(unknown)';
  if (d.prResult === 'propagated') {
    return `Fixed by propagating ${leaderId}'s verified fix to this test case (${subagent}); re-run passed. Committed to the leader's PR${d.prUrl ? `: ${d.prUrl}` : ''}.`;
  }
  if (d.prResult === 'propagated-covered') {
    return `Already fixed by ${leaderId}'s change (shared file), no separate change needed${d.prUrl ? `: ${d.prUrl}` : ''}.`;
  }
  if (d.prResult === 'propagation-declined') {
    const reasoning = reasoningSnippet(d);
    return `${leaderId}'s fix does not apply here per ${subagent}${reasoning ? `: ${reasoning}` : ''}. Needs human review.`;
  }
  if (d.prResult === 'propagation-failed') {
    const reasoning = reasoningSnippet(d);
    return `Tried ${leaderId}'s fix on this test case but it did not pass verification${reasoning ? `: ${reasoning}` : ''}. Needs human review.`;
  }

  // verify never executed the test (no browser, spec didn't compile, 0
  // results). Must come before the cardFixer branch: saying a card "failed
  // verification" here blames a card that was never tried — exactly the
  // misleading row every CI cardFixer case produced before this existed.
  if (d.prResult !== 'pr' && d.verdict === 'verify-error') {
    const tried =
      subagent === 'cardFixer' && d.cardAttempts?.length
        ? ` Proposed card(s): ${d.cardAttempts.map((a) => a.variableName).join(', ')}.`
        : '';
    const cause =
      d.cardAttempts?.find((a) => a.errorMessage)?.errorMessage ??
      d.reasoning?.match(/fix NOT evaluated — ([\s\S]*?)\]$/)?.[1];
    return (
      `Fix proposed by ${subagent} but NOT evaluated: verify could not execute the test` +
      `${cause ? ` (${cause.slice(0, 200)})` : ''}.${tried} ` +
      `Apply the proposed fix manually and re-run to confirm. See telemetry for details.`
    );
  }

  // cardFixer tried one or more cards from the pool and none passed
  // verification. Surface exactly which cards were tried and why — cards are
  // never permanently excluded (see tools/cardPool.ts), so a future run may
  // still succeed with the same card if this was a transient PSP sandbox issue.
  if (
    d.prResult !== 'pr' &&
    subagent === 'cardFixer' &&
    d.cardAttempts &&
    d.cardAttempts.length > 0
  ) {
    const summary = d.cardAttempts
      .map(
        (a) =>
          `${a.variableName} (${a.outcome}${a.errorMessage ? `: ${a.errorMessage.slice(0, 80)}` : ''})`
      )
      .join('; ');
    return (
      `cardFixer tried ${d.cardAttempts.length} card(s) this run, none passed verification: ${summary}. ` +
      `This may be a transient PSP sandbox issue — cards are not excluded from future runs. Needs human review.`
    );
  }

  // No submission cases
  if (d.prResult === 'none') {
    const reasoning = reasoningSnippet(d);
    if (d.verdict === 'needs-human') {
      return reasoning
        ? `Fix proposed by ${subagent} but failed verification (re-run did not pass): ${reasoning}`
        : `Fix proposed by ${subagent} but failed verification (re-run did not pass). See telemetry for details.`;
    }
    if (d.proposalKind === 'enrichment_only') {
      // serviceInvestigator's reasoning IS the RCA (see tools/prodSreAgentClient.ts) — give it more
      // room than the generic reasoningSnippet (500 chars) allows, via its own longer truncation.
      if (d.bugLocation === 'service') {
        const where = d.suspectedRepo ? ` in ${d.suspectedRepo}` : '';
        return d.reasoning
          ? `Suspected service bug${where}. RCA: ${truncate(d.reasoning, RCA_MAX_CHARS)}`
          : `Suspected service bug${where}. See telemetry for details.`;
      }
      if (d.bugLocation === 'e2e') {
        return reasoning
          ? `AI analysis (${subagent}): ${reasoning}`
          : 'AI analysis only — manual review required. See telemetry for details.';
      }
      return reasoning
        ? `Insufficient signal for auto-fix — AI analysis: ${reasoning}`
        : 'Insufficient signal — needs human triage. See telemetry for details.';
    }
    return reasoning
      ? `No action taken — ${reasoning}`
      : 'No action taken — see telemetry for details.';
  }

  // Skip cases
  if (d.prResult.startsWith('skipped-low-confidence')) {
    const confidence = d.orchestratorConfidence?.toFixed(2) ?? '?';
    const reasoning = reasoningSnippet(d);
    const base = `Skipped: orchestrator confidence ${confidence} below threshold ${d.confidenceThreshold.toFixed(2)}.`;
    return reasoning ? `${base} ${reasoning}` : base;
  }
  if (d.prResult === 'skipped-budget-cap') {
    return `Skipped: token budget exceeded ($${d.totalCostUsd.toFixed(2)}/$${d.budgetUsd.toFixed(2)}).`;
  }
  if (d.prResult === 'skipped-pr-cap') {
    return `Skipped: PR cap reached (${d.prsOpened}/${d.prCap}).`;
  }

  // Dry-run / no-pr
  if (d.prResult === 'dry-run') {
    return `Dry run: would have invoked ${subagent}.`;
  }
  if (d.prResult === 'no-pr-flag') {
    return `Analysis complete (--no-pr): would invoke ${subagent}.`;
  }

  // Errors
  if (d.prResult === 'pending' || d.errors.length > 0) {
    const firstErr = d.errors[0] ?? 'unknown';
    return `Pipeline error — ${firstErr.slice(0, 120)}. See telemetry for stack.`;
  }

  return '';
};

const legacySolution = (failure: ClassifiedFailure): string =>
  failure.isCredentialIssue ? BIZDEV_MESSAGE : '';

/** True when the failing test carries the '@api' tag (case-insensitive, '@' optional). */
const hasApiTag = (tags: string[] | undefined): boolean =>
  (tags ?? []).some((t) => t.replace(/^@/, '').toLowerCase() === 'api');

/**
 * Duplicates whose row reports their OWN propagation outcome rather than just
 * inheriting the leader's text (see formatHealSolutionBase).
 */
const PROPAGATION_RESULTS = new Set([
  'propagated',
  'propagated-covered',
  'propagation-declined',
  'propagation-failed',
]);

const formatDuplicateSolution = (
  decision: HealCaseDecision,
  leaderSummary: string | null
): string => {
  const leaderId = decision.leaderTestCaseId ?? '(unknown)';
  if (!leaderSummary) {
    return `Duplicate of ${leaderId} (same root cause). Leader's decision not available — review leader manually.`;
  }
  return `Duplicate of ${leaderId}. Leader: ${leaderSummary} Apply same fix if applicable.`;
};

/**
 * Groups failures by root-cause leader (heal.ts's dedup, surfaced here via
 * HealCaseDecision.isDuplicate/leaderTestCaseId) so a leader row is
 * immediately followed by every failure that inherits its decision, and
 * orders groups largest-first — the CSV reads by impact (root causes hitting
 * the most test cases first) instead of whatever order the raw Playwright
 * report happened to list failures in. Ties (equal group size) keep their
 * original relative order (Array.sort is stable in Node).
 *
 * Only called when healDecisions is present (the heal.ts flow) — the legacy
 * ai-summarize flow (steps/group.ts) has no leader/duplicate concept to group
 * by, so it keeps the original failures order untouched.
 */
const groupAndSortFailures = (
  failures: ClassifiedFailure[],
  healDecisions: Map<string, HealCaseDecision>
): ClassifiedFailure[] => {
  const groupKey = (f: ClassifiedFailure): string => {
    const d = healDecisions.get(f.testCaseId);
    return d?.isDuplicate && d.leaderTestCaseId ? d.leaderTestCaseId : f.testCaseId;
  };

  const groups = new Map<string, ClassifiedFailure[]>();
  for (const f of failures) {
    const key = groupKey(f);
    const existing = groups.get(key);
    if (existing) existing.push(f);
    else groups.set(key, [f]);
  }

  // Within a group, the leader (testCaseId === the group's key) always sorts
  // first; duplicates keep their original relative order after it.
  for (const [key, members] of groups) {
    members.sort((a, b) => {
      if (a.testCaseId === key) return -1;
      if (b.testCaseId === key) return 1;
      return 0;
    });
  }

  return Array.from(groups.values())
    .sort((a, b) => b.length - a.length)
    .flat();
};

/**
 * Comments QA for a 'known-issue' KB short-circuit: the "[AI-HEAL: KB <id>]"
 * marker, so the dashboard counts the row as a known bug identified by
 * ai-heal. Duplicates inherit their leader's kbMatchIds (heal.ts), so they
 * carry the same ref. '' for every other disposition.
 */
const knownIssueComment = (decision: HealCaseDecision | undefined): string => {
  if (decision?.prResult !== 'known-issue') return '';
  const entryId = decision.kbMatchIds?.[0];
  return withAiHealMarker(entryId ? `KB ${entryId}` : 'KB');
};

export const buildCsv = (
  analysis: FailureAnalysis,
  healDecisions?: Map<string, HealCaseDecision>,
  tagsByTestCaseId?: Map<string, string[]>
): string => {
  // Pre-compute the formatted summary for every leader so duplicates can embed it.
  const leaderSummaries = new Map<string, string>();
  if (healDecisions) {
    for (const f of analysis.failures) {
      const d = healDecisions.get(f.testCaseId);
      if (d && !d.isDuplicate) {
        leaderSummaries.set(f.testCaseId, formatHealSolution(f, d));
      }
    }
  }

  const orderedFailures = healDecisions
    ? groupAndSortFailures(analysis.failures, healDecisions)
    : analysis.failures;

  const lines = [toCsvRow(CSV_HEADERS)];
  for (const f of orderedFailures) {
    const decision = healDecisions?.get(f.testCaseId);
    let proposedSolution: string;
    if (!decision) {
      proposedSolution = legacySolution(f);
    } else if (
      decision.isDuplicate &&
      decision.shortCircuit !== 'known-issue' &&
      !PROPAGATION_RESULTS.has(decision.prResult)
    ) {
      const leaderSummary = decision.leaderTestCaseId
        ? (leaderSummaries.get(decision.leaderTestCaseId) ?? null)
        : null;
      proposedSolution = formatDuplicateSolution(decision, leaderSummary);
    } else {
      // Either a leader, or a duplicate that independently carries its own
      // 'known-issue' disposition (inherited from its leader in heal.ts) — both
      // render the same way since the decision object is fully self-contained.
      proposedSolution = formatHealSolution(f, decision);
    }
    const devSolution = hasApiTag(tagsByTestCaseId?.get(f.testCaseId))
      ? BACKEND_TEAM_REVIEW_MESSAGE
      : '';
    lines.push(
      toCsvRow([
        f.testCaseId,
        f.testDescription,
        f.teamOwner,
        f.errorIdentified,
        f.rootCause,
        f.rootCauseCategory,
        proposedSolution,
        f.failedStep,
        '', // Owner (dev) — filled manually
        '', // Evidence by team of the fix or that it does not apply and why — filled manually
        devSolution, // Dev Solution — '@api' tag → backend review message, otherwise manual
        '', // Status Review Dev — filled manually
        decision?.csvStatus ?? '', // QA Review
        decision?.csvIssueType ?? '', // Root cause QA
        knownIssueComment(decision), // Comments QA — otherwise filled by steps/compareReleases.ts
      ])
    );
  }
  return lines.join('\n') + '\n';
};

/**
 * Write CSV atomically: write to `${path}.tmp` then rename. Prevents a
 * partial-write from corrupting the previous CSV if the process crashes
 * mid-write.
 */
export const writeCsvAtomic = (path: string, content: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, path);
  log.info('csv', `written ${content.length} chars to ${path}`);
};
