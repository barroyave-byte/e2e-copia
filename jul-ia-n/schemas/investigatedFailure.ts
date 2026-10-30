import { z } from 'zod';
import { EnrichedFailureSchema } from './enrichedFailure';

export const CloudWatchEventSchema = z.object({
  timestampMs: z.number(),
  logGroup: z.string(),
  logStream: z.string().nullable(),
  message: z.string(),
});
export type CloudWatchEvent = z.infer<typeof CloudWatchEventSchema>;

export const BugLocationSchema = z.enum(['e2e', 'service', 'unknown']);
export type BugLocation = z.infer<typeof BugLocationSchema>;

export const InvestigatedFailureSchema = EnrichedFailureSchema.extend({
  cloudWatchLogs: z.array(CloudWatchEventSchema),
  suspectedRepo: z.string().nullable(),
  suspectedFiles: z.array(z.string()),
  bugLocation: BugLocationSchema,
});
export type InvestigatedFailure = z.infer<typeof InvestigatedFailureSchema>;
