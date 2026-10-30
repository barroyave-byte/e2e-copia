import { VerifiedProposal } from '../schemas/verifiedProposal';
import * as github from '../tools/github';
import { log } from '../util/log';

const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'deunalabs.atlassian.net';

const buildTestCaseUrl = (testCaseKey: string): string =>
  `https://${JIRA_DOMAIN}/browse/${testCaseKey}`;

export interface PrTargetOptions {
  owner: string;
  repo: string;
  baseBranch?: string;
  releaseId: string;
  reviewers?: string[];
  teamReviewers?: string[];
}

export type PrResult =
  | { kind: 'pr'; number: number; url: string; branch: string }
  | { kind: 'issue'; number: number; url: string }
  | { kind: 'none'; reason: string };

const DEFAULT_BASE_BRANCH = process.env.AI_HEAL_BASE_BRANCH || 'develop';

const fileChangesSummary = (proposal: VerifiedProposal): string => {
  if (proposal.fileChanges.length === 0) return '_(no file changes)_';
  return proposal.fileChanges.map((c) => `- \`${c.action}\` \`${c.path}\``).join('\n');
};

const rerunsSummary = (proposal: VerifiedProposal): string => {
  if (proposal.reruns.length === 0) return '_(no re-runs)_';
  return proposal.reruns
    .map((r) => `- attempt ${r.attempt}: ${r.passed ? '✅ pass' : '❌ fail'} (${r.durationMs}ms)`)
    .join('\n');
};

const evidenceSection = (proposal: VerifiedProposal): string => {
  const lines: string[] = [];
  if (proposal.orderId) lines.push(`- **orderId:** \`${proposal.orderId}\``);
  if (proposal.transactionId) lines.push(`- **transactionId:** \`${proposal.transactionId}\``);
  if (proposal.xRequestIds.length > 0) {
    lines.push(
      `- **xRequestIds:** ${proposal.xRequestIds
        .slice(0, 3)
        .map((x) => `\`${x}\``)
        .join(', ')}`
    );
  }
  if (proposal.cloudWatchLogs.length > 0) {
    lines.push(
      `- **CloudWatch:** ${proposal.cloudWatchLogs.length} events across ${new Set(proposal.cloudWatchLogs.map((l) => l.logGroup)).size} log group(s)`
    );
  }
  if (proposal.httpLogsSnippet) {
    lines.push(
      `- **HTTP logs (stdout):** ${proposal.httpLogsSnippet.length} chars of filtered [HTTP ...] blocks`
    );
  }
  if (proposal.networkCalls.length > 0) {
    lines.push(
      `- **Browser network calls (trace):** ${proposal.networkCalls.length} relevant calls captured`
    );
  }
  if (proposal.artifactPaths.trace) {
    lines.push(`- **Trace:** \`${proposal.artifactPaths.trace}\``);
  }
  return lines.length > 0 ? lines.join('\n') : '_(no enriched evidence captured)_';
};

// Fresh IDs pulled from the verify re-run's OWN stdout (steps/verify.ts,
// only set when at least one attempt passed) — the actual proof a reviewer
// asked for after finding evidenceSection()'s transactionId belonged to the
// pre-fix failure, not the fix (PR #3190, 2026-07-29). Omitted entirely when
// empty (needs-human verdicts, or a pass whose console output didn't contain
// a recognizable ID) rather than printing a misleading "not found".
const verifyEvidenceSection = (proposal: VerifiedProposal): string | null => {
  const lines: string[] = [];
  if (proposal.verifyOrderId) lines.push(`- **orderId:** \`${proposal.verifyOrderId}\``);
  if (proposal.verifyTransactionId)
    lines.push(`- **transactionId:** \`${proposal.verifyTransactionId}\``);
  if (proposal.verifyXRequestIds.length > 0) {
    lines.push(
      `- **xRequestIds:** ${proposal.verifyXRequestIds
        .slice(0, 3)
        .map((x) => `\`${x}\``)
        .join(', ')}`
    );
  }
  return lines.length > 0 ? lines.join('\n') : null;
};

const formatCategoryLine = (proposal: VerifiedProposal): string => {
  if (proposal.originalRootCauseCategory) {
    return `- **Categoría:** \`${proposal.originalRootCauseCategory}\` → override \`${proposal.rootCauseCategory}\` _(orquestador detectó evidencia que contradijo la clasificación inicial)_`;
  }
  return `- **Categoría:** \`${proposal.rootCauseCategory}\``;
};

const buildBody = (proposal: VerifiedProposal): string => {
  const zephyrUrl = buildTestCaseUrl(proposal.testCaseId);
  const verifyEvidence = verifyEvidenceSection(proposal);
  const verifyEvidenceBlock = verifyEvidence
    ? `\n\n### Evidencia de la re-ejecución exitosa (de verify, no de la falla original)\n${verifyEvidence}`
    : '';
  return `## Test fallido
- **Test case:** [\`${proposal.testCaseId}\`](${zephyrUrl})
- **Descripción:** ${proposal.testDescription}
- **Team:** \`${proposal.teamOwner}\`
${formatCategoryLine(proposal)}
- **Subagente:** \`${proposal.subagent}\`
- **Confidence:** \`${proposal.confidence.toFixed(2)}\` (verificada: \`${proposal.verifiedConfidence.toFixed(2)}\`)

## Análisis IA
${proposal.reasoning}

## Evidencia (de la falla original, previa al fix — NO de la re-ejecución de verify)
${evidenceSection(proposal)}

## Cambio propuesto
${fileChangesSummary(proposal)}

## Verificación
${rerunsSummary(proposal)}${verifyEvidenceBlock}

**Verdict:** \`${proposal.verdict}\` — ${proposal.passedCount}/${proposal.passedCount + proposal.failedCount} re-runs passed.

---
⚠️ **PR generado por jul-IA-N (auto-heal).** Revisión humana obligatoria. Si la solución no es correcta, cerrá el PR sin merge — la telemetría se actualiza solo y el agente aprende.

- [ ] La solución propuesta es correcta
- [ ] La evidencia respalda el análisis
- [ ] El test re-ejecutado pasa de forma consistente
`;
};

const buildIssueBody = (proposal: VerifiedProposal): string => {
  const zephyrUrl = buildTestCaseUrl(proposal.testCaseId);
  const detail = proposal.issueBody ?? '_(no issue body provided)_';
  return `## Test fallido
- **Test case:** [\`${proposal.testCaseId}\`](${zephyrUrl})
- **Team:** \`${proposal.teamOwner}\`
${formatCategoryLine(proposal)}
- **Subagente:** \`${proposal.subagent}\`

## Detalle
${detail}

## Análisis IA
${proposal.reasoning}

## Evidencia (de la falla original, previa al fix — NO de la re-ejecución de verify)
${evidenceSection(proposal)}

---
⚠️ Issue generada por jul-IA-N (auto-heal).
`;
};

export const submitProposal = async (
  proposal: VerifiedProposal,
  target: PrTargetOptions
): Promise<PrResult> => {
  if (proposal.kind === 'enrichment_only') {
    log.decision('pr', 'no submission', 'kind=enrichment_only', {
      testCaseId: proposal.testCaseId,
    });
    return { kind: 'none', reason: 'enrichment_only' };
  }

  const labels = ['ai-heal', `ai-heal/${proposal.rootCauseCategory}`];

  if (proposal.kind === 'issue') {
    log.info('pr', `${proposal.testCaseId}: opening issue`, {
      owner: target.owner,
      repo: target.repo,
      labels,
    });
    const result = await github.openIssue({
      owner: target.owner,
      repo: target.repo,
      title: `[AI-Heal] ${proposal.testCaseId}: ${proposal.rootCauseCategory}`,
      body: buildIssueBody(proposal),
      labels,
      assignees: target.reviewers,
    });
    log.decision('pr', `issue #${result.number} opened`, result.url, {
      testCaseId: proposal.testCaseId,
    });
    return { kind: 'issue', number: result.number, url: result.url };
  }

  if (proposal.verdict !== 'ready-to-pr') {
    log.decision('pr', 'no submission', `verdict=${proposal.verdict} (need ready-to-pr)`, {
      testCaseId: proposal.testCaseId,
    });
    return {
      kind: 'none',
      reason: `verdict=${proposal.verdict}; not opening PR`,
    };
  }

  const baseBranch = target.baseBranch ?? DEFAULT_BASE_BRANCH;
  const branchName = `ai-heal/${target.releaseId}/${proposal.testCaseId}`;

  log.info('pr', `${proposal.testCaseId}: creating branch`, {
    baseBranch,
    branchName,
  });
  await github.createBranchFromBase({
    owner: target.owner,
    repo: target.repo,
    baseBranch,
    newBranch: branchName,
  });

  const filesToCommit = proposal.fileChanges
    .filter((c) => c.action !== 'delete' && c.contents)
    .map((c) => ({ path: c.path, contents: c.contents! }));
  log.info('pr', `${proposal.testCaseId}: committing files`, {
    branch: branchName,
    files: filesToCommit.map((f) => f.path),
  });
  await github.commitFilesToBranch({
    owner: target.owner,
    repo: target.repo,
    branch: branchName,
    files: filesToCommit,
    message: `fix(ai-heal): ${proposal.testCaseId} ${proposal.rootCauseCategory}`,
  });

  log.info('pr', `${proposal.testCaseId}: opening draft PR`, {
    head: branchName,
    base: baseBranch,
    labels,
  });
  const pr = await github.openDraftPr({
    owner: target.owner,
    repo: target.repo,
    head: branchName,
    base: baseBranch,
    title: `[AI-Heal] ${proposal.testCaseId}: ${proposal.rootCauseCategory}`,
    body: buildBody(proposal),
    labels,
  });

  if (target.reviewers?.length || target.teamReviewers?.length) {
    try {
      await github.requestReview({
        owner: target.owner,
        repo: target.repo,
        prNumber: pr.number,
        reviewers: target.reviewers,
        teamReviewers: target.teamReviewers,
      });
      log.info('pr', `${proposal.testCaseId}: review requested`, {
        reviewers: target.reviewers ?? [],
        teamReviewers: target.teamReviewers ?? [],
      });
    } catch (err) {
      log.warn('pr', `${proposal.testCaseId}: review request failed (continuing)`, {
        error: (err as Error).message,
      });
    }
  }

  log.decision('pr', `draft PR #${pr.number} opened`, pr.url, {
    testCaseId: proposal.testCaseId,
  });
  return { kind: 'pr', number: pr.number, url: pr.url, branch: branchName };
};

export interface PropagateOptions {
  owner: string;
  repo: string;
  /** The leader's PR branch — the propagated fix is committed on top of it. */
  branch: string;
  /** The leader's PR, so the propagation is announced where a human is already reviewing. */
  prNumber: number;
  leaderTestCaseId: string;
}

/**
 * Commits a duplicate's verified fix onto the leader's existing PR branch.
 *
 * Deliberately NOT a second PR: a regression's duplicates share one root cause,
 * so 20 single-line PRs for one bad card BIN is review noise. The leader's PR
 * already carries the root cause and its own verify evidence; each propagated
 * case adds one commit naming its own verify result.
 */
export const submitPropagatedFix = async (
  proposal: VerifiedProposal,
  opts: PropagateOptions
): Promise<string[]> => {
  if (proposal.verdict !== 'ready-to-pr') {
    throw new Error(
      `${proposal.testCaseId}: refusing to propagate a fix with verdict=${proposal.verdict}`
    );
  }
  const filesToCommit = proposal.fileChanges
    .filter((c) => c.action !== 'delete' && c.contents)
    .map((c) => ({ path: c.path, contents: c.contents! }));
  if (filesToCommit.length === 0) {
    throw new Error(`${proposal.testCaseId}: no files to propagate`);
  }

  await github.commitFilesToBranch({
    owner: opts.owner,
    repo: opts.repo,
    branch: opts.branch,
    files: filesToCommit,
    message:
      `fix(ai-heal): ${proposal.testCaseId} ${proposal.rootCauseCategory} ` +
      `(same root cause as ${opts.leaderTestCaseId})`,
  });

  log.decision(
    'pr',
    `propagated to PR #${opts.prNumber}`,
    `${proposal.passedCount}/${proposal.reruns.length} passed in re-run`,
    { testCaseId: proposal.testCaseId, branch: opts.branch }
  );
  return filesToCommit.map((f) => f.path);
};

export interface PropagationSummaryEntry {
  testCaseId: string;
  paths: string[];
  passedCount: number;
  totalReruns: number;
}

/** One comment on the leader's PR listing what else was fixed on this branch, and what was left out. */
export const commentPropagationSummary = async (
  opts: Omit<PropagateOptions, 'branch'> & {
    propagated: PropagationSummaryEntry[];
    skipped: { testCaseId: string; reason: string }[];
  }
): Promise<void> => {
  if (opts.propagated.length === 0 && opts.skipped.length === 0) return;

  const lines = [
    `### Propagated to the other test cases with this root cause`,
    '',
    `Leader: \`${opts.leaderTestCaseId}\`. Every case below was fixed and re-run on its own before being committed here.`,
    '',
  ];
  if (opts.propagated.length) {
    lines.push('| Test case | Files | Re-run |', '| --- | --- | --- |');
    for (const e of opts.propagated) {
      lines.push(
        `| \`${e.testCaseId}\` | ${e.paths.map((p) => `\`${p}\``).join(', ')} | ${e.passedCount}/${e.totalReruns} passed |`
      );
    }
    lines.push('');
  }
  if (opts.skipped.length) {
    lines.push('Not propagated (needs a human):', '');
    for (const s of opts.skipped) lines.push(`- \`${s.testCaseId}\` — ${s.reason}`);
    lines.push('');
  }

  try {
    await github.commentPr({
      owner: opts.owner,
      repo: opts.repo,
      prNumber: opts.prNumber,
      body: lines.join('\n'),
    });
  } catch (err) {
    // The commits are already on the branch; losing the summary comment must
    // not fail the run.
    log.warn('pr', `${opts.leaderTestCaseId}: propagation summary comment failed`, {
      error: (err as Error).message,
    });
  }
};
