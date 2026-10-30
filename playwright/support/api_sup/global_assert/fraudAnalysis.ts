import { FraudAnalysis } from '@support/http/models/order';

/** Every field the platform documents on `order.fraud.analysis`. */
export const FRAUD_ANALYSIS_FIELDS = [
  'details',
  'fraud_decision',
  'processor',
  'processor_id',
  'processor_response',
  'risk_level',
  'score',
  'status',
  'type',
] as const;

export type FraudAnalysisField = (typeof FRAUD_ANALYSIS_FIELDS)[number];

/**
 * `processor_id` is not comparable across sources: the purchase response carries the real
 * connection id (e.g. 3 for Cybersource) while GET Order returns 0 for the same order.
 * Comparing it would fail for a reason unrelated to what the fraud specs cover.
 */
export const FIELDS_NOT_COMPARABLE_ACROSS_SOURCES: readonly FraudAnalysisField[] = ['processor_id'];

export interface FraudExpectation {
  /** Fraud engine that produced the analysis, e.g. "CYBERSOURCE". */
  processor?: string;
  riskLevel?: string;
  fraudDecision?: string;
  processorResponse?: string;
  /** Substring the `details` message must contain. */
  detailsContains?: string;
  /** Manual-review state, exposed as `order.fraud.status` (e.g. "in_review"). */
  fraudProcessStatus?: string;
  /**
   * Fields that must carry a non-empty value. Which ones are populated depends on the fraud
   * engine in play, so each spec declares its own set instead of assuming a global minimum.
   */
  populatedFields?: readonly FraudAnalysisField[];
}

export function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/** The comparable subset of an analysis, for a cross-source equality check. */
export function comparableAnalysis(
  analysis: FraudAnalysis,
  ignoredFields: readonly FraudAnalysisField[]
): Record<string, unknown> {
  return Object.fromEntries(
    FRAUD_ANALYSIS_FIELDS.filter((field) => !ignoredFields.includes(field)).map((field) => [
      field,
      analysis[field],
    ])
  );
}
