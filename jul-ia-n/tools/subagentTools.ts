import { execFileSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { isAbsolute, relative, resolve } from 'path';

import { InvestigatedFailure } from '../schemas/investigatedFailure';
import { FileChange } from '../schemas/proposal';
import { AgentTool } from '../models/types';
import { validateFileChanges } from '../util/allowlist';
import { log } from '../util/log';
import * as cloudwatch from './cloudwatch';
import { callSreAgentTool } from './prodSreAgentClient';
import * as playwrightRunner from './playwrightRunner';

const READ_FILE_MAX_CHARS = 60_000;
const GREP_MAX_LINES = 200;
const GLOB_MAX_LINES = 200;
const GIT_TIMEOUT_MS = 15_000;
const GIT_MAX_BUFFER = 8 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Read-only repo tools (read_file, grep, glob) — used by *Fixer subagents so
// they can inspect the actual spec/page-object/helper before proposing a diff.
// All paths are resolved inside repoRoot; traversal outside is rejected.
// ---------------------------------------------------------------------------

const safeResolve = (repoRoot: string, p: string): string => {
  const abs = isAbsolute(p) ? p : resolve(repoRoot, p);
  const rel = relative(repoRoot, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`path "${p}" is outside the repo`);
  }
  if (rel.split('/').includes('node_modules')) {
    throw new Error(`path "${p}" is inside node_modules (not allowed)`);
  }
  return abs;
};

const runGit = (repoRoot: string, args: string[]): { stdout: string; status: number } => {
  try {
    const stdout = execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf-8',
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
    });
    return { stdout, status: 0 };
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    // git grep / ls-files exit 1 when there are simply no matches.
    if (typeof e.status === 'number') {
      return { stdout: e.stdout ?? '', status: e.status };
    }
    throw err;
  }
};

const capLines = (text: string, max: number): string => {
  const lines = text.split(/\r?\n/);
  if (lines.length <= max) return text.trimEnd();
  return lines.slice(0, max).join('\n') + `\n… [+${lines.length - max} more lines truncated]`;
};

const readFileTool = (repoRoot: string): AgentTool => ({
  name: 'read_file',
  description:
    'Read a UTF-8 text file from the e2e-testing repo, relative to the repo root (e.g. "playwright/tests/.../PI-T629.spec.ts"). Returns the file contents (truncated if very large).',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path: { type: 'string', description: 'Repo-relative file path.' },
    },
  },
  execute: async (args) => {
    const path = String(args.path ?? '').trim();
    if (!path) return '[read_file] missing "path".';
    const abs = safeResolve(repoRoot, path);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      return `[read_file] not found: ${path}`;
    }
    const raw = readFileSync(abs, 'utf-8');
    if (raw.length > READ_FILE_MAX_CHARS) {
      return `${raw.slice(0, READ_FILE_MAX_CHARS)}\n… [+${raw.length - READ_FILE_MAX_CHARS} chars truncated]`;
    }
    return raw;
  },
});

const grepTool = (repoRoot: string): AgentTool => ({
  name: 'grep',
  description:
    'Search tracked files in the e2e-testing repo for a string (git grep). Returns matching "path:line: content". Use to locate an assertion, a helper, how a value is built/parsed, or similar tests. Set regex=true to treat the pattern as an extended regex; optionally restrict with a pathspec glob.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['pattern'],
    properties: {
      pattern: { type: 'string', description: 'Text or regex to search for.' },
      regex: {
        type: 'boolean',
        description: 'If true, pattern is an extended regex (-E). Default false (fixed string).',
      },
      glob: {
        type: 'string',
        description: 'Optional pathspec to limit the search, e.g. "playwright/tests/**" or "*.ts".',
      },
    },
  },
  execute: async (args) => {
    const pattern = String(args.pattern ?? '').trim();
    if (!pattern) return '[grep] missing "pattern".';
    const flags = args.regex ? '-nE' : '-nF';
    const gitArgs = ['grep', flags, '-I', '--no-color', '-e', pattern];
    if (args.glob) gitArgs.push('--', String(args.glob));
    const { stdout, status } = runGit(repoRoot, gitArgs);
    if (status === 1 && !stdout.trim()) return `[grep] no matches for "${pattern}".`;
    if (!stdout.trim()) return `[grep] no output (status=${status}).`;
    return capLines(stdout, GREP_MAX_LINES);
  },
});

const globTool = (repoRoot: string): AgentTool => ({
  name: 'glob',
  description:
    'List tracked files in the e2e-testing repo matching a pathspec glob (git ls-files), e.g. "playwright/tests/PSP/payu/**" or "**/*PI-T629*". Use to discover spec files, page objects, helpers.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['pattern'],
    properties: {
      pattern: { type: 'string', description: 'Pathspec glob.' },
    },
  },
  execute: async (args) => {
    const pattern = String(args.pattern ?? '').trim();
    if (!pattern) return '[glob] missing "pattern".';
    const { stdout, status } = runGit(repoRoot, ['ls-files', '--', `:(glob)${pattern}`]);
    if (!stdout.trim()) return `[glob] no files match "${pattern}" (status=${status}).`;
    return capLines(stdout, GLOB_MAX_LINES);
  },
});

export const createRepoTools = (repoRoot: string = process.cwd()): AgentTool[] => [
  readFileTool(repoRoot),
  grepTool(repoRoot),
  globTool(repoRoot),
];

// ---------------------------------------------------------------------------
// run_test — lets assertFixer/testDataFixer check a candidate fix against the
// real, failing test in an isolated worktree BEFORE calling submit_proposal,
// instead of only finding out via steps/verify.ts after the fact. Mirrors the
// external retry loop cardFixer already has bolted onto heal.ts, but as an
// in-loop tool: the agent decides when to check and can read the failure
// output to inform its next attempt. Same allowlist as the final gate
// (util/allowlist.ts) is enforced here too, defense-in-depth — this tool can
// touch a throwaway worktree, but never outside playwright/tests|pages|support/interfaces.
// ---------------------------------------------------------------------------

const RUN_TEST_MAX_ERROR_CHARS = 3000;

export const createRunTestTool = (
  failure: InvestigatedFailure,
  subagentName: string
): AgentTool => ({
  name: 'run_test',
  description:
    `Apply a candidate fix to an isolated git worktree and run the real, currently-failing test ` +
    `(${failure.specFile ?? 'no specFile known'}) against it once. Returns PASS or FAIL with the ` +
    `test's own error output. Use this to check a SPECIFIC hypothesis before calling submit_proposal ` +
    `— do not guess whether a fix works, and do not use this to explore blindly: read the file(s) ` +
    `first, form one concrete candidate change, then check it here. Each call is a real worktree + ` +
    `browser test run, so it is slow (tens of seconds) — use it sparingly.`,
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['fileChanges'],
    properties: {
      fileChanges: {
        type: 'array',
        description:
          "Same shape as submit_proposal's fileChanges — the candidate you want to check.",
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['path', 'action'],
          properties: {
            path: { type: 'string', description: 'Repo-relative file path.' },
            action: { type: 'string', enum: ['create', 'update', 'delete'] },
            contents: {
              type: ['string', 'null'],
              description: 'Full file contents for create/update. Required unless action=delete.',
            },
          },
        },
      },
    },
  },
  execute: async (args) => {
    if (!failure.specFile) {
      return '[run_test] no specFile known for this failure — cannot run.';
    }
    const rawChanges = Array.isArray(args.fileChanges) ? args.fileChanges : [];
    if (rawChanges.length === 0) return '[run_test] missing "fileChanges".';

    const fileChanges = rawChanges as FileChange[];
    const validation = validateFileChanges(subagentName, fileChanges);
    if (!validation.ok) return `[run_test] rejected: ${validation.reason}`;

    try {
      const summary = await playwrightRunner.runIsolated({
        fileChanges,
        specFile: failure.specFile,
        testCaseId: failure.testCaseId,
        repeat: 1,
      });
      if (summary.total > 0 && summary.passed === summary.total) {
        return `PASS (${summary.passed}/${summary.total})`;
      }
      const errs = summary.errors.slice(0, 2).join('\n---\n').slice(0, RUN_TEST_MAX_ERROR_CHARS);
      return `FAIL (${summary.passed}/${summary.total} passed)\n${errs || '(no error message captured)'}`;
    } catch (err) {
      return `[run_test] error running test: ${(err as Error).message}`;
    }
  },
});

// ---------------------------------------------------------------------------
// Scoped CloudWatch tool — used by serviceInvestigator. Relocated from the old
// eager investigate() step. Scopes the query to the suspectedRepo's log group
// (via AI_HEAL_LOG_GROUPS_BY_REPO json, falling back to AI_HEAL_LOG_GROUPS) and
// the test's own time window + ids, so it is cheaper and more precise than the
// old all-groups sweep.
// ---------------------------------------------------------------------------

const TIME_WINDOW_PADDING_MS = 30 * 1000;
const FALLBACK_LOOKBACK_MS = 60 * 60 * 1000;
const CW_MAX_EVENTS = 50;

const computeTimeWindow = (f: InvestigatedFailure): { startTimeMs: number; endTimeMs: number } => {
  if (f.testStartTimeMs && f.testEndTimeMs) {
    return {
      startTimeMs: f.testStartTimeMs - TIME_WINDOW_PADDING_MS,
      endTimeMs: f.testEndTimeMs + TIME_WINDOW_PADDING_MS,
    };
  }
  const now = Date.now();
  return { startTimeMs: now - FALLBACK_LOOKBACK_MS, endTimeMs: now };
};

const defaultIds = (f: InvestigatedFailure): string[] => {
  const ids: string[] = [];
  if (f.orderId) ids.push(f.orderId);
  if (f.transactionId) ids.push(f.transactionId);
  ids.push(...f.xRequestIds.slice(0, 5));
  return Array.from(new Set(ids));
};

const parseRepoLogGroupMap = (): Record<string, string> => {
  const raw = process.env.AI_HEAL_LOG_GROUPS_BY_REPO;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    log.warn('cloudwatch', 'AI_HEAL_LOG_GROUPS_BY_REPO is not valid JSON; ignoring');
    return {};
  }
};

const fallbackLogGroups = (): string[] =>
  (process.env.AI_HEAL_LOG_GROUPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Resolve which log group(s) to query for the failure's suspectedRepo. */
export const resolveLogGroups = (suspectedRepo: string | null): string[] => {
  const map = parseRepoLogGroupMap();
  if (suspectedRepo) {
    // Allow "owner/repo" or bare "repo" keys.
    const bare = suspectedRepo.includes('/') ? suspectedRepo.split('/').pop()! : suspectedRepo;
    const hit = map[suspectedRepo] ?? map[bare];
    if (hit) return [hit];
  }
  return fallbackLogGroups();
};

export const createCloudWatchTool = (failure: InvestigatedFailure): AgentTool => ({
  name: 'query_cloudwatch',
  description:
    'Query service-internal CloudWatch logs for this failure, scoped to the suspectedRepo log group and the test time window. By default filters by the test\'s orderId/transactionId/xRequestIds; pass "ids" to override. Returns matching log events (handler errors, stacktraces).',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of ids/strings to filter by. Defaults to the failure ids.',
      },
    },
  },
  execute: async (args) => {
    const logGroups = resolveLogGroups(failure.suspectedRepo);
    if (logGroups.length === 0) {
      return '[query_cloudwatch] no log group configured (set AI_HEAL_LOG_GROUPS_BY_REPO or AI_HEAL_LOG_GROUPS).';
    }
    const idsArg = Array.isArray(args.ids)
      ? (args.ids as unknown[]).map(String).filter(Boolean)
      : [];
    const ids = idsArg.length > 0 ? idsArg : defaultIds(failure);
    if (ids.length === 0) {
      return '[query_cloudwatch] no orderId/transactionId/xRequestIds available to filter by; provide "ids".';
    }
    const { startTimeMs, endTimeMs } = computeTimeWindow(failure);
    const events = [];
    for (const logGroup of logGroups) {
      if (events.length >= CW_MAX_EVENTS) break;
      try {
        const found = await cloudwatch.queryLogsByIds(
          logGroup,
          ids,
          startTimeMs,
          endTimeMs,
          CW_MAX_EVENTS - events.length
        );
        events.push(...found);
      } catch (err) {
        return `[query_cloudwatch] error querying ${logGroup}: ${(err as Error).message}`;
      }
    }
    if (events.length === 0) {
      return `[query_cloudwatch] no events in ${logGroups.join(', ')} for ids [${ids.join(', ')}] within the test window.`;
    }
    return events
      .slice(0, CW_MAX_EVENTS)
      .map((e) => `[${e.logGroup}] ${e.message}`)
      .join('\n');
  },
});

// ---------------------------------------------------------------------------
// SRE Agent RCA tools — used by serviceInvestigator in place of
// query_cloudwatch above (no longer wired into any subagent, kept as a
// standalone module in case it's needed again). The deployed SRE Agent does real
// RCA (CloudWatch + Grafana/Tempo + trace evidence + hypothesis generation), not
// just a scoped log grep — see tools/prodSreAgentClient.ts for the transport
// (central LiteLLM company_ai MCP gateway, workload key) and
// sre-dev-portal/services/sre-agent/app/docs/TOOL_CATALOG.md for the tool
// contracts these wrap.
// ---------------------------------------------------------------------------

const scenarioEnvironment = (): string => process.env.AI_HEAL_ENVIRONMENT || 'staging';

const DEFAULT_SRE_REGION = 'us-east-2';

/**
 * `rca_session_run` requires accountAlias (or accountId) *together with*
 * environment for any scenario that will plan CloudWatch/log evidence — see
 * `validateRCASessionRuntimeTarget` in
 * sre-dev-portal/services/sre-agent/app/internal/tools/rca_session_run.go, which
 * also rejects a mismatch between the alias and what the scenario evidence
 * implies. The alias vocabulary is fixed by
 * sre-dev-portal/docs/MCP_AWS_ACCOUNT_CONTEXT.md: staging/dev application
 * traffic lives in `dev` (790714449507), not in `sre`.
 */
const scenarioAccountAlias = (): string => {
  const explicit = process.env.AI_HEAL_SRE_ACCOUNT_ALIAS;
  if (explicit) return explicit;
  const env = scenarioEnvironment().toLowerCase();
  if (env.startsWith('prod')) return 'prod';
  if (env.startsWith('compliance') || env === 'pci') return 'compliance';
  return 'dev';
};

const scenarioRegion = (): string => process.env.AI_HEAL_SRE_REGION || DEFAULT_SRE_REGION;

const isoOrNull = (ms: number | null): string | null => (ms ? new Date(ms).toISOString() : null);

/**
 * Canonical rca_session_run `scenario` object built from InvestigatedFailure —
 * see sre-dev-portal/services/sre-agent/app/internal/model/types.go (`Scenario`)
 * for the authoritative field shapes this mirrors.
 */
export const buildSreScenario = (failure: InvestigatedFailure): Record<string, unknown> => ({
  id: failure.testCaseId,
  title: failure.testDescription,
  environment: scenarioEnvironment(),
  timeWindow: {
    start: isoOrNull(failure.testStartTimeMs),
    end: isoOrNull(failure.testEndTimeMs),
  },
  symptoms: [failure.errorIdentified, failure.rootCause, failure.failedStep].filter(Boolean),
  services: failure.suspectedRepo ? [{ name: failure.suspectedRepo }] : [],
  telemetry: {
    logGroups: resolveLogGroups(failure.suspectedRepo),
    serviceNames: failure.suspectedRepo ? [failure.suspectedRepo] : [],
  },
  identifiers: {
    orderIds: failure.orderId ? [failure.orderId] : [],
    transactionIds: failure.transactionId ? [failure.transactionId] : [],
    requestIds: failure.xRequestIds,
    traceIds: [],
    orderTokens: [],
    urls: Array.from(new Set(failure.networkCalls.map((c) => c.url))).slice(0, 10),
  },
  testCases: [
    {
      id: failure.testCaseId,
      name: failure.testDescription,
      source: 'playwright',
      status: 'failed',
      error: failure.errorIdentified,
      observedAt: isoOrNull(failure.testEndTimeMs),
    },
  ],
});

/**
 * Optional inline evidence attached to rca_session_run so the MCP starts with
 * real log/error content instead of only identifiers to go search for.
 */
export const buildSreIncidentArtifacts = (
  failure: InvestigatedFailure
): { name: string; content: string }[] => {
  const artifacts: { name: string; content: string }[] = [];
  if (failure.httpLogsSnippet) {
    artifacts.push({ name: 'http-logs.txt', content: failure.httpLogsSnippet });
  }
  if (failure.stderrSnippet) {
    artifacts.push({ name: 'stderr.txt', content: failure.stderrSnippet });
  }
  return artifacts;
};

const rcaSessionRunTool = (failure: InvestigatedFailure): AgentTool => ({
  name: 'rca_session_run',
  description:
    'Start a new RCA session on the prod-sre-agent MCP server for this failure. The scenario (test ' +
    'id, environment, time window, symptoms, suspected service, order/transaction/request ids) is ' +
    'built automatically from the failure — you do not need to pass it. Returns a manifest with ' +
    'artifactPaths (server-local paths to the evidence packet, hypotheses, evidence plan, session ' +
    'state) and a summary. Call this first, exactly once.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      notes: {
        type: 'string',
        description: 'Optional extra context not captured by the auto-built scenario fields.',
      },
    },
  },
  execute: async (args) => {
    const scenario = buildSreScenario(failure);
    if (args.notes) {
      scenario.notes = String(args.notes);
    }
    return callSreAgentTool('rca_session_run', {
      scenario,
      environment: scenarioEnvironment(),
      accountAlias: scenarioAccountAlias(),
      region: scenarioRegion(),
      incidentArtifacts: buildSreIncidentArtifacts(failure),
    });
  },
});

/**
 * Diagnostic, not part of the happy path: `rca_session_run` auto-builds its own
 * scenario, so spending one of the agent's bounded iterations on capabilities is
 * usually waste. It earns its place when a call fails with a contract/profile
 * error — the capabilities payload names the active MCP profile, the product-safe
 * tools, and the policy roots, which is what distinguishes "our args are wrong"
 * from "our team is not granted this tool".
 */
const sreAgentCapabilitiesTool = (): AgentTool => ({
  name: 'sre_agent_capabilities',
  description:
    'Diagnostic only. Returns the SRE Agent MCP profile, the product-safe tool list, and policy ' +
    'roots. Do NOT call this to start an investigation — call rca_session_run directly. Use it only ' +
    'when a previous call failed with a contract, profile, or permission error and you need to know ' +
    'which tools this session is actually allowed to use.',
  inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  execute: async () => callSreAgentTool('sre_agent_capabilities', {}),
});

const rcaSessionInvestigateTool = (): AgentTool => ({
  name: 'rca_session_investigate',
  description:
    'Continuation-only: execute the next planned evidence action(s) from a prior rca_session_run ' +
    'manifest or evidence plan, then refresh the session artifacts. Pass sessionManifestPath and/or ' +
    'evidencePlanPath copied verbatim from a previous tool result. Use only after rca_session_run.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      sessionManifestPath: {
        type: 'string',
        description: 'rca-session-manifest.json path from a prior result.',
      },
      evidencePlanPath: {
        type: 'string',
        description: 'rca-evidence-plan.json path from a prior result.',
      },
      maxActions: {
        type: 'integer',
        description:
          'Max evidence actions to execute this call. Defaults to 1; pass 2-3 to conserve turns.',
      },
    },
  },
  execute: async (args) => {
    const callArgs: Record<string, unknown> = {};
    if (args.sessionManifestPath) callArgs.sessionManifestPath = String(args.sessionManifestPath);
    if (args.evidencePlanPath) callArgs.evidencePlanPath = String(args.evidencePlanPath);
    if (args.maxActions) callArgs.maxActions = Number(args.maxActions);
    if (!callArgs.sessionManifestPath && !callArgs.evidencePlanPath) {
      return (
        '[rca_session_investigate] missing sessionManifestPath or evidencePlanPath — call ' +
        'rca_session_run first and pass one of its artifactPaths.'
      );
    }
    return callSreAgentTool('rca_session_investigate', callArgs);
  },
});

const artifactReadTool = (): AgentTool => ({
  name: 'artifact_read',
  description:
    'Read a bounded, redacted excerpt of one server-local artifact path returned by rca_session_run ' +
    'or rca_session_investigate (e.g. the rcaHypothesesJSON or rcaEvidencePacketJSON path). Optionally ' +
    'filter lines with "query". This is how you actually read the RCA content — the run/investigate ' +
    'tools return paths, not full inline JSON.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        description: 'Server-local artifact path from a prior manifest/packet/plan.',
      },
      query: { type: 'string', description: 'Optional case-insensitive line filter.' },
    },
  },
  execute: async (args) => {
    const path = String(args.path ?? '').trim();
    if (!path) return '[artifact_read] missing "path".';
    const callArgs: Record<string, unknown> = { path };
    if (args.query) callArgs.query = String(args.query);
    return callSreAgentTool('artifact_read', callArgs);
  },
});

export const createProdSreAgentTools = (failure: InvestigatedFailure): AgentTool[] => [
  rcaSessionRunTool(failure),
  rcaSessionInvestigateTool(),
  artifactReadTool(),
  sreAgentCapabilitiesTool(),
];
