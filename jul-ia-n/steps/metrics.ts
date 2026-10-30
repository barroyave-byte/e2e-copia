/**
 * The four-tier %-resolved breakdown presented to the CEO/CTO (see the
 * market-research artifact from this round): a single "% resolved" number is
 * meaningless without the other three tiers, because it invites the wrong
 * follow-up question. Computed here from the same telemetry every run
 * already produces — this is a reporting layer, not a new data source.
 *
 * Tiers (leaders only — duplicates inherit their leader's disposition and
 * would double-count the same root cause):
 *   1. resolved       — prResult ∈ {pr, issue, known-issue}: a PR opened and
 *      verified, an issue correctly routed with real root cause, or a match
 *      against a closed prior case.
 *   2. assisted        — prResult='none', but a real, verified attempt was
 *      made and failed (verdict='needs-human', i.e. a diff was proposed and
 *      re-run failed) or cardFixer tried one or more pooled cards
 *      (cardAttempts.length > 0). Not resolved, but not a blank stack trace.
 *      verdict='verify-error' never counts here: the fix was never executed,
 *      so no real attempt was made.
 *   3. escalated        — prResult starts with 'skipped-low-confidence': the
 *      confidence gate did its job, no guess was made.
 *   4. classifiedOnly   — everything else among leaders: category and
 *      evidence exist (classify + enrich always run), no actionable signal
 *      reached the confidence/verification bar. Includes the rare
 *      operational skips (budget/PR cap, dry-run) — they got at least a
 *      classification pass too.
 */

export interface ResolutionMetricsCase {
  prResult: string;
  isDuplicate: boolean;
  verdict: string | null;
  /** Optional/possibly-absent on purpose: older telemetry/runs/*.json files predate this field. */
  cardAttempts?: unknown[];
}

export interface ResolutionMetrics {
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

const RESOLVED_RESULTS = new Set(['pr', 'issue', 'known-issue']);

export const computeResolutionMetrics = (cases: ResolutionMetricsCase[]): ResolutionMetrics => {
  const leaders = cases.filter((c) => !c.isDuplicate);
  const totalLeaders = leaders.length;

  let resolved = 0;
  let assisted = 0;
  let escalated = 0;
  for (const c of leaders) {
    if (RESOLVED_RESULTS.has(c.prResult)) {
      resolved++;
    } else if (c.prResult.startsWith('skipped-low-confidence')) {
      escalated++;
    } else if (
      c.prResult === 'none' &&
      c.verdict !== 'verify-error' &&
      (c.verdict === 'needs-human' || (c.cardAttempts?.length ?? 0) > 0)
    ) {
      assisted++;
    }
  }
  const classifiedOnly = totalLeaders - resolved - assisted - escalated;

  const pct = (n: number): number =>
    totalLeaders > 0 ? Number(((n / totalLeaders) * 100).toFixed(1)) : 0;

  return {
    totalLeaders,
    resolved,
    assisted,
    escalated,
    classifiedOnly,
    resolvedPct: pct(resolved),
    assistedPct: pct(assisted),
    escalatedPct: pct(escalated),
    classifiedOnlyPct: pct(classifiedOnly),
  };
};

/** One-line, human-readable rendering for console/log output. */
export const formatResolutionMetrics = (m: ResolutionMetrics): string =>
  `${m.totalLeaders} unique causes — resolved ${m.resolved} (${m.resolvedPct}%), ` +
  `assisted ${m.assisted} (${m.assistedPct}%), escalated ${m.escalated} (${m.escalatedPct}%), ` +
  `classified-only ${m.classifiedOnly} (${m.classifiedOnlyPct}%)`;
