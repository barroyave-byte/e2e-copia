/**
 * The "[AI-HEAL: <ref>]" marker ai-heal prefixes onto a row's Comments QA when
 * it dispositioned the failure on its own, without a human reviewing it this
 * release:
 *
 * - cross-release comparison (steps/compareReleases.ts): the same testCaseId
 *   failed the same way in the reviewed baseline, and its QA Review / Root
 *   cause QA / Comments QA were carried forward. <ref> is the baseline's
 *   release label, e.g. "[AI-HEAL: 41.2] ya reportado".
 * - 'known-issue' KB short-circuit (steps/csv.ts): <ref> is "KB <entry id>".
 *
 * sre-dev-portal's e2e-dashboard counts these rows for its "test cases with a
 * known bug identified by AI" panel and the Release Tracker's AI heal
 * coverage, by matching Comments QA against the literal prefix "[AI-HEAL:"
 * (store.aiHealPrefix there) — so the marker must stay the very first thing in
 * the cell, with no leading whitespace.
 */
export const AI_HEAL_PREFIX = '[AI-HEAL:';

// One or more leading markers. A reviewed baseline exported from the
// dashboard still carries the previous release's marker, and copying it
// forward must replace it rather than stack "[AI-HEAL: 41.2] [AI-HEAL: 41.1] …".
const LEADING_MARKERS = /^\s*(?:\[AI-HEAL:[^\]]*\]\s*)+/;

export const hasAiHealMarker = (comment: string | undefined | null): boolean =>
  (comment ?? '').startsWith(AI_HEAL_PREFIX);

/** Comments QA without any leading "[AI-HEAL: …]" marker(s). */
export const stripAiHealMarker = (comment: string | undefined | null): string =>
  (comment ?? '').replace(LEADING_MARKERS, '').trim();

/**
 * "[AI-HEAL: <ref>] <comment>", or just "[AI-HEAL: <ref>]" when there is no
 * comment to carry — the marker is written even then, otherwise the row is
 * invisible to the dashboard. Any marker the comment already had is replaced.
 */
export const withAiHealMarker = (ref: string, comment?: string | null): string => {
  // A ']' inside the ref would close the marker early.
  const safeRef = ref.replace(/[\[\]]/g, '').trim() || 'unknown';
  const body = stripAiHealMarker(comment);
  return body ? `${AI_HEAL_PREFIX} ${safeRef}] ${body}` : `${AI_HEAL_PREFIX} ${safeRef}]`;
};
