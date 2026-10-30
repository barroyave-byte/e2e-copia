import { Proposal } from '../schemas/proposal';
import { ReRunResult, VerifiedProposal, VerifiedProposalSchema } from '../schemas/verifiedProposal';
import { extractIdsFromText } from './enrich';
import * as playwrightRunner from '../tools/playwrightRunner';
import { log } from '../util/log';

export interface VerifyOptions {
  baseBranch?: string;
  repoCwd?: string;
  repeat?: number;
  project?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_BRANCH = process.env.AI_HEAL_BASE_BRANCH || 'develop';
// How many times to re-run the test in the worktree before deciding
// ready-to-pr. Default is 3 (majority-of-3, i.e. 2/3 must pass) — a single
// pass is too weak a signal for PSP-sandbox-flow fixes (card swaps, decline
// retries), which can pass once by chance without the underlying issue
// actually being fixed. Confirmed in practice 2026-07-29: PR #3190
// (cardFixer, niubiz DP-7101) opened on a 1/1 verify pass, then failed 3/3 on
// manual re-validation — the card swap never fixed the real decline, the
// single re-run just got lucky. Lower via AI_HEAL_VERIFY_REPEAT only with a
// clear reason (e.g. cost/time pressure); the ready-to-pr threshold below
// scales with this value automatically.
const DEFAULT_REPEAT = Math.max(1, Number(process.env.AI_HEAL_VERIFY_REPEAT || '3'));

const buildSkippedResult = (proposal: Proposal, reason: string): VerifiedProposal =>
  VerifiedProposalSchema.parse({
    ...proposal,
    reruns: [],
    passedCount: 0,
    failedCount: 0,
    verdict: 'skipped-no-diff',
    verifiedConfidence: proposal.confidence,
    reasoning: `${proposal.reasoning}\n\n[verifier: ${reason}]`,
  });

const buildVerifyErrorResult = (proposal: Proposal, reason: string): VerifiedProposal =>
  VerifiedProposalSchema.parse({
    ...proposal,
    reruns: [],
    passedCount: 0,
    failedCount: 0,
    verdict: 'verify-error',
    verifiedConfidence: Math.min(proposal.confidence, 0.3),
    verifyError: reason,
    reasoning: `${proposal.reasoning}\n\n[verifier: could not execute the test, fix NOT evaluated — ${reason}]`,
  });

const VERIFY_ERROR_MAX_CHARS = 1000;

export const verifyProposal = async (
  proposal: Proposal,
  opts: VerifyOptions = {}
): Promise<VerifiedProposal> => {
  if (proposal.kind !== 'diff' || proposal.fileChanges.length === 0) {
    log.decision(
      'verify',
      'skip',
      `kind=${proposal.kind}, fileChanges=${proposal.fileChanges.length}`,
      { testCaseId: proposal.testCaseId }
    );
    return buildSkippedResult(
      proposal,
      `kind=${proposal.kind}, fileChanges=${proposal.fileChanges.length}`
    );
  }
  if (!proposal.specFile) {
    log.decision('verify', 'skip', 'no specFile available; cannot re-run test', {
      testCaseId: proposal.testCaseId,
    });
    return buildSkippedResult(proposal, 'no specFile available; cannot re-run test');
  }

  const browserProblem = playwrightRunner.missingBrowserReason();
  if (browserProblem) {
    log.error('verify', `${proposal.testCaseId}: cannot run test`, new Error(browserProblem));
    return buildVerifyErrorResult(proposal, browserProblem);
  }

  const baseBranch = opts.baseBranch ?? DEFAULT_BASE_BRANCH;
  const repoCwd = opts.repoCwd ?? process.cwd();
  const branchName = `ai-heal-verify/${proposal.testCaseId}-${Date.now()}`;
  const repeat = opts.repeat ?? DEFAULT_REPEAT;

  log.info('verify', `${proposal.testCaseId}: creating worktree`, {
    baseBranch,
    branchName,
    fileChanges: proposal.fileChanges.length,
  });

  const worktree = await playwrightRunner.createWorktree(baseBranch, branchName, repoCwd);
  log.info('verify', `${proposal.testCaseId}: worktree ready`, {
    path: worktree.path,
  });

  try {
    for (const change of proposal.fileChanges) {
      await playwrightRunner.applyFileChange(worktree.path, change);
      log.info('verify', `${proposal.testCaseId}: applied ${change.action}`, {
        path: change.path,
      });
    }

    log.info('verify', `${proposal.testCaseId}: running test ${repeat}x`, {
      specPath: proposal.specFile,
      project: opts.project ?? 'chromium',
    });
    const summary = await playwrightRunner.runTest({
      specPath: proposal.specFile,
      repeat,
      project: opts.project ?? 'chromium',
      timeoutMs: opts.timeoutMs ?? 5 * 60 * 1000,
      cwd: worktree.path,
    });

    // Zero results means Playwright never executed the spec (dependency
    // project failed, spec failed to compile, run killed by timeout...).
    // Reporting that as needs-human would claim the fix was tried and failed
    // when it was never evaluated, and it drops the only error that explains
    // why — which is how every CI cardFixer swap was silently rejected.
    if (summary.total === 0) {
      const reason = (
        summary.errors.join(' | ') ||
        'Playwright executed 0 tests and reported no error (possible timeout kill or spec not matched)'
      ).slice(0, VERIFY_ERROR_MAX_CHARS);
      log.decision('verify', 'verify-error', '0 tests executed', {
        testCaseId: proposal.testCaseId,
        reason,
      });
      return buildVerifyErrorResult(proposal, reason);
    }

    const reruns: ReRunResult[] = summary.durations.map((d, i) => ({
      attempt: i + 1,
      passed: i < summary.passed,
      durationMs: d,
      errorMessage: summary.errors[i] ?? null,
    }));

    const passRate = summary.total > 0 ? summary.passed / summary.total : 0;
    // Majority of the configured repeat count: repeat=1 (default) needs 1
    // pass, repeat=3 needs 2 — preserves the original "2 of 3" behavior for
    // anyone who raises AI_HEAL_VERIFY_REPEAT back up.
    const passThreshold = Math.ceil(repeat / 2);
    const verdict = summary.passed >= passThreshold ? 'ready-to-pr' : 'needs-human';
    const verifiedConfidence = Math.min(1, (proposal.confidence + passRate) / 2);

    // Only worth extracting when at least one attempt genuinely passed — a
    // needs-human verdict has no successful attempt to point evidence at, and
    // IDs pulled from a failed attempt's stdout would be just as misleading
    // as the pre-fix "Evidencia" section this was built to stop confusing
    // reviewers with (see steps/pr.ts).
    const verifyIds =
      summary.passed > 0
        ? extractIdsFromText(summary.stdout)
        : { orderId: null, transactionId: null, xRequestIds: [] };

    log.decision('verify', verdict, `${summary.passed}/${summary.total} passed`, {
      testCaseId: proposal.testCaseId,
      verifiedConfidence: Number(verifiedConfidence.toFixed(2)),
      verifyTransactionId: verifyIds.transactionId,
    });

    return VerifiedProposalSchema.parse({
      ...proposal,
      reruns,
      passedCount: summary.passed,
      failedCount: summary.failed,
      verdict,
      verifiedConfidence,
      verifyOrderId: verifyIds.orderId,
      verifyTransactionId: verifyIds.transactionId,
      verifyXRequestIds: verifyIds.xRequestIds,
      reasoning: `${proposal.reasoning}\n\n[verifier: ${summary.passed}/${summary.total} passed in re-run]`,
    });
  } finally {
    log.info('verify', `${proposal.testCaseId}: cleanup worktree`, {
      path: worktree.path,
    });
    await worktree.cleanup();
  }
};
