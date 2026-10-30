import { z } from 'zod';
import { ProposalSchema } from './proposal';

export const ReRunResultSchema = z.object({
  attempt: z.number(),
  passed: z.boolean(),
  durationMs: z.number(),
  errorMessage: z.string().nullable(),
});
export type ReRunResult = z.infer<typeof ReRunResultSchema>;

export const VerifyVerdictSchema = z.enum([
  'ready-to-pr',
  'needs-human',
  'skipped-no-diff',
  'skipped-cap-reached',
  // verify could not execute the test at all (no browser, collection error,
  // 0 results). The fix was NOT evaluated — distinct from needs-human, where
  // the test ran with the fix and did not pass.
  'verify-error',
]);
export type VerifyVerdict = z.infer<typeof VerifyVerdictSchema>;

export const VerifiedProposalSchema = ProposalSchema.extend({
  reruns: z.array(ReRunResultSchema),
  passedCount: z.number(),
  failedCount: z.number(),
  verdict: VerifyVerdictSchema,
  verifiedConfidence: z.number().min(0).max(1),
  /** Why the re-run could not execute (verdict='verify-error' only). */
  verifyError: z.string().nullable().default(null),
  /**
   * Fresh orderId/transactionId/xRequestIds extracted from the verify
   * re-run's OWN stdout (steps/verify.ts, only when at least one attempt
   * passed) — distinct from Proposal's orderId/transactionId/xRequestIds,
   * which are frozen at enrichment time from the ORIGINAL failing run and
   * never reflect whether the fix actually worked. Null/empty when no
   * attempt passed (nothing to point to) or none of the IDs could be found
   * in the passing attempt's console output.
   */
  verifyOrderId: z.string().nullable().default(null),
  verifyTransactionId: z.string().nullable().default(null),
  verifyXRequestIds: z.array(z.string()).default([]),
});
export type VerifiedProposal = z.infer<typeof VerifiedProposalSchema>;
