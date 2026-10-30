/**
 * Shared types and configuration for the PR Reviewer Agent.
 *
 * Severity contract:
 *  - 'error'   blocks the pull request (process exits 1). Reserved for deterministic
 *              AST/regex rules, so a blocking result is always reproducible.
 *  - 'warning' comments on the pull request without blocking it.
 *  - 'info'    advisory only. The highest severity the LLM pass may emit.
 */
export type Severity = 'error' | 'warning' | 'info';

export type Source = 'ast' | 'llm';

export interface Finding {
  ruleId: string;
  severity: Severity;
  file: string;
  /** 1-indexed line in the pull request HEAD. Must be part of the diff for GitHub to accept an inline comment on it. */
  line: number;
  title: string;
  /** Markdown body of the inline comment: what is wrong and how to fix it. */
  message: string;
  /** Literal replacement for the affected line. Rendered as a GitHub ```suggestion block. */
  suggestion?: string;
  /** Number of lines `suggestion` replaces. Defaults to 1. */
  suggestionSpan?: number;
  docs?: string;
  source: Source;
  /**
   * Exact identity of the finding across pushes, stamped by `identity.ts`
   * before rendering. Changes when the reported line changes, which is what
   * tells a real fix from a reworded one.
   */
  fingerprint?: string;
  /**
   * Identity of the comment thread this finding belongs to. Looser than
   * `fingerprint`, so a reviewer's conversation survives an edit that changes a
   * literal without fixing the violation.
   */
  threadKey?: string;
}

/**
 * Test framework a file belongs to.
 *
 * The repository runs two frameworks side by side while the DSL migration is in
 * progress, and each one has a different standard for where locators live. Rules
 * are therefore evaluated per framework rather than repository-wide.
 */
export type Framework = 'dsl' | 'legacy' | 'unknown';

export interface ChangedFile {
  path: string;
  /** Added lines, 1-indexed against HEAD. The only lines any rule may report on. */
  addedLines: Set<number>;
  /** Full file content at HEAD, so rules can parse a complete AST for context. */
  content: string;
  /**
   * Full file content at the base commit, for rules that must tell a rewrite
   * from a reformat. Absent for a file the pull request adds, and for a rename
   * whose path did not resolve at the base.
   */
  baseContent?: string;
  status: 'added' | 'modified' | 'renamed';
  framework: Framework;
}

/**
 * Determines which framework a file uses by inspecting its imports.
 *
 * `TestingFramework` or `@framework/*` marks the DSL; `@pages/*` marks the legacy
 * Page Object Model. Files importing both resolve to 'dsl' and are additionally
 * reported by the `mixed-framework` rule.
 */
export function detectFramework(content: string): Framework {
  const importBlock = content.slice(0, 4000);
  const usesDsl =
    /from\s+['"](@framework\/|playwright\/framework\/)/.test(importBlock) ||
    /\bTestingFramework\b/.test(content);
  const usesLegacy = /from\s+['"]@pages\//.test(importBlock);

  if (usesDsl) return 'dsl';
  if (usesLegacy) return 'legacy';
  return 'unknown';
}

/**
 * Severity applied to new spec files written against the legacy framework.
 *
 * Read from PR_AGENT_NEW_SPECS_REQUIRE_DSL ('error' | 'warning' | 'off'), and
 * defaults to 'warning' so the DSL migration can be tightened gradually instead
 * of blocking every team at once. Unrecognised values fall back to 'warning'.
 */
export function newSpecDslPolicy(): Severity | 'off' {
  const raw = (process.env.PR_AGENT_NEW_SPECS_REQUIRE_DSL ?? 'warning').toLowerCase();
  if (raw === 'error' || raw === 'warning' || raw === 'off') return raw as Severity | 'off';
  return 'warning';
}

export interface Rule {
  id: string;
  severity: Severity;
  docs?: string;
  /** Frameworks this rule applies to. Omit to run against every framework. */
  frameworks?: Framework[];
  /** Returns true when this rule should run against the given file. */
  appliesTo: (file: ChangedFile) => boolean;
  run: (file: ChangedFile, ctx: RuleContext) => Finding[];
}

export interface RuleContext {
  /** Every .spec.ts tracked in the repository, used to detect duplicate test case IDs. */
  allSpecFiles: string[];
  repoRoot: string;
}

export const DOCS = {
  // AGENTS.md, not the CLAUDE.md symlink: GitHub shows a symlink as the
  // path it points to, so a link to it lands on the text "AGENTS.md".
  dsl: 'AGENTS.md#testing',
  flaky: 'docs/flaky-test-patterns.md',
  tags: 'https://www.notion.so/deuna/Uso-de-tags-en-escenarios-13e74dd6a68780d0b2fbe161052cf2dc',
};

/** Matches a Zephyr test case ID tag such as `@PI-T629` or `@CHKOUT-T732`. */
export const TESTCASE_ID_RE = /@([A-Z][A-Z0-9]*\d*)-(T\d+)/;

/**
 * Matches anything shaped like a test case ID, including prefixes that are not
 * valid Zephyr project keys.
 *
 * A Jira project key cannot start with a digit, so a tag like `@3DS-T0001`
 * resolves to no Zephyr test case. It still needs to be recognised: reporting
 * "the spec declares no ID" against a file that visibly carries one reads as an
 * agent malfunction, and the author has no way to reach the real problem.
 */
export const TESTCASE_ID_LOOSE_RE = /@([A-Za-z0-9]+)-(T\d+)/;

/** Zephyr Scale project keys in use across the suite. */
export const ZEPHYR_PROJECT_KEYS = ['PI', 'ENTP1', 'PAYM', 'ADM', 'PF', 'PLAT', 'RECON', 'ECOM'];

/** Paths excluded from every rule: generated snapshots, examples, and the agent itself. */
export const IGNORED_PATH_RE = [
  /^playwright\/visual\/.*snapshots/,
  /\.example\.ts$/,
  /^scripts\/pr-review-agent\//,
  /node_modules/,
];

export function isIgnored(path: string): boolean {
  return IGNORED_PATH_RE.some((re) => re.test(path));
}

export function isSpec(path: string): boolean {
  return path.endsWith('.spec.ts') && !isIgnored(path);
}

/** True for Page Object classes of the legacy framework. */
export function isLegacyPageObject(path: string): boolean {
  return path.startsWith('playwright/pages/') && path.endsWith('.ts') && !isIgnored(path);
}

/** True for DSL plugins, which hold locators the way Page Objects do in the legacy framework. */
export function isDslPlugin(path: string): boolean {
  return (
    path.startsWith('playwright/framework/plugins/') && path.endsWith('.ts') && !isIgnored(path)
  );
}

/** True for any layer where declaring a locator is correct: Page Objects and DSL plugins. */
export function isLocatorLayer(path: string): boolean {
  return isLegacyPageObject(path) || isDslPlugin(path);
}

export function isAuditable(path: string): boolean {
  return !isIgnored(path) && path.endsWith('.ts') && path.startsWith('playwright/');
}
