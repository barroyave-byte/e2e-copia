import { EnrichedFailure } from '../schemas/enrichedFailure';
import {
  InvestigatedFailure,
  InvestigatedFailureSchema,
} from '../schemas/investigatedFailure';
import { log } from '../util/log';

/**
 * Adapter EnrichedFailure -> InvestigatedFailure.
 *
 * CloudWatch is no longer fetched eagerly here. The orchestrator routes on the
 * trace-level evidence already present in the EnrichedFailure (network calls,
 * stdout HTTP logs, DOM). Service-internal CloudWatch logs are now pulled lazily
 * by serviceInvestigator via the scoped `query_cloudwatch` tool, using the
 * suspectedRepo the orchestrator decides. This step therefore only fills the
 * InvestigatedFailure fields with neutral defaults; suspectedRepo is set later
 * from the orchestrator decision (see heal.ts).
 */
export const investigateFailure = async (
  failure: EnrichedFailure,
): Promise<InvestigatedFailure> => {
  log.debug('investigate', `${failure.testCaseId}: adapter only (no eager cloudwatch)`, {
    category: failure.rootCauseCategory,
  });

  return InvestigatedFailureSchema.parse({
    ...failure,
    cloudWatchLogs: [],
    suspectedRepo: null,
    suspectedFiles: [],
    bugLocation: 'unknown',
  });
};

export const investigateFailures = async (
  failures: EnrichedFailure[],
): Promise<InvestigatedFailure[]> => Promise.all(failures.map(investigateFailure));
