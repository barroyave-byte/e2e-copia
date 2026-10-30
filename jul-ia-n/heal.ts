import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import {
  buildShortCircuitProposal,
  CardAttempt,
  decisionFromKnowledge,
  dispatchSubagent,
  runOrchestrator,
  SubagentContext,
  SubagentRunResult,
} from './agents';
import { AI_PROVIDER } from './models';
import { ClassifiedFailure } from './schemas/classifiedFailure';
import {
  FileChange,
  OrchestratorDecision,
  Proposal,
  ProposalKind,
  SubagentName,
} from './schemas/proposal';
import {
  VerifiedProposal,
  VerifiedProposalSchema,
  VerifyVerdict,
} from './schemas/verifiedProposal';
import {
  compareWithPreviousRelease,
  findLatestReleaseCsv,
  inferReleaseLabel,
} from './steps/compareReleases';
import { buildCsv, HealCaseDecision, writeCsvAtomic } from './steps/csv';
import { groupBySignature } from './steps/dedup';
import { enrichFailure } from './steps/enrich';
import { classifyFailures } from './steps/group';
import { investigateFailure } from './steps/investigate';
import {
  decideShortCircuit,
  embedQueries,
  formatKnowledgeSection,
  KnowledgeMatch,
  prepareKnowledgeBase,
  PreparedKnowledgeBase,
  scoreKnowledge,
  ShortCircuitTier,
} from './steps/knowledge';
import { computeResolutionMetrics, formatResolutionMetrics } from './steps/metrics';
import { normalize, NormalizedFailure } from './steps/normalize';
import {
  commentPropagationSummary,
  PropagationSummaryEntry,
  submitPropagatedFix,
  submitProposal,
} from './steps/pr';
import { verifyProposal } from './steps/verify';
import { getCardCandidates, PooledCard } from './tools/cardPool';
import { missingBrowserReason } from './tools/playwrightRunner';
import { pLimit } from './util/concurrency';
import { estimateCostUsd, UsageRecord } from './util/cost';
import { log } from './util/log';
import { logResolutionMetrics } from './util/tracing';

interface CliArgs {
  input?: string;
  testCaseId?: string;
  dryRun: boolean;
  noPr: boolean;
  releaseId: string;
  owner: string;
  repo: string;
  confidenceThreshold: number;
  testResultsDir?: string;
}

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    dryRun: false,
    noPr: false,
    releaseId: `r${new Date().toISOString().slice(0, 10)}`,
    owner: process.env.AI_HEAL_REPO_OWNER || 'DUNA-E-Commmerce',
    repo: process.env.AI_HEAL_REPO_NAME || 'e2e-testing',
    confidenceThreshold: Number(process.env.AI_HEAL_CONFIDENCE_THRESHOLD || '0.8'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => argv[++i];
    switch (a) {
      case '--input':
        args.input = next();
        break;
      case '--testcase':
        args.testCaseId = next();
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--no-pr':
        args.noPr = true;
        break;
      case '--release-id':
        args.releaseId = next();
        break;
      case '--owner':
        args.owner = next();
        break;
      case '--repo':
        args.repo = next();
        break;
      case '--test-results-dir':
        args.testResultsDir = next();
        break;
      case '--confidence-threshold':
        args.confidenceThreshold = Number(next());
        break;
    }
  }
  return args;
};

/** One cardFixer swap attempt within a single case's retry loop (not persisted across runs). */
interface CardAttemptLog {
  variableName: string;
  /** not-run: verify could not execute the test, so the card was never evaluated. */
  outcome: 'passed' | 'failed' | 'not-run';
  errorMessage: string | null;
}

/** Keeps a reason readable in a PR comment / CSV cell without dumping a whole model answer. */
const truncateReason = (text: string, max = 200): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

/** A leader's fix that passed verify and reached a PR — the input to propagation. */
interface LeaderFix {
  subagent: SubagentName;
  verified: VerifiedProposal;
  prNumber: number;
  prUrl: string;
  branch: string;
  /** Paths the leader's own commit already changed (a duplicate living in one of them needs nothing). */
  changedPaths: string[];
  knowledgeSection: string;
}

interface CaseTelemetry {
  testCaseId: string;
  rootCauseCategory: string;
  categoryOverride: string | null;
  effectiveCategory: string;
  orchestratorConfidence: number | null;
  subagent: SubagentName | null;
  bugLocation: 'e2e' | 'service' | 'unknown' | null;
  suspectedRepo: string | null;
  proposalKind: ProposalKind | null;
  verdict: VerifyVerdict | null;
  prResult: string;
  prUrl: string | null;
  costUsd: number;
  errors: string[];
  isDuplicate: boolean;
  leaderTestCaseId: string | null;
  signatureKey: string | null;
  kbMatchIds: string[];
  shortCircuit: ShortCircuitTier;
  /** Written into the CSV's "QA Review" column when shortCircuit='known-issue'. */
  csvStatus: string | null;
  /** Written into the CSV's "Root cause QA" column when shortCircuit='known-issue'. */
  csvIssueType: string | null;
  /** cardFixer only: every card tried this run, in order. Empty for every other subagent. */
  cardAttempts: CardAttemptLog[];
  /**
   * The model's actual reasoning — orchestrator's until a subagent runs, then
   * overwritten with the subagent's (a superset, via verified.reasoning which
   * already carries the subagent's own reasoning forward). Feeds
   * steps/csv.ts's HealCaseDecision.reasoning; see that file for why this
   * exists (it didn't, until 2026-07-29 — every enrichment_only/needs-human/
   * low-confidence CSV row was a generic stub regardless of what the model
   * said).
   */
  reasoning: string | null;
}

const TOKEN_BUDGET_USD = Number(process.env.AI_HEAL_BUDGET_USD || '20');
const PR_CAP = Number(process.env.AI_HEAL_PR_CAP || '50');
const KB_ENABLED = (process.env.AI_HEAL_KB_ENABLED || 'true') !== 'false';
// How many leaders to process in parallel. Leaders are independent and the work
// is network/LLM bound, so concurrency cuts wall-clock dramatically. Bounded to
// stay within provider rate limits.
const CONCURRENCY = Math.max(1, Number(process.env.AI_HEAL_CONCURRENCY || '10'));
// Verify runs Playwright (browsers) and is CPU-heavy, so it gets its own, much
// smaller limit independent of the LLM concurrency above — otherwise N parallel
// leaders could each spawn a full test run at once.
const VERIFY_CONCURRENCY = Math.max(1, Number(process.env.AI_HEAL_VERIFY_CONCURRENCY || '2'));
// How many DISTINCT alternative cards cardFixer may try (each a full verify
// re-run) before giving up on a case: swap → verify, and if that fails, swap
// again once more. Cards are never permanently blacklisted (see tools/cardPool.ts)
// — this only bounds a single case's retry loop, not future runs.
const CARDFIXER_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.AI_HEAL_CARDFIXER_MAX_ATTEMPTS || '2')
);
// Propagation (added 2026-09-22): a leader's verified fix only repairs the
// leader's own spec. Its duplicates share the root cause but each lives in its
// own file with its own card/locator/assertion, so each needs its own change —
// regression 39.2 opened 5 leader PRs and left 21 specs still broken. Gated by
// env because every propagated case costs one subagent call plus one real
// verify run.
const PROPAGATE_ENABLED = (process.env.AI_HEAL_PROPAGATE || 'true') !== 'false';
// Bounds the wall-clock cost per run, not per group: the whole point is that a
// big group is where propagation pays off, but a 60-minute CI job cannot absorb
// an unbounded number of real Playwright runs.
const PROPAGATE_MAX = Math.max(0, Number(process.env.AI_HEAL_PROPAGATE_MAX || '25'));
// Duplicates verify with a single run rather than steps/verify.ts's majority-of-3:
// the leader already paid the 2-of-3 gate for this exact root cause, and its fix
// is the input here. Raise it if a group's fixes ever start passing verify and
// then failing in the next regression.
const PROPAGATE_VERIFY_REPEAT = Math.max(
  1,
  Number(process.env.AI_HEAL_PROPAGATE_VERIFY_REPEAT || '1')
);

// A rerun's errorMessage still has to look like a card-side rejection before
// spending another attempt — if the failure changed shape (e.g. a timeout),
// further card swaps are pointless and the loop stops early.
const CARD_ISSUE_PATTERN =
  /\bDP-\d{3,4}\b|\bbin\b|declin|rejected|not (?:supported|allowed|found|recognized)|invalid card|acquirer/i;

/** Best-effort: which pooled card ended up referenced in the proposal's file contents. */
const detectUsedCard = (fileChanges: FileChange[], candidates: PooledCard[]): PooledCard | null => {
  const contents = fileChanges.map((f) => f.contents ?? '').join('\n');
  return candidates.find((c) => contents.includes(c.variableName)) ?? null;
};

const firstFailureMessage = (verified: VerifiedProposal): string | null =>
  verified.verifyError ?? verified.reruns.find((r) => !r.passed)?.errorMessage ?? null;

const cardOutcome = (verified: VerifiedProposal): CardAttemptLog['outcome'] => {
  if (verified.verdict === 'ready-to-pr') return 'passed';
  if (verified.verdict === 'verify-error') return 'not-run';
  return 'failed';
};

/** Only spend another card-swap attempt if the failure still smells like a card/BIN rejection. */
const looksLikeCardIssue = (verified: VerifiedProposal): boolean =>
  verified.reruns.some(
    (r) => !r.passed && r.errorMessage && CARD_ISSUE_PATTERN.test(r.errorMessage)
  );

const recordCardAttempt = (
  attempts: CardAttemptLog[],
  proposalFileChanges: FileChange[],
  candidates: PooledCard[],
  verified: VerifiedProposal
): void => {
  const used = detectUsedCard(proposalFileChanges, candidates);
  attempts.push({
    variableName: used?.variableName ?? 'unknown',
    outcome: cardOutcome(verified),
    errorMessage: firstFailureMessage(verified),
  });
};

// Even with read_file access, an LLM can still invent a plausible-looking
// identifier (e.g. turning "...CardFailed" into "...CardRejected") instead of
// copying one of the exact candidates it was given — that reaches verify as
// `undefined` at runtime and burns a real Playwright run to fail for a reason
// that has nothing to do with the card decline. Catch it deterministically
// before spending that run: the proposal must reference at least one literal
// candidate variableName from the list it was actually offered.
const buildUngroundedResult = (proposal: Proposal, candidates: PooledCard[]): VerifiedProposal => {
  // Deliberately does NOT match CARD_ISSUE_PATTERN — this isn't a card
  // decline, it's cardFixer failing to ground its own proposal, so
  // looksLikeCardIssue() correctly returns false and the retry loop stops
  // instead of burning its next attempt on the same failure mode.
  const message =
    `cardFixer proposal referenced no known pooled card (candidates offered: ` +
    `${candidates.map((c) => c.variableName).join(', ')}) — likely an invented identifier`;
  return VerifiedProposalSchema.parse({
    ...proposal,
    reruns: [{ attempt: 1, passed: false, durationMs: 0, errorMessage: message }],
    passedCount: 0,
    failedCount: 1,
    verdict: 'needs-human',
    verifiedConfidence: Math.min(proposal.confidence, 0.3),
    reasoning: `${proposal.reasoning}\n\n[heal: rejected before verify — ${message}]`,
  });
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error(
      'Usage: ts-node jul-ia-n/heal.ts --input <test-results.json> [--testcase ID] [--dry-run] [--no-pr] [--release-id ID] [--owner ORG] [--repo REPO] [--confidence-threshold 0.8]'
    );
    process.exit(1);
  }

  log.info('heal', 'pipeline start', {
    provider: AI_PROVIDER,
    release: args.releaseId,
    dryRun: args.dryRun,
    noPr: args.noPr,
    confidenceThreshold: args.confidenceThreshold,
    targetRepo: `${args.owner}/${args.repo}`,
    budgetUsd: TOKEN_BUDGET_USD,
    prCap: PR_CAP,
  });

  // Loud, early signal: without a browser every verify returns verify-error
  // and no PR can open. Not fatal — classify/enrich/CSV/issues still work.
  const browserProblem = args.dryRun || args.noPr ? null : missingBrowserReason();
  if (browserProblem) {
    log.error(
      'heal',
      'Playwright browsers missing — every verify will be skipped as verify-error and no PR can open',
      new Error(browserProblem)
    );
  }

  const raw = readFileSync(args.input, 'utf-8');
  const { failedTests, output: reportText } = normalize(raw);
  log.info('normalize', `${failedTests.length} failed tests extracted`, {
    sampleIds: failedTests.slice(0, 5).map((f) => f.testCaseId ?? '(no-id)'),
  });

  if (failedTests.length === 0) {
    log.info('heal', 'nothing to do — exiting');
    return;
  }

  const classifyResult = await classifyFailures(reportText);
  const classified: ClassifiedFailure[] = classifyResult.analysis.failures;

  const filtered = args.testCaseId
    ? classified.filter((c) => c.testCaseId === args.testCaseId)
    : classified;
  if (args.testCaseId) {
    log.decision(
      'heal',
      `filter by --testcase ${args.testCaseId}`,
      `kept ${filtered.length}/${classified.length} cases`
    );
  } else {
    log.info('heal', `processing all ${filtered.length} classified cases`);
  }

  const dedup = groupBySignature(filtered);
  log.decision(
    'dedup',
    `grouped ${dedup.totalCases} cases into ${dedup.totalLeaders} unique root causes`,
    `${dedup.totalDuplicates} duplicates will be skipped (LLM-wise) and inherit their leader's decision`,
    {
      largestGroups: dedup.groups
        .filter((g) => g.size > 1)
        .sort((a, b) => b.size - a.size)
        .slice(0, 5)
        .map((g) => ({ leaderId: g.leaderId, size: g.size })),
    }
  );

  const normalizedById = new Map<string, NormalizedFailure>(
    failedTests
      .filter((n): n is NormalizedFailure & { testCaseId: string } => Boolean(n.testCaseId))
      .map((n) => [n.testCaseId!, n])
  );

  // Sort: leaders first, duplicates after — guarantees that when a duplicate's
  // case logs are recorded, its leader's HealCaseDecision is already in `cases`
  // so the CSV can embed the leader's summary. We sort the ClassifiedFailure[]
  // (not enriched) because enrich is now lazy — only leaders pay the I/O cost
  // of parsing trace.zip + reading error-context.md.
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aIsDup = dedup.duplicateToLeader.has(a.testCaseId) ? 1 : 0;
    const bIsDup = dedup.duplicateToLeader.has(b.testCaseId) ? 1 : 0;
    if (aIsDup !== bIsDup) return aIsDup - bIsDup;
    return a.testCaseId.localeCompare(b.testCaseId);
  });

  let totalCostUsd = estimateCostUsd(classifyResult.model, classifyResult.usage as UsageRecord);
  let prsOpened = 0;
  const cases: CaseTelemetry[] = [];

  // Two phases. Phase 1: leaders, processed concurrently (the expensive path).
  // Phase 2: duplicates, which do no work — they inherit their leader's decision
  // in the CSV, so they are appended after all leaders have a recorded decision.
  const leaders = sortedFiltered.filter((c) => !dedup.duplicateToLeader.has(c.testCaseId));
  const duplicates = sortedFiltered.filter((c) => dedup.duplicateToLeader.has(c.testCaseId));

  // Prepare the knowledge base once for the whole run: load + embed entries and
  // batch-embed every leader's query vector up front. Per-leader scoring is then
  // a pure in-memory cosine (see steps/knowledge.ts) — no disk reads, no Zod
  // validation, and no per-leader embedding round-trip. A KB failure here is
  // non-fatal: the run continues without prior art.
  let kbPrepared: PreparedKnowledgeBase = { entries: [], entryVectors: new Map() };
  let kbQueryVectors = new Map<string, number[]>();
  if (KB_ENABLED) {
    try {
      kbPrepared = await prepareKnowledgeBase();
      kbQueryVectors = await embedQueries(leaders);
      log.info('knowledge', 'knowledge base ready', {
        entries: kbPrepared.entries.length,
        queryVectors: kbQueryVectors.size,
      });
    } catch (kbErr) {
      log.warn('heal', 'knowledge base preparation failed (continuing without KB)', {
        error: (kbErr as Error).message,
      });
      kbPrepared = { entries: [], entryVectors: new Map() };
      kbQueryVectors = new Map();
    }
  }

  const buildCaseLog = (classifiedFailure: ClassifiedFailure): CaseTelemetry => {
    const leaderTestCaseId = dedup.duplicateToLeader.get(classifiedFailure.testCaseId) ?? null;
    const isDuplicate = leaderTestCaseId !== null;
    const signatureKey = isDuplicate
      ? (dedup.leaderToGroup.get(leaderTestCaseId!)?.signatureKey ?? null)
      : (dedup.leaderToGroup.get(classifiedFailure.testCaseId)?.signatureKey ?? null);

    return {
      testCaseId: classifiedFailure.testCaseId,
      rootCauseCategory: classifiedFailure.rootCauseCategory,
      categoryOverride: null,
      effectiveCategory: classifiedFailure.rootCauseCategory,
      orchestratorConfidence: null,
      subagent: null,
      bugLocation: null,
      suspectedRepo: null,
      proposalKind: null,
      verdict: null,
      prResult: 'pending',
      prUrl: null,
      costUsd: 0,
      errors: [],
      isDuplicate,
      leaderTestCaseId,
      signatureKey,
      kbMatchIds: [],
      shortCircuit: 'none',
      cardAttempts: [],
      csvStatus: null,
      csvIssueType: null,
      reasoning: null,
    };
  };

  const limit = pLimit(CONCURRENCY);
  const verifyLimit = pLimit(VERIFY_CONCURRENCY);
  const leaderFixes = new Map<string, LeaderFix>();
  let started = 0;
  let completed = 0;

  // Note on caps under concurrency: budget/PR caps are checked before each
  // leader's expensive work, but with up to CONCURRENCY leaders in flight the
  // cap can be crossed by an already-running leader. The overshoot is therefore
  // bounded by CONCURRENCY — a deliberate tradeoff for the wall-clock win.
  const processLeader = async (classifiedFailure: ClassifiedFailure): Promise<CaseTelemetry> => {
    const caseLog = buildCaseLog(classifiedFailure);
    const position = ++started;
    log.separator(classifiedFailure.testCaseId, `${position}/${leaders.length}`);

    if (totalCostUsd >= TOKEN_BUDGET_USD) {
      log.decision(
        'heal',
        'skip case',
        `budget cap reached: $${totalCostUsd.toFixed(2)} >= $${TOKEN_BUDGET_USD}`,
        { testCaseId: classifiedFailure.testCaseId }
      );
      caseLog.prResult = 'skipped-budget-cap';
      return caseLog;
    }
    if (prsOpened >= PR_CAP) {
      log.decision('heal', 'skip case', `PR cap reached: ${prsOpened} >= ${PR_CAP}`, {
        testCaseId: classifiedFailure.testCaseId,
      });
      caseLog.prResult = 'skipped-pr-cap';
      return caseLog;
    }

    log.info('heal', `case start`, {
      testCaseId: classifiedFailure.testCaseId,
      category: classifiedFailure.rootCauseCategory,
      teamOwner: classifiedFailure.teamOwner,
      isCredentialIssue: classifiedFailure.isCredentialIssue,
      runningTotalCostUsd: Number(totalCostUsd.toFixed(4)),
      prsOpenedSoFar: prsOpened,
    });

    // Lazy enrich: only leaders pay the I/O cost (~100-250ms per case for trace.zip parsing).
    const enrichedFailure = enrichFailure(
      classifiedFailure,
      normalizedById.get(classifiedFailure.testCaseId),
      { testResultsDir: args.testResultsDir }
    );

    try {
      const investigated = await investigateFailure(enrichedFailure);

      let knowledgeMatches: KnowledgeMatch[] = [];
      if (KB_ENABLED) {
        const queryVec = kbQueryVectors.get(classifiedFailure.testCaseId);
        if (queryVec) {
          knowledgeMatches = scoreKnowledge(classifiedFailure, queryVec, kbPrepared);
          caseLog.kbMatchIds = knowledgeMatches.map((m) => m.entry.id);
        }
      }
      const knowledgeSection = formatKnowledgeSection(knowledgeMatches);

      // Tiered short-circuit: a high-confidence exact-testCase KB match can
      // bypass the orchestrator LLM (tier "route") or both LLM calls (tier
      // "apply"). verify still gates every PR. Tier "known-issue" gates nothing
      // further down — handled separately below.
      const sc = decideShortCircuit(knowledgeMatches, investigated.rootCauseCategory);
      caseLog.shortCircuit = sc.tier;

      if (sc.tier === 'known-issue' && sc.match) {
        // Known, recurring, non-actionable failure (e.g. a PSP returning the
        // same decline on every regression run, with no fix on our side). No
        // orchestrator, no subagent, no verify, no PR/Issue — just mark the
        // CSV so devs don't re-review a case that's already triaged.
        const entry = sc.match.entry;
        caseLog.kbMatchIds = [entry.id];
        caseLog.orchestratorConfidence = sc.match.score;
        caseLog.proposalKind = 'enrichment_only';
        caseLog.csvStatus = entry.knownExternalIssue!.csvStatus;
        caseLog.csvIssueType = entry.knownExternalIssue!.csvIssueType;
        caseLog.prResult = 'known-issue';
        log.decision(
          'heal',
          'known external/PSP issue',
          `KB ${entry.id} (score ${sc.match.score.toFixed(2)}) — marking CSV, no LLM beyond classify`,
          { testCaseId: enrichedFailure.testCaseId }
        );
        return caseLog;
      }

      let decision: OrchestratorDecision;
      if (sc.tier !== 'none' && sc.match) {
        decision = decisionFromKnowledge(
          sc.match.entry,
          sc.match.score,
          investigated.rootCauseCategory
        );
        log.decision(
          'heal',
          `short-circuit ${sc.tier.toUpperCase()}`,
          `KB ${sc.match.entry.id} (${sc.reason})`,
          {
            testCaseId: enrichedFailure.testCaseId,
            score: Number(sc.match.score.toFixed(2)),
            skippedOrchestratorLlm: true,
          }
        );
      } else {
        const orchestratorResult = await runOrchestrator(
          investigated,
          knowledgeSection || undefined
        );
        decision = orchestratorResult.decision;
        const orchestratorCost = estimateCostUsd(
          orchestratorResult.model,
          orchestratorResult.usage as UsageRecord
        );
        caseLog.costUsd += orchestratorCost;
        totalCostUsd += orchestratorCost;
      }
      caseLog.orchestratorConfidence = decision.confidence;
      caseLog.subagent = decision.subagent;
      caseLog.bugLocation = decision.bugLocation;
      caseLog.suspectedRepo = decision.suspectedRepo;
      caseLog.reasoning = decision.reasoning;

      if (decision.confidence < args.confidenceThreshold) {
        log.decision(
          'heal',
          'skip case',
          `orchestrator confidence ${decision.confidence.toFixed(2)} below threshold ${args.confidenceThreshold}`,
          { testCaseId: enrichedFailure.testCaseId }
        );
        caseLog.prResult = `skipped-low-confidence (${decision.confidence.toFixed(2)} < ${args.confidenceThreshold})`;
        return caseLog;
      }

      const effectiveCategory =
        decision.categoryOverride && decision.categoryOverride !== investigated.rootCauseCategory
          ? decision.categoryOverride
          : investigated.rootCauseCategory;
      const overrideApplied = effectiveCategory !== investigated.rootCauseCategory;
      caseLog.categoryOverride = overrideApplied ? effectiveCategory : null;
      caseLog.effectiveCategory = effectiveCategory;

      // psp/country are ranking hints for getCardCandidates, not filters — the
      // pool is queried even when one or both can't be guessed from tags,
      // since any card in the (curated, known-successful) pool is a valid
      // candidate in a sandbox PSP environment.
      let alternativeCards: PooledCard[] | undefined;
      const cardPsp = guessPspFromTags(investigated.tags);
      const cardCountry = guessCountryFromTags(investigated.tags);
      if (decision.subagent === 'cardFixer' || decision.subagent === 'testDataFixer') {
        alternativeCards = getCardCandidates({ psp: cardPsp, country: cardCountry });
        log.info('heal', 'card pool loaded', {
          psp: cardPsp ?? '(unknown)',
          country: cardCountry ?? '(unknown)',
          alternatives: alternativeCards.length,
          testCaseId: enrichedFailure.testCaseId,
        });
      }

      const ctx: SubagentContext = {
        failure: {
          ...investigated,
          rootCauseCategory: effectiveCategory,
          suspectedRepo: decision.suspectedRepo,
        },
        alternativeCards,
        originalRootCauseCategory: overrideApplied ? investigated.rootCauseCategory : null,
        knowledgeSection: knowledgeSection || undefined,
      };
      let subagentResult: SubagentRunResult;
      if (sc.tier === 'apply' && sc.match) {
        // Skip the subagent LLM entirely: apply the entry's replayable fix.
        subagentResult = buildShortCircuitProposal(sc.match.entry, ctx, sc.match.score);
      } else {
        subagentResult = await dispatchSubagent(decision.subagent, ctx);
        const subagentCost = estimateCostUsd(
          subagentResult.model,
          subagentResult.usage as UsageRecord
        );
        caseLog.costUsd += subagentCost;
        totalCostUsd += subagentCost;
      }
      caseLog.proposalKind = subagentResult.proposal.kind;
      caseLog.reasoning = subagentResult.proposal.reasoning;

      if (args.dryRun || args.noPr) {
        const flag = args.dryRun ? '--dry-run' : '--no-pr';
        log.decision('heal', 'skip verifier+pr', `${flag} flag set`, {
          testCaseId: enrichedFailure.testCaseId,
        });
        caseLog.prResult = args.dryRun ? 'dry-run' : 'no-pr-flag';
        return caseLog;
      }

      // Skips the (expensive) verify run when the proposal doesn't reference
      // any of the exact candidates it was offered — a strong signal of a
      // hallucinated identifier rather than a real pooled card. See
      // buildUngroundedResult. Its empty `reruns` also makes looksLikeCardIssue
      // naturally false, so the retry loop below stops instead of burning its
      // next attempt on the same ungrounded pattern.
      const verifyGroundedCardSwap = (
        proposal: Proposal,
        candidates: PooledCard[]
      ): Promise<VerifiedProposal> => {
        if (!detectUsedCard(proposal.fileChanges, candidates)) {
          log.warn('heal', 'cardFixer proposal references no known pooled card — skipping verify', {
            testCaseId: enrichedFailure.testCaseId,
            candidates: candidates.map((c) => c.variableName),
          });
          return Promise.resolve(buildUngroundedResult(proposal, candidates));
        }
        return verifyLimit(() =>
          verifyProposal(proposal, { baseBranch: process.env.AI_HEAL_BASE_BRANCH })
        );
      };

      let verified: VerifiedProposal;
      if (subagentResult.proposal.kind === 'diff' && decision.subagent === 'cardFixer') {
        // cardFixer gets a bounded, deterministic retry loop: verify the first
        // swap, and — only if the failure still looks card-related — ask
        // cardFixer again (excluding cards already tried this case) up to
        // CARDFIXER_MAX_ATTEMPTS distinct cards. The loop bound is mechanical
        // (no LLM call decides whether to retry), so cost/wall-clock stay
        // predictable: at most CARDFIXER_MAX_ATTEMPTS verify runs.
        const cardAttempts: CardAttemptLog[] = [];
        let currentProposal = subagentResult.proposal;
        let attempt = 1;

        verified = await verifyGroundedCardSwap(currentProposal, alternativeCards ?? []);
        recordCardAttempt(
          cardAttempts,
          currentProposal.fileChanges,
          alternativeCards ?? [],
          verified
        );

        while (
          verified.verdict !== 'ready-to-pr' &&
          attempt < CARDFIXER_MAX_ATTEMPTS &&
          looksLikeCardIssue(verified)
        ) {
          attempt++;
          const nextCandidates = getCardCandidates({
            psp: cardPsp,
            country: cardCountry,
            exclude: cardAttempts.map((a) => a.variableName),
          });
          if (nextCandidates.length === 0) {
            log.decision('heal', 'cardFixer retry stop', 'card pool exhausted for this run', {
              testCaseId: enrichedFailure.testCaseId,
              attempt,
            });
            break;
          }

          const retryResult = await dispatchSubagent('cardFixer', {
            ...ctx,
            alternativeCards: nextCandidates,
            previousCardAttempts: cardAttempts.map((a) => ({
              variableName: a.variableName,
              failureSummary: a.errorMessage ?? 'verification failed',
            })),
          });
          const retryCost = estimateCostUsd(retryResult.model, retryResult.usage as UsageRecord);
          caseLog.costUsd += retryCost;
          totalCostUsd += retryCost;

          if (
            retryResult.proposal.kind !== 'diff' ||
            retryResult.proposal.fileChanges.length === 0
          ) {
            log.decision('heal', 'cardFixer retry stop', 'subagent gave up (no further diff)', {
              testCaseId: enrichedFailure.testCaseId,
              attempt,
            });
            break;
          }

          currentProposal = retryResult.proposal;
          verified = await verifyGroundedCardSwap(currentProposal, nextCandidates);
          recordCardAttempt(cardAttempts, currentProposal.fileChanges, nextCandidates, verified);
        }

        caseLog.cardAttempts = cardAttempts;
        log.decision(
          'heal',
          `cardFixer retry loop done (${cardAttempts.length} attempt(s))`,
          verified.verdict === 'ready-to-pr'
            ? 'a swap passed verification'
            : verified.verdict === 'verify-error'
              ? 'verify could not run the test (swap NOT evaluated)'
              : 'all swaps failed verification',
          { testCaseId: enrichedFailure.testCaseId, cardAttempts }
        );
      } else if (subagentResult.proposal.kind === 'diff') {
        // verify is CPU/browser-heavy: gate it through its own small limiter so
        // concurrent leaders don't each spawn a full Playwright run at once.
        verified = await verifyLimit(() =>
          verifyProposal(subagentResult.proposal, {
            baseBranch: process.env.AI_HEAL_BASE_BRANCH,
          })
        );
      } else {
        log.info('heal', `${enrichedFailure.testCaseId}: skip verifier`, {
          reason: `kind=${subagentResult.proposal.kind} (no fileChanges to verify)`,
        });
        verified = VerifiedProposalSchema.parse({
          ...subagentResult.proposal,
          reruns: [],
          passedCount: 0,
          failedCount: 0,
          verdict: 'skipped-no-diff',
          verifiedConfidence: subagentResult.proposal.confidence,
        });
      }
      caseLog.verdict = verified.verdict;
      caseLog.reasoning = verified.reasoning;

      const prResult = await submitProposal(verified, {
        owner: args.owner,
        repo: args.repo,
        releaseId: args.releaseId,
      });
      caseLog.prResult = prResult.kind;
      if (prResult.kind === 'pr' || prResult.kind === 'issue') {
        caseLog.prUrl = prResult.url;
        prsOpened++;
      }
      // Only a fix that actually works is worth copying to the rest of the
      // group: verdict==='ready-to-pr' means verify re-ran the real spec with
      // it and it passed.
      if (prResult.kind === 'pr' && verified.verdict === 'ready-to-pr') {
        leaderFixes.set(classifiedFailure.testCaseId, {
          subagent: decision.subagent,
          verified,
          prNumber: prResult.number,
          prUrl: prResult.url,
          branch: prResult.branch,
          changedPaths: verified.fileChanges.map((c) => c.path),
          knowledgeSection,
        });
      }
    } catch (err) {
      caseLog.errors.push((err as Error).message);
      log.error('heal', `${enrichedFailure.testCaseId}: case failed`, err);
    }

    log.info('heal', `case end`, {
      testCaseId: enrichedFailure.testCaseId,
      progress: `${++completed}/${leaders.length}`,
      result: caseLog.prResult,
      caseCostUsd: Number(caseLog.costUsd.toFixed(4)),
      errors: caseLog.errors.length,
    });
    return caseLog;
  };

  log.info('heal', 'processing leaders', {
    leaders: leaders.length,
    duplicates: duplicates.length,
    concurrency: CONCURRENCY,
    verifyConcurrency: VERIFY_CONCURRENCY,
  });

  const leaderCases = await Promise.all(
    leaders.map((classifiedFailure) => limit(() => processLeader(classifiedFailure)))
  );
  cases.push(...leaderCases);

  const leaderCaseById = new Map(leaderCases.map((c) => [c.testCaseId, c]));

  // ---------------------------------------------------------------------------
  // Propagation phase: carry a leader's VERIFIED fix to the rest of its group.
  //
  // Dedup exists to avoid paying for the same analysis N times, but it was also
  // skipping the FIX: a duplicate inherited the leader's CSV text and its own
  // spec stayed broken. Each duplicate gets the leader's fix as input, its own
  // subagent call (so it can decline — e.g. a debit-Mastercard case must not be
  // moved to a Visa) and its own verify run before anything is committed.
  // ---------------------------------------------------------------------------
  const leaderFixSectionFor = (fix: LeaderFix, leaderTestCaseId: string): string =>
    [
      '## Fix already verified for this root cause',
      '',
      `Test case \`${leaderTestCaseId}\` failed with the same root cause and this fix passed its re-run ` +
        `(${fix.verified.passedCount}/${fix.verified.reruns.length}):`,
      '',
      ...fix.verified.fileChanges.map((c) => `- \`${c.action}\` \`${c.path}\``),
      '',
      `Reasoning: ${fix.verified.reasoning}`,
      '',
      'Apply the EQUIVALENT change to the failing test case you were given — same idea, adapted to its own',
      'file and its own way of referencing the value. If it does not apply (for example the test asserts a',
      'specific card brand or payment method that the fix would change, or the file is already fixed),',
      'return kind="enrichment_only" and say why instead of forcing it.',
    ].join('\n');

  const propagationTasks: Promise<void>[] = [];
  let propagatedCount = 0;
  const propagationSummaries = new Map<
    string,
    { propagated: PropagationSummaryEntry[]; skipped: { testCaseId: string; reason: string }[] }
  >();
  const summaryFor = (leaderTestCaseId: string) => {
    let entry = propagationSummaries.get(leaderTestCaseId);
    if (!entry) {
      entry = { propagated: [], skipped: [] };
      propagationSummaries.set(leaderTestCaseId, entry);
    }
    return entry;
  };

  const propagateToDuplicate = async (
    classifiedFailure: ClassifiedFailure,
    caseLog: CaseTelemetry,
    leaderTestCaseId: string,
    fix: LeaderFix
  ): Promise<void> => {
    const summary = summaryFor(leaderTestCaseId);
    // Re-checked here, not only when the task was queued: the leaders and the
    // other propagations running alongside this one may have crossed the cap
    // since then.
    if (totalCostUsd >= TOKEN_BUDGET_USD) {
      caseLog.prResult = 'skipped-budget-cap';
      log.decision(
        'propagate',
        'skip case',
        `budget cap reached: $${totalCostUsd.toFixed(2)} >= $${TOKEN_BUDGET_USD}`,
        { testCaseId: classifiedFailure.testCaseId }
      );
      return;
    }

    const enrichedFailure = enrichFailure(
      classifiedFailure,
      normalizedById.get(classifiedFailure.testCaseId),
      { testResultsDir: args.testResultsDir }
    );

    // The leader's commit can already cover a duplicate — a shared helper or a
    // page object both specs go through. There is nothing to propose then.
    if (enrichedFailure.specFile && fix.changedPaths.includes(enrichedFailure.specFile)) {
      caseLog.prResult = 'propagated-covered';
      caseLog.prUrl = fix.prUrl;
      log.decision(
        'propagate',
        'already covered',
        `${enrichedFailure.specFile} is already changed by ${leaderTestCaseId}'s fix`,
        { testCaseId: classifiedFailure.testCaseId }
      );
      return;
    }

    const investigated = await investigateFailure(enrichedFailure);
    const subagentResult = await dispatchSubagent(fix.subagent, {
      failure: investigated,
      originalRootCauseCategory: null,
      alternativeCards:
        fix.subagent === 'cardFixer' || fix.subagent === 'testDataFixer'
          ? getCardCandidates({
              psp: guessPspFromTags(investigated.tags),
              country: guessCountryFromTags(investigated.tags),
            })
          : undefined,
      knowledgeSection: fix.knowledgeSection || undefined,
      leaderFixSection: leaderFixSectionFor(fix, leaderTestCaseId),
    });
    const cost = estimateCostUsd(subagentResult.model, subagentResult.usage as UsageRecord);
    caseLog.costUsd += cost;
    totalCostUsd += cost;
    caseLog.subagent = fix.subagent;
    caseLog.proposalKind = subagentResult.proposal.kind;
    caseLog.reasoning = subagentResult.proposal.reasoning;

    if (
      subagentResult.proposal.kind !== 'diff' ||
      subagentResult.proposal.fileChanges.length === 0
    ) {
      caseLog.prResult = 'propagation-declined';
      summary.skipped.push({
        testCaseId: classifiedFailure.testCaseId,
        reason: `${fix.subagent} did not apply the fix: ${truncateReason(subagentResult.proposal.reasoning)}`,
      });
      log.decision('propagate', 'declined', `kind=${subagentResult.proposal.kind}`, {
        testCaseId: classifiedFailure.testCaseId,
      });
      return;
    }

    // A proposal that touches a file the leader already changed cannot be
    // committed on top of the leader's branch: its contents were generated from
    // the BASE version of that file, so committing it would overwrite the
    // leader's own fix with a variant of itself. verify would also be
    // misleading here — it runs against the base branch, where the leader's
    // change does not exist yet. Hand those to a human instead.
    const overlapping = subagentResult.proposal.fileChanges
      .map((c) => c.path)
      .filter((path) => fix.changedPaths.includes(path));
    if (overlapping.length > 0) {
      caseLog.prResult = 'propagation-declined';
      summary.skipped.push({
        testCaseId: classifiedFailure.testCaseId,
        reason:
          `the proposed fix touches ${overlapping.join(', ')}, already changed by ${leaderTestCaseId} — ` +
          `re-check this case once the leader's PR is merged`,
      });
      log.decision(
        'propagate',
        'declined',
        `overlaps the leader's own change: ${overlapping.join(', ')}`,
        {
          testCaseId: classifiedFailure.testCaseId,
        }
      );
      return;
    }

    const verified = await verifyLimit(() =>
      verifyProposal(subagentResult.proposal, {
        baseBranch: process.env.AI_HEAL_BASE_BRANCH,
        repeat: PROPAGATE_VERIFY_REPEAT,
      })
    );
    caseLog.verdict = verified.verdict;
    caseLog.reasoning = verified.reasoning;

    if (verified.verdict !== 'ready-to-pr') {
      caseLog.prResult = 'propagation-failed';
      summary.skipped.push({
        testCaseId: classifiedFailure.testCaseId,
        reason:
          verified.verdict === 'verify-error'
            ? `verify could not run the test: ${truncateReason(verified.verifyError ?? 'unknown')}`
            : `the adapted fix did not pass its re-run (${verified.passedCount}/${verified.reruns.length})`,
      });
      return;
    }

    const paths = await submitPropagatedFix(verified, {
      owner: args.owner,
      repo: args.repo,
      branch: fix.branch,
      prNumber: fix.prNumber,
      leaderTestCaseId,
    });
    caseLog.prResult = 'propagated';
    caseLog.prUrl = fix.prUrl;
    propagatedCount++;
    summary.propagated.push({
      testCaseId: classifiedFailure.testCaseId,
      paths,
      passedCount: verified.passedCount,
      totalReruns: verified.reruns.length,
    });
  };

  for (const classifiedFailure of duplicates) {
    const caseLog = buildCaseLog(classifiedFailure);
    const leaderCase = caseLog.leaderTestCaseId
      ? leaderCaseById.get(caseLog.leaderTestCaseId)
      : undefined;
    const leaderFix = caseLog.leaderTestCaseId
      ? leaderFixes.get(caseLog.leaderTestCaseId)
      : undefined;

    if (leaderCase?.shortCircuit === 'known-issue') {
      // Same known external/PSP issue as the leader — inherit the CSV
      // disposition directly so every test case hitting this error gets
      // marked, not just the lexicographically-first one in this run.
      caseLog.prResult = 'known-issue';
      caseLog.shortCircuit = 'known-issue';
      caseLog.kbMatchIds = leaderCase.kbMatchIds;
      caseLog.orchestratorConfidence = leaderCase.orchestratorConfidence;
      caseLog.csvStatus = leaderCase.csvStatus;
      caseLog.csvIssueType = leaderCase.csvIssueType;
      log.decision(
        'heal',
        'known external/PSP issue (inherited)',
        `same root cause as leader ${caseLog.leaderTestCaseId} (KB ${leaderCase.kbMatchIds.join(', ')})`,
        { testCaseId: classifiedFailure.testCaseId }
      );
    } else if (
      PROPAGATE_ENABLED &&
      leaderFix &&
      propagatedCount + propagationTasks.length < PROPAGATE_MAX &&
      totalCostUsd < TOKEN_BUDGET_USD
    ) {
      // Real work, unlike every other duplicate: queued here and awaited below
      // so the group's cases run through the same concurrency limiter as leaders.
      propagationTasks.push(
        limit(async () => {
          try {
            await propagateToDuplicate(
              classifiedFailure,
              caseLog,
              caseLog.leaderTestCaseId!,
              leaderFix
            );
          } catch (err) {
            caseLog.prResult = 'propagation-failed';
            caseLog.errors.push((err as Error).message);
            summaryFor(caseLog.leaderTestCaseId!).skipped.push({
              testCaseId: classifiedFailure.testCaseId,
              reason: `propagation errored: ${truncateReason((err as Error).message)}`,
            });
            log.error('propagate', `${classifiedFailure.testCaseId}: propagation failed`, err);
          }
        })
      );
    } else {
      caseLog.prResult = 'duplicate';
      log.decision(
        'heal',
        'skip case (duplicate)',
        leaderFix
          ? `same root cause as leader ${caseLog.leaderTestCaseId}, but propagation is off or capped (max ${PROPAGATE_MAX}) — inherits leader's decision in CSV`
          : `same root cause as leader ${caseLog.leaderTestCaseId} — no verified leader fix to propagate; inherits leader's decision in CSV (enrich skipped)`,
        { testCaseId: classifiedFailure.testCaseId, leaderTestCaseId: caseLog.leaderTestCaseId }
      );
    }
    cases.push(caseLog);
  }

  if (propagationTasks.length) {
    log.info('heal', 'propagating verified leader fixes to duplicates', {
      duplicates: propagationTasks.length,
      verifyRepeat: PROPAGATE_VERIFY_REPEAT,
      max: PROPAGATE_MAX,
    });
    await Promise.all(propagationTasks);
    for (const [leaderTestCaseId, summary] of propagationSummaries) {
      const fix = leaderFixes.get(leaderTestCaseId)!;
      await commentPropagationSummary({
        owner: args.owner,
        repo: args.repo,
        prNumber: fix.prNumber,
        leaderTestCaseId,
        propagated: summary.propagated,
        skipped: summary.skipped,
      });
    }
    log.decision(
      'heal',
      `propagation done (${propagatedCount}/${propagationTasks.length} committed)`,
      `verified fixes carried to the duplicates of ${propagationSummaries.size} leader(s)`,
      { propagated: propagatedCount }
    );
  }

  // Four-tier %-resolved breakdown (steps/metrics.ts) — the honest version of
  // "% resolved" presented to the CEO/CTO: resolved / assisted / escalated /
  // classified-only, computed from the same telemetry every run already
  // produces, not derived by hand release over release.
  const resolutionMetrics = computeResolutionMetrics(cases);
  log.info('heal', formatResolutionMetrics(resolutionMetrics), { releaseId: args.releaseId });
  await logResolutionMetrics({ releaseId: args.releaseId, ...resolutionMetrics });

  writeTelemetry(args.releaseId, {
    releaseId: args.releaseId,
    provider: AI_PROVIDER,
    classifyModel: classifyResult.model,
    totalCostUsd,
    prsOpened,
    budgetUsd: TOKEN_BUDGET_USD,
    prCap: PR_CAP,
    resolutionMetrics,
    // Not folded into resolutionMetrics: those four tiers are computed over
    // leaders only, so they stay comparable release over release. This counts
    // the duplicate specs that got their own verified fix this run.
    propagatedDuplicates: propagatedCount,
    cases,
  });

  await rewriteReleaseCsv(classifyResult.analysis.failures, cases, normalizedById, {
    confidenceThreshold: args.confidenceThreshold,
    totalCostUsd,
    budgetUsd: TOKEN_BUDGET_USD,
    prsOpened,
    prCap: PR_CAP,
  });

  log.info('heal', 'pipeline done', {
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    prsOpened,
    casesProcessed: cases.length,
    leaders: dedup.totalLeaders,
    duplicates: dedup.totalDuplicates,
    resolutionMetrics,
    breakdown: cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.prResult] = (acc[c.prResult] || 0) + 1;
      return acc;
    }, {}),
  });
};

const writeTelemetry = (releaseId: string, data: unknown): void => {
  const date = new Date().toISOString().slice(0, 10);
  const path = join(process.cwd(), 'jul-ia-n', 'telemetry', 'runs', `${date}-${releaseId}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  log.info('telemetry', `written to ${path}`);
};

interface CsvContext {
  confidenceThreshold: number;
  totalCostUsd: number;
  budgetUsd: number;
  prsOpened: number;
  prCap: number;
}

const rewriteReleaseCsv = async (
  classifiedFailures: ClassifiedFailure[],
  cases: CaseTelemetry[],
  normalizedById: Map<string, NormalizedFailure>,
  ctx: CsvContext
): Promise<void> => {
  const healDecisions = new Map<string, HealCaseDecision>();
  for (const c of cases) {
    healDecisions.set(c.testCaseId, {
      prResult: c.prResult,
      prUrl: c.prUrl,
      subagent: c.subagent,
      proposalKind: c.proposalKind,
      verdict: c.verdict,
      bugLocation: c.bugLocation,
      suspectedRepo: c.suspectedRepo,
      orchestratorConfidence: c.orchestratorConfidence,
      confidenceThreshold: ctx.confidenceThreshold,
      totalCostUsd: ctx.totalCostUsd,
      budgetUsd: ctx.budgetUsd,
      prsOpened: ctx.prsOpened,
      prCap: ctx.prCap,
      errors: c.errors,
      isDuplicate: c.isDuplicate,
      leaderTestCaseId: c.leaderTestCaseId,
      kbMatchIds: c.kbMatchIds,
      cardAttempts: c.cardAttempts,
      shortCircuit: c.shortCircuit,
      csvStatus: c.csvStatus,
      csvIssueType: c.csvIssueType,
      reasoning: c.reasoning,
    });
  }
  const tagsByTestCaseId = new Map<string, string[]>(
    Array.from(normalizedById.entries()).map(([testCaseId, n]) => [testCaseId, n.tags])
  );
  const csv = buildCsv({ failures: classifiedFailures }, healDecisions, tagsByTestCaseId);
  const path = join(process.cwd(), 'jul-ia-n', 'release.csv');
  writeCsvAtomic(path, csv);
  log.info('csv', 'release.csv rewritten with heal decisions', {
    rows: classifiedFailures.length,
    healDecisions: healDecisions.size,
  });

  // Optional: fold in the reiterative-since-last-release comparison. The
  // reviewed baseline lives in jul-ia-n/releases/ (git-tracked, committed
  // manually once QA/dev finish reviewing a release — see PIPELINE.md);
  // AI_HEAL_PREVIOUS_RELEASE_CSV can override which file to use, otherwise
  // the most recent one is auto-picked. Never fatal: no baseline available,
  // or the comparison failing for any reason, just logs and the run
  // continues with a normal (unannotated) CSV.
  const previousReleaseCsv = process.env.AI_HEAL_PREVIOUS_RELEASE_CSV ?? findLatestReleaseCsv();
  if (!previousReleaseCsv) {
    log.warn(
      'csv',
      'no reviewed release CSV found in jul-ia-n/releases/ — skipping cross-release comparison'
    );
  } else if (!existsSync(previousReleaseCsv)) {
    log.warn(
      'csv',
      'AI_HEAL_PREVIOUS_RELEASE_CSV is set but the file does not exist — skipping cross-release comparison',
      { path: previousReleaseCsv }
    );
  } else {
    try {
      await compareWithPreviousRelease(path, previousReleaseCsv, {
        previousReleaseId:
          process.env.AI_HEAL_PREVIOUS_RELEASE_ID ?? inferReleaseLabel(previousReleaseCsv),
      });
    } catch (err) {
      log.warn('csv', 'cross-release comparison failed — continuing with an unannotated CSV', {
        error: (err as Error).message,
      });
    }
  }
};

const KNOWN_PSPS = [
  'baz',
  'adyen',
  'stripe',
  'conekta',
  'bamboo',
  'mercadopago',
  'kushki',
  'payu',
  'getnet',
  'cybersource',
  'paymentez',
  'transbank',
  'redsys',
  'powertranz',
  'globalpay',
  'placetopay',
  'rede',
  'dlocal',
  'mit',
  'nuvei',
  'openpay',
  'prisma',
  'ebanx',
  'worldpay',
  'paypal',
  'safetypay',
  'wompi',
];
const KNOWN_COUNTRIES = ['mx', 'pe', 'ec', 'br', 'ar', 'co', 'cl', 'es', 'hn'];

const guessPspFromTags = (tags: string[]): string | undefined => {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const psp of KNOWN_PSPS) {
      if (lower.includes(psp)) return psp;
    }
  }
  return undefined;
};

const guessCountryFromTags = (tags: string[]): string | undefined => {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const c of KNOWN_COUNTRIES) {
      if (lower === c || lower.endsWith(`_${c}`) || lower.endsWith(`-${c}`)) {
        return c;
      }
    }
  }
  return undefined;
};

main().catch((err) => {
  log.error('heal', 'fatal error', err);
  process.exit(1);
});
