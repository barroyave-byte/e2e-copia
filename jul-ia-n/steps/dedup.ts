import { ClassifiedFailure } from '../schemas/classifiedFailure';

export interface DedupGroup {
  signatureKey: string;
  leaderId: string;
  duplicateIds: string[];
  size: number;
}

export interface DedupResult {
  groups: DedupGroup[];
  /** Map from any duplicate testCaseId to its leader testCaseId. Leaders are NOT in this map. */
  duplicateToLeader: Map<string, string>;
  /** Map from leader testCaseId to its group (size, signatureKey, etc). */
  leaderToGroup: Map<string, DedupGroup>;
  totalCases: number;
  totalLeaders: number;
  totalDuplicates: number;
}

/**
 * Deterministic normalization layer (the "B" guard) applied on top of the
 * LLM-emitted signatureKey. The LLM is instructed to already exclude test-specific
 * volatiles, but this canonicalizes formatting variance and strips the volatile
 * tokens most likely to leak through, WITHOUT destroying meaningful error codes
 * (e.g. "dp-4500" survives; "3-month" does not).
 */
const normalizeKey = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/\[object object\]/g, '') // leftover stringified error objects
    .replace(/\b\d+\s*-?\s*(months?|mes(?:es)?)\b/g, '') // installment counts: "3 meses", "6-month"
    .replace(/([a-z])[-_ ]+(\d)/g, '$1$2') // canonicalize code boundaries: "dp-4500" -> "dp4500"
    .replace(/(\d)[-_ ]+([a-z])/g, '$1$2') // ...and "http 422" -> "http422"
    .replace(/[^a-z0-9]+/g, '-') // collapse any remaining separator run to a single hyphen
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();

/**
 * The grouping signature for a failure: the LLM-emitted `signatureKey` when
 * present, falling back to `rootCause` for backward-compat with reports
 * classified before signatureKey existed.
 */
const signatureOf = (f: ClassifiedFailure): string =>
  normalizeKey(f.signatureKey?.trim() || f.rootCause);

/**
 * Group failures by their stable `signatureKey` (normalized). Within each group,
 * the lexicographically-smallest testCaseId is the "leader"; the rest are
 * "duplicates" that share the leader's heal pipeline result — so only leaders pay
 * the LLM/pipeline cost.
 */
export const groupBySignature = (
  failures: ClassifiedFailure[],
): DedupResult => {
  const buckets = new Map<string, ClassifiedFailure[]>();
  for (const f of failures) {
    const key = signatureOf(f);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(f);
  }

  const groups: DedupGroup[] = [];
  const duplicateToLeader = new Map<string, string>();
  const leaderToGroup = new Map<string, DedupGroup>();

  for (const [signatureKey, members] of buckets) {
    const sortedIds = members
      .map((m) => m.testCaseId)
      .sort((a, b) => a.localeCompare(b));
    const leaderId = sortedIds[0];
    const duplicateIds = sortedIds.slice(1);
    const group: DedupGroup = {
      signatureKey,
      leaderId,
      duplicateIds,
      size: sortedIds.length,
    };
    groups.push(group);
    leaderToGroup.set(leaderId, group);
    for (const dup of duplicateIds) duplicateToLeader.set(dup, leaderId);
  }

  return {
    groups,
    duplicateToLeader,
    leaderToGroup,
    totalCases: failures.length,
    totalLeaders: groups.length,
    totalDuplicates: duplicateToLeader.size,
  };
};
