import { FileChange } from '../schemas/proposal';

// Shared with agents/subagents/index.ts (final enforceKindRules gate) AND
// tools/subagentTools.ts (defense-in-depth inside the run_test tool, so an
// agent can't write outside the allowlist even during a mid-loop check,
// before its output ever reaches enforceKindRules). One copy on purpose —
// two independently-maintained allowlists is how they'd quietly drift.
export const ALLOWED_PATH_PREFIXES = [
  'playwright/tests/',
  'playwright/pages/',
  'playwright/support/interfaces/',
];

export const DENIED_PATH_PREFIXES = [
  'playwright.config.ts',
  'playwright/support/fixtures/',
  'playwright/support/http/',
  'jul-ia-n/',
  '.github/',
];

export const validateFileChanges = (
  name: string,
  changes: FileChange[],
): { ok: boolean; reason?: string } => {
  for (const ch of changes) {
    if (DENIED_PATH_PREFIXES.some((p) => ch.path.startsWith(p))) {
      return { ok: false, reason: `${name} attempted denied path: ${ch.path}` };
    }
    if (!ALLOWED_PATH_PREFIXES.some((p) => ch.path.startsWith(p))) {
      return {
        ok: false,
        reason: `${name} path not in allowlist: ${ch.path}`,
      };
    }
    if ((ch.action === 'create' || ch.action === 'update') && !ch.contents) {
      return {
        ok: false,
        reason: `${name} ${ch.action} on ${ch.path} missing 'contents'`,
      };
    }
  }
  return { ok: true };
};
