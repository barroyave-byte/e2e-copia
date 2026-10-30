import { z } from 'zod';
import { ClassifiedFailureSchema } from './classifiedFailure';

export const NetworkCallSchema = z.object({
  url: z.string(),
  method: z.string(),
  status: z.number().nullable(),
  xRequestId: z.string().nullable(),
  responseSnippet: z.string().nullable(),
  durationMs: z.number().nullable(),
});
export type NetworkCall = z.infer<typeof NetworkCallSchema>;

export const ArtifactPathsSchema = z.object({
  trace: z.string().nullable(),
  errorContext: z.string().nullable(),
  screenshots: z.array(z.string()),
  video: z.string().nullable(),
});
export type ArtifactPaths = z.infer<typeof ArtifactPathsSchema>;

export const EnrichedFailureSchema = ClassifiedFailureSchema.extend({
  specFile: z.string().nullable(),
  specLine: z.number().nullable(),
  tags: z.array(z.string()),
  orderId: z.string().nullable(),
  transactionId: z.string().nullable(),
  xRequestIds: z.array(z.string()),
  networkCalls: z.array(NetworkCallSchema),
  domSnapshot: z.string().nullable(),
  /** Filtered, truncated [HTTP Request|Response|Response Error] blocks from stdout (errors + last 3). Null if stdout was empty. */
  httpLogsSnippet: z.string().nullable(),
  /** First 1000 chars of stderr. Null if stderr was empty. */
  stderrSnippet: z.string().nullable(),
  artifactPaths: ArtifactPathsSchema,
  testStartTimeMs: z.number().nullable(),
  testEndTimeMs: z.number().nullable(),
});
export type EnrichedFailure = z.infer<typeof EnrichedFailureSchema>;
