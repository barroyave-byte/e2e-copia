import { z } from 'zod';

export const ROOT_CAUSE_CATEGORIES = [
  'credentials',
  'psp_decline',
  'rate_limit',
  'invalid_payload',
  'invalid_test_data',
  'external_redirect',
  'ui_element_missing',
  'visual_regression',
  'assertion_mismatch',
  'infra',
  'unknown',
] as const;

export const TEAM_OWNERS = [
  'team_payment_integration',
  'team_payments_capabilities',
  'team_platform',
  'team_payconnect',
  'team_enterprise',
  'team_admin',
  'team_unknown',
] as const;

export const RootCauseCategorySchema = z.enum(ROOT_CAUSE_CATEGORIES);
export type RootCauseCategory = z.infer<typeof RootCauseCategorySchema>;

export const TeamOwnerSchema = z.enum(TEAM_OWNERS);
export type TeamOwner = z.infer<typeof TeamOwnerSchema>;

export const ClassifiedFailureSchema = z.object({
  testCaseId: z.string(),
  testDescription: z.string(),
  teamOwner: TeamOwnerSchema,
  errorIdentified: z.string(),
  rootCause: z.string(),
  // Stable, test-agnostic fingerprint of the error CLASS (e.g.
  // "transaction-visibility-logs-api-error"). Deliberately excludes
  // per-test details (installment count, order id, card brand) so that
  // failures sharing the same underlying bug collapse into one dedup group.
  // Optional for backward-compat: pre-signatureKey reports fall back to rootCause.
  signatureKey: z.string().optional(),
  rootCauseCategory: RootCauseCategorySchema,
  isCredentialIssue: z.boolean(),
  failedStep: z.string(),
});
export type ClassifiedFailure = z.infer<typeof ClassifiedFailureSchema>;

export const FailureAnalysisSchema = z.object({
  failures: z.array(ClassifiedFailureSchema),
});
export type FailureAnalysis = z.infer<typeof FailureAnalysisSchema>;
