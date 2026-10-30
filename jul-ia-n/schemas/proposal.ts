import { z } from 'zod';
import { RootCauseCategorySchema } from './classifiedFailure';
import { InvestigatedFailureSchema } from './investigatedFailure';

export const SUBAGENT_NAMES = [
  'credentialsFixer',
  'rateLimitHandler',
  'testDataFixer',
  'payloadFixer',
  'cardFixer',
  'redirectInvestigator',
  'selectorFixer',
  'snapshotUpdater',
  'assertFixer',
  'infraMarker',
  'humanEscalator',
  'serviceInvestigator',
] as const;

export const SubagentNameSchema = z.enum(SUBAGENT_NAMES);
export type SubagentName = z.infer<typeof SubagentNameSchema>;

export const FileChangeSchema = z.object({
  path: z.string(),
  action: z.enum(['create', 'update', 'delete']),
  contents: z.string().nullable(),
  diff: z.string().nullable(),
});
export type FileChange = z.infer<typeof FileChangeSchema>;

export const ProposalKindSchema = z.enum(['diff', 'issue', 'enrichment_only']);
export type ProposalKind = z.infer<typeof ProposalKindSchema>;

export const ProposalSchema = InvestigatedFailureSchema.extend({
  subagent: SubagentNameSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  kind: ProposalKindSchema,
  fileChanges: z.array(FileChangeSchema),
  issueBody: z.string().nullable(),
  originalRootCauseCategory: RootCauseCategorySchema.nullable(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const OrchestratorDecisionSchema = z.object({
  subagent: SubagentNameSchema,
  bugLocation: z.enum(['e2e', 'service', 'unknown']),
  suspectedRepo: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  categoryOverride: RootCauseCategorySchema.nullable(),
});
export type OrchestratorDecision = z.infer<typeof OrchestratorDecisionSchema>;
