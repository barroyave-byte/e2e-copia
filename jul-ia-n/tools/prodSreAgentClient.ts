import axios, { AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';

import { pLimit } from '../util/concurrency';
import { log } from '../util/log';

// ---------------------------------------------------------------------------
// Transport for the SRE Agent's RCA tools, reached through the central LiteLLM
// `company_ai` MCP gateway (same role as tools/cloudwatch.ts for CloudWatch: raw
// transport only, no agent-facing tool shape — that lives in
// tools/subagentTools.ts).
//
// WHY THE GATEWAY AND NOT THE SRE AGENT DIRECTLY: the direct
// `https://dev-portal.deuna.io/sre-agent/mcp` endpoint this file used to call is
// deprecated for clients (sre-dev-portal/services/sre-agent/README.md: "Direct
// employee client configuration is deprecated. LiteLLM calls this upstream with
// audience-scoped delegated identity"), and the shape we used to authenticate
// with — a per-user Google OAuth ID token minted by a workstation helper — is on
// the explicit "must not be restored" list in
// sre-dev-portal/docs/DEUNA_AI_ARCHITECTURE.md ("Unsupported legacy patterns",
// which names `SRE_AGENT_MCP_TOKEN` by name). The one supported path is the
// gateway at https://dev-portal.deuna.io/litellm/company_ai/mcp, which resolves
// identity/policy and mints a short-lived audience-bound delegation JWT for the
// upstream.
//
// AUTH: ai-heal is a non-human workload, so it authenticates the way the other
// approved workload does — a dedicated LiteLLM team with narrow MCP grants and
// an MCP-only virtual key kept in the secret store, never an employee
// credential. Reference implementation for this exact call contract:
// sre-dev-portal/services/aws-devops-agent-repograph-edge/internal/edge/handler.go
// (bearer virtual key, `Accept: application/json, text/event-stream`,
// `X-Request-ID`, propagated `mcp-session-id`, and server-alias-prefixed tool
// names). This client fails loudly when the key is missing or rejected; it never
// attempts an interactive OAuth flow and never falls back to a direct upstream
// URL.
//
// TRANSPORT NOTE: the gateway is a streamable-HTTP MCP endpoint with session
// semantics, not a bare JSON-RPC POST endpoint — it needs an `initialize`
// handshake, echoes an `mcp-session-id` that later calls must carry, and may
// answer either `application/json` or `text/event-stream`. All of that is
// handled here by hand rather than by pulling in `@modelcontextprotocol/sdk`,
// deliberately: this repo's dependency tree is shared with the whole Playwright
// suite and its ECR image build, and a new runtime dep there has broken CI
// before. If this client grows past the small surface below, revisit that call.
// ---------------------------------------------------------------------------

const DEFAULT_GATEWAY_URL = 'https://dev-portal.deuna.io/litellm/company_ai/mcp';
const DEFAULT_SERVER_ALIAS = 'prod_sre_agent';
const MCP_PROTOCOL_VERSION = '2025-06-18';
const CLIENT_NAME = 'ai-heal-serviceInvestigator';

const RESULT_MAX_CHARS = 20_000;
const DEFAULT_TIMEOUT_MS = 180_000;
const MAX_RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 2_000;

/**
 * Deliberately small: the SRE Agent MCP server registry bounds in-flight
 * requests per worker (8) and opens a per-worker circuit after three
 * consecutive upstream transport/5xx failures, and our team carries its own
 * `mcp_rpm_limit.prod_sre_agent`. Keeping ai-heal's own fan-out low is cheaper
 * than discovering those limits as 429s and tripped circuits — heal.ts already
 * runs up to AI_HEAL_CONCURRENCY leaders at once, each of which may hold an
 * agent loop.
 */
const SRE_AGENT_CONCURRENCY = Number(process.env.AI_HEAL_SRE_AGENT_CONCURRENCY || 2);

const gatewayLimit = pLimit(SRE_AGENT_CONCURRENCY);

let _requestId = 0;
const nextRequestId = (): number => ++_requestId;

interface JsonRpcContentBlock {
  type: string;
  text?: string;
}

interface JsonRpcToolCallResult {
  content?: JsonRpcContentBlock[];
  structuredContent?: unknown;
  isError?: boolean;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string | null;
  result?: JsonRpcToolCallResult & Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

interface McpSession {
  sessionId: string | null;
  protocolVersion: string;
}

const NO_KEY_HINT =
  'AI_HEAL_LITELLM_MCP_KEY is not set. serviceInvestigator reaches the SRE Agent only through the ' +
  'central LiteLLM company_ai MCP gateway, authenticated with the MCP-only virtual key issued to ' +
  "ai-heal's LiteLLM workload team (see jul-ia-n/docs/sre-agent-workload-access-request.md). Direct " +
  'SRE Agent URLs and per-user OAuth tokens are not a supported fallback.';

const FORBIDDEN_HINT =
  "The workload key was rejected. Either it is revoked/rotated, or ai-heal's LiteLLM team does not " +
  'grant this tool: rca_session_run / rca_session_investigate / artifact_read are ai-operator-tier ' +
  'with `operator_entitlement` in sre-dev-portal/services/litellm/policy/mcp-tools.staging.json. ' +
  'Confirm the grant with the SRE/AI Platform policy owner rather than widening it locally.';

const gatewayUrl = (): string => process.env.AI_HEAL_LITELLM_MCP_URL || DEFAULT_GATEWAY_URL;

const serverAlias = (): string => process.env.AI_HEAL_SRE_AGENT_MCP_SERVER || DEFAULT_SERVER_ALIAS;

const timeoutMs = (): number =>
  Number(process.env.AI_HEAL_SRE_AGENT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

const requireKey = (): string => {
  const key = process.env.AI_HEAL_LITELLM_MCP_KEY;
  if (!key) throw new Error(NO_KEY_HINT);
  return key;
};

const capResult = (text: string): string => {
  if (text.length <= RESULT_MAX_CHARS) return text;
  return `${text.slice(0, RESULT_MAX_CHARS)}\n… [+${text.length - RESULT_MAX_CHARS} chars truncated]`;
};

const extractResultText = (result: JsonRpcToolCallResult): string => {
  if (result.structuredContent !== undefined) {
    return JSON.stringify(result.structuredContent);
  }
  if (result.content && result.content.length > 0) {
    return result.content
      .map((c) => c.text ?? '')
      .filter(Boolean)
      .join('\n');
  }
  return '';
};

const headerValue = (response: AxiosResponse, name: string): string | undefined => {
  const raw = response.headers?.[name] ?? response.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === 'string' ? raw : undefined;
};

/**
 * The gateway answers either `application/json` or `text/event-stream` for the
 * same request. For SSE, the JSON-RPC message we want is the last `data:` frame
 * that actually carries a `result` or `error` (earlier frames can be progress
 * notifications, which have no `id`).
 */
const parseJsonRpcBody = (body: string, contentType: string): JsonRpcResponse | null => {
  const text = body?.trim();
  if (!text) return null;

  if (!contentType.includes('text/event-stream')) {
    return JSON.parse(text) as JsonRpcResponse;
  }

  let last: JsonRpcResponse | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice('data:'.length).trim();
    if (!payload || payload === '[DONE]') continue;
    let message: JsonRpcResponse;
    try {
      message = JSON.parse(payload) as JsonRpcResponse;
    } catch {
      continue;
    }
    if (message.result !== undefined || message.error !== undefined) last = message;
  }
  return last;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface PostOptions {
  session: McpSession | null;
  requestId: string;
  /** `notifications/*` have no JSON-RPC id and get a 202 with an empty body. */
  isNotification?: boolean;
}

const postToGateway = async (
  payload: Record<string, unknown>,
  { session, requestId, isNotification }: PostOptions
): Promise<{ response: AxiosResponse<string>; message: JsonRpcResponse | null }> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireKey()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'X-Request-ID': requestId,
  };
  if (session?.sessionId) headers['mcp-session-id'] = session.sessionId;
  if (session?.protocolVersion) headers['mcp-protocol-version'] = session.protocolVersion;

  let response: AxiosResponse<string>;
  try {
    response = await axios.post<string>(gatewayUrl(), payload, {
      headers,
      timeout: timeoutMs(),
      responseType: 'text',
      transformResponse: [(data: string) => data],
      validateStatus: () => true,
    });
  } catch (err) {
    throw new Error(
      `[sre-agent/company_ai] transport error (${payload.method}): ${(err as Error).message}`
    );
  }

  if (isNotification) return { response, message: null };

  const contentType = headerValue(response, 'content-type') || '';
  let message: JsonRpcResponse | null = null;
  if (response.status < 400) {
    try {
      message = parseJsonRpcBody(response.data ?? '', contentType);
    } catch (err) {
      throw new Error(
        `[sre-agent/company_ai] could not parse ${payload.method} response (${contentType}): ${(err as Error).message}`
      );
    }
  }
  return { response, message };
};

/**
 * Turns a non-2xx gateway response into an actionable error. Note this never
 * mentions a *missing* key: `requireKey()` runs before any request is built, so
 * by the time a status can come back the key exists and a 401/403 means it was
 * rejected — either revoked/rotated, or the team lacks the grant.
 */
const gatewayStatusError = (response: AxiosResponse<string>, method: string): Error => {
  const body = (response.data ?? '').slice(0, 500);
  if (response.status === 401 || response.status === 403) {
    return new Error(
      `[sre-agent/company_ai] HTTP ${response.status} on ${method}. ${FORBIDDEN_HINT} Response: ${body}`
    );
  }
  return new Error(`[sre-agent/company_ai] HTTP ${response.status} on ${method}: ${body}`);
};

let sessionPromise: Promise<McpSession> | null = null;

const openSession = async (): Promise<McpSession> => {
  const requestId = randomUUID();
  const { response, message } = await postToGateway(
    {
      jsonrpc: '2.0',
      id: nextRequestId(),
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: CLIENT_NAME, version: '1.0.0' },
      },
    },
    { session: null, requestId }
  );

  if (response.status >= 400) throw gatewayStatusError(response, 'initialize');
  if (message?.error) {
    throw new Error(
      `[sre-agent/company_ai] initialize returned JSON-RPC error ${message.error.code}: ${message.error.message}`
    );
  }

  const negotiated =
    (message?.result?.protocolVersion as string | undefined) || MCP_PROTOCOL_VERSION;
  const session: McpSession = {
    sessionId: headerValue(response, 'mcp-session-id') ?? null,
    protocolVersion: negotiated,
  };

  // Per the MCP lifecycle the client must confirm initialization before issuing
  // requests. Best-effort: a gateway that does not need it answers 202/404 and
  // the following tools/call still works, so a failure here is logged, not fatal.
  try {
    await postToGateway(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { session, requestId: randomUUID(), isNotification: true }
    );
  } catch (err) {
    log.warn('sre-agent', `notifications/initialized failed: ${(err as Error).message}`);
  }

  log.info('sre-agent', 'MCP session initialized', {
    url: gatewayUrl(),
    server: serverAlias(),
    protocolVersion: session.protocolVersion,
    hasSessionId: Boolean(session.sessionId),
  });
  return session;
};

const ensureSession = (): Promise<McpSession> => {
  if (!sessionPromise) {
    sessionPromise = openSession().catch((err) => {
      // Don't cache a failed handshake — the next call should retry it.
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
};

export interface McpToolDescriptor {
  name: string;
  description?: string;
}

/**
 * `tools/list` through the gateway, narrowed to this upstream's namespace and
 * with the `<alias>-` prefix stripped. Used by the preflight
 * (`npm run ai-heal:sre-preflight`) to check which SRE Agent tools this workload
 * key can actually see — the pipeline itself never needs to enumerate tools.
 *
 * Caveat worth knowing before trusting the output: whether the gateway filters
 * this list per team or returns the server's full registry is not documented, so
 * a tool appearing here is not proof the team may *call* it. Only a real
 * `tools/call` proves the grant.
 */
export const listSreAgentTools = async (): Promise<McpToolDescriptor[]> =>
  gatewayLimit(async () => {
    requireKey();
    const session = await ensureSession();
    const { response, message } = await postToGateway(
      { jsonrpc: '2.0', id: nextRequestId(), method: 'tools/list', params: {} },
      { session, requestId: randomUUID() }
    );

    if (response.status >= 400) throw gatewayStatusError(response, 'tools/list');
    if (message?.error) {
      throw new Error(
        `[sre-agent/company_ai] tools/list returned JSON-RPC error ${message.error.code}: ${message.error.message}`
      );
    }

    const raw = (message?.result?.tools as McpToolDescriptor[] | undefined) ?? [];
    const prefix = `${serverAlias()}-`;
    return raw
      .filter((t) => typeof t?.name === 'string' && t.name.startsWith(prefix))
      .map((t) => ({ name: t.name.slice(prefix.length), description: t.description }));
  });

/** Exposed for tests/bench so a stale session doesn't leak across fixtures. */
export const resetSreAgentSession = (): void => {
  sessionPromise = null;
};

const callOnce = async (
  name: string,
  args: Record<string, unknown>,
  session: McpSession
): Promise<{ response: AxiosResponse<string>; message: JsonRpcResponse | null }> =>
  postToGateway(
    {
      jsonrpc: '2.0',
      id: nextRequestId(),
      // Through the gateway, tools are namespaced by server alias — the upstream
      // name `rca_session_run` is exposed as `prod_sre_agent-rca_session_run`.
      method: 'tools/call',
      params: { name: `${serverAlias()}-${name}`, arguments: args },
    },
    { session, requestId: randomUUID() }
  );

/**
 * Call one SRE Agent tool through the LiteLLM company_ai gateway. Returns the
 * tool's text/structured result, capped and truncated. Throws with an
 * actionable message on missing/rejected credential, transport failure, or a
 * JSON-RPC/tool-level error.
 *
 * Retry policy is deliberately narrow: only conditions that prove the call was
 * *rejected before dispatch* are retried (429 rate limit, expired MCP session).
 * A 5xx or timeout is not retried — `rca_session_run` is not in the gateway's
 * `retryable_tools` allowlist, so a replay could start a second RCA session for
 * the same failure.
 */
export const callSreAgentTool = async (
  name: string,
  args: Record<string, unknown>
): Promise<string> =>
  gatewayLimit(async () => {
    requireKey();
    log.info('sre-agent', `calling ${name}`, {
      server: serverAlias(),
      args: Object.keys(args),
    });

    let rateLimitAttempts = 0;
    let sessionRetried = false;

    for (;;) {
      const session = await ensureSession();
      const { response, message } = await callOnce(name, args, session);

      if (response.status === 429 && rateLimitAttempts < MAX_RATE_LIMIT_RETRIES) {
        rateLimitAttempts++;
        const retryAfter = Number(headerValue(response, 'retry-after'));
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1_000
            : RATE_LIMIT_BASE_DELAY_MS * 2 ** (rateLimitAttempts - 1);
        log.warn(
          'sre-agent',
          `rate limited on ${name}; retry ${rateLimitAttempts}/${MAX_RATE_LIMIT_RETRIES} in ${waitMs}ms`
        );
        await sleep(waitMs);
        continue;
      }

      // 404 on a session-bearing request means the gateway dropped the session
      // (worker restart/expiry). The call never reached the upstream, so a
      // single re-handshake + replay is safe.
      if (response.status === 404 && session.sessionId && !sessionRetried) {
        sessionRetried = true;
        log.warn('sre-agent', `MCP session expired on ${name}; re-initializing once`);
        resetSreAgentSession();
        continue;
      }

      if (response.status >= 400) throw gatewayStatusError(response, `tools/call ${name}`);

      if (!message) {
        throw new Error(
          `[sre-agent/company_ai] ${name} returned no JSON-RPC message (HTTP ${response.status}).`
        );
      }
      if (message.error) {
        throw new Error(
          `[sre-agent/company_ai] ${name} returned JSON-RPC error ${message.error.code}: ${message.error.message}`
        );
      }
      if (!message.result) {
        throw new Error(`[sre-agent/company_ai] ${name} returned no result.`);
      }
      if (message.result.isError) {
        throw new Error(
          `[sre-agent/company_ai] ${name} tool error: ${extractResultText(message.result) || '(no message)'}`
        );
      }

      return capResult(extractResultText(message.result));
    }
  });
