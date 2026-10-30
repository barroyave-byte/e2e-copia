import { z } from 'zod';
import { RootCauseCategorySchema } from './classifiedFailure';
import { FileChangeSchema, SubagentNameSchema } from './proposal';

/**
 * A curated knowledge-base entry: a known, previously-resolved failure pattern
 * and its resolution recipe. Authored manually (one JSON file per entry under
 * jul-ia-n/knowledge/database/) and reviewed by PR. Consulted at runtime (after
 * dedup) to advise the orchestrator/subagent with prior art — it never bypasses
 * the verify step.
 */
export const KnowledgeEntrySchema = z.object({
  /** Stable slug, also the filename. e.g. "nupay-purchase-poll-race-condition". */
  id: z.string(),
  title: z.string(),

  /**
   * Symptom-oriented text used for semantic matching (this is what gets
   * embedded). Describe the OBSERVABLE failure: error message, where it breaks,
   * the flow — NOT the fix. Keep it close to how a real failure reads.
   */
  symptom: z.string(),

  /** Optional structured hints. testCaseIds of tests known to hit this pattern. */
  testCaseIds: z.array(z.string()).default([]),
  rootCauseCategory: RootCauseCategorySchema.nullable().default(null),
  tags: z.array(z.string()).default([]),

  /**
   * The resolution as a human-readable RECIPE (a directive the agent applies
   * with judgement), not a literal diff. e.g. "Race condition: the test asserts
   * the purchase response before the poll settles — await the orders status
   * request and assert on its resolved body, don't race the network call."
   */
  recipe: z.string(),
  /** Subagent that usually handles this pattern (advisory for routing). */
  subagentHint: SubagentNameSchema.nullable().default(null),

  /**
   * OPTIONAL replayable patch for the highest short-circuit tier (skip both the
   * orchestrator AND the subagent, apply this directly, then verify). Only set
   * this for MECHANICAL, repo-stable fixes (e.g. add a @flaky tag / test.retry)
   * — NOT for fixes tied to specific line numbers that drift. Must contain full
   * file `contents`. Requires `subagentHint` to be set (used as the proposal's
   * subagent label). If null, the entry can still short-circuit routing (tier 2)
   * but the subagent still generates the fix.
   */
  replayableFix: z.array(FileChangeSchema).nullable().default(null),

  /**
   * OPTIONAL disposition for a KNOWN, recurring, non-actionable failure (e.g. a
   * PSP returning the same decline/error on every regression run, with no fix
   * possible on our side). When set, the short-circuit tier "known-issue"
   * writes these values directly into the release CSV (QA Review / Root cause
   * QA columns) and skips the orchestrator, subagent, AND verify entirely —
   * there is nothing to route, fix, or re-run. Mutually exclusive with
   * `replayableFix`: an entry is either a known non-actionable issue or a
   * replayable code fix, never both (invalid entries are skipped at load time).
   */
  knownExternalIssue: z
    .object({
      /** Written into the "QA Review" column, e.g. "OK". */
      csvStatus: z.string(),
      /** Written into the "Root cause QA" column, e.g. "External issue". */
      csvIssueType: z.string(),
    })
    .nullable()
    .default(null),

  /** Provenance: PR/commit links where this was resolved. */
  prRefs: z.array(z.string()).default([]),
  firstSeenRelease: z.string().nullable().default(null),
  lastConfirmedRelease: z.string().nullable().default(null),
  createdAt: z.string().nullable().default(null),

  /** Lifecycle: deprecated entries are loaded but never matched. */
  status: z.enum(['active', 'deprecated']).default('active'),
});
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;
