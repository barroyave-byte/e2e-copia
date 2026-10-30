/**
 * `npm run ai-heal:sre-preflight [-- --rca]`
 *
 * One-shot check that ai-heal's LiteLLM workload key actually reaches the SRE
 * Agent through the `company_ai` MCP gateway, run once when the key is issued or
 * rotated. Unlike `ai-heal:sre-smoke` (offline, fake gateway, validates our own
 * transport) this talks to the real gateway and answers a different question:
 * **did the grants land?**
 *
 * That question needs asking because the failure mode is asymmetric. The three
 * RCA tools are `ai-operator` tier with `approval: "operator_entitlement"` in
 * `sre-dev-portal/services/litellm/policy/mcp-tools.staging.json`, while
 * `sre_agent_capabilities` is plain `read_only`. A key created under a team that
 * did not receive the operator grants therefore authenticates fine, lists fine,
 * and answers `sre_agent_capabilities` fine — then 403s on `rca_session_run`
 * during a real regression. A handshake-only check (curl `initialize`) passes in
 * exactly that broken state, which is why this exists.
 *
 * Stages:
 *   0. key identity — reads the calling key's own team from LiteLLM and compares
 *      it against what the SRE Agent's workload allowlist requires. Advisory.
 *   1. handshake — proves the key is accepted and the gateway speaks MCP.
 *   2. tools/list — reports which `prod_sre_agent-*` tools are visible.
 *   3. sre_agent_capabilities — proves a real tool call round-trips (read_only,
 *      no side effects).
 *   4. rca_session_run — ONLY with `--rca`. The one call that actually proves the
 *      operator entitlement, so it is the only conclusive stage; it is opt-in
 *      because it starts a real (throwaway) RCA session and writes server-local
 *      artifacts.
 *
 * Prints a verdict and exits non-zero on failure so it can be dropped into a
 * pipeline later. Never prints the key.
 */
import axios from 'axios';

import {
  callSreAgentTool,
  listSreAgentTools,
  resetSreAgentSession,
} from '../tools/prodSreAgentClient';

/** The grant we asked SRE for — see docs/sre-agent-workload-access-request.md. */
const EXPECTED_TOOLS = [
  'sre_agent_capabilities',
  'rca_session_run',
  'rca_session_investigate',
  'artifact_read',
] as const;

const RCA_TOOLS = ['rca_session_run', 'rca_session_investigate', 'artifact_read'];

/**
 * What the deployed SRE Agent's `SRE_AGENT_MCP_ALLOWED_WORKLOAD_IDENTITIES`
 * entry `service:ai-heal=ai-heal` requires of our LiteLLM team. Both are
 * exact-match compares in `workloadIdentityAllowed`, so a differently-named team
 * fails closed with a 401 that says nothing about names.
 */
const EXPECTED_TEAM_ID = 'ai-heal';
const EXPECTED_PRINCIPAL_ID = 'service:ai-heal';

const ok = (msg: string): void => console.log(`  \x1b[32mok\x1b[0m   ${msg}`);
const warn = (msg: string): void => console.log(`  \x1b[33mwarn\x1b[0m ${msg}`);
const bad = (msg: string): void => console.log(`  \x1b[31mfail\x1b[0m ${msg}`);

const preview = (text: string, max = 400): string =>
  text.length <= max ? text : `${text.slice(0, max)}… [+${text.length - max} chars]`;

type Cause = 'upstream-delegation' | 'gateway-auth' | 'other';

/**
 * Which side actually rejected us. Worth distinguishing because the two look
 * alike in a log and route to different people, and the first run of this
 * preflight (2026-08-08) hit the case the original hint text got wrong.
 *
 * - `gateway-auth`: LiteLLM refused our workload key or the team's grant. The
 *   status lands on OUR request, so it surfaces through the client's own
 *   `HTTP 401/403 on tools/call …` message.
 * - `upstream-delegation`: LiteLLM ACCEPTED the key, applied policy, called the
 *   SRE Agent, and the SRE Agent rejected LiteLLM's delegation JWT. It arrives
 *   as a successful tool call carrying `isError`, whose text is LiteLLM's own
 *   httpx failure (`HTTPStatusError`) against the internal cluster URL. This
 *   also proves the team's grants are fine: a missing grant fails inside
 *   LiteLLM and never reaches the upstream at all.
 */
const classify = (message: string): Cause => {
  if (/HTTPStatusError|svc\.cluster\.local|for url '/.test(message)) return 'upstream-delegation';
  if (/HTTP 40[13] on /.test(message)) return 'gateway-auth';
  return 'other';
};

const explainUpstreamDelegation = (): void => {
  console.log(`
  This is NOT your key and NOT the team's tool grants.

  LiteLLM accepted the key, applied policy, and forwarded the call to the SRE
  Agent at its internal cluster URL — and the SRE Agent rejected the delegation
  token LiteLLM minted. A missing tool grant would have failed inside LiteLLM
  and never reached the upstream, so the grants are fine.

  Likely root cause: ai-heal is the FIRST workload principal to call the SRE
  Agent through the gateway. sre-dev-portal's own contract test asserts the only
  other workload (aws-devops-agent-repograph) has no prod_sre_agent permission
  (scripts/validate-central-ai.sh), so workload -> SRE Agent delegation has never
  been exercised. Per DEUNA_AI_ARCHITECTURE.md every upstream must validate
  "verified employee or workload identity" and a "non-empty delegation actor
  (act.sub)" — a virtual key with no user attached is a plausible way to produce
  an empty act.sub and fail closed.

  Route to SRE / AI Platform, not to ITOps and not to the LiteLLM team policy.
  Ask them to check the SRE Agent's delegation validation for a workload subject:
  audience mapping, act.sub, and tool-scope mapping for a non-human principal.`);
};

/**
 * Ask LiteLLM which team this key belongs to, via its own key introspection
 * endpoint. Informational and never fatal.
 *
 * This exists because the SRE Agent validates the delegation JWT's `sub` and
 * `act.sub` against `SRE_AGENT_MCP_ALLOWED_WORKLOAD_IDENTITIES`
 * (`service:<subject>=<actor>`), and by the deployed precedent those map to the
 * team's `metadata.principal_id` and its `team_id`. We cannot influence either
 * from here — the claims are minted server-side from whatever team the key
 * belongs to, and we only ever hold the opaque virtual key. But we can *read*
 * the team, which turns "ask the platform owner what they named it" into a fact,
 * and an exact-match mismatch is the most likely cause of a 401 once the
 * allowlist entry exists.
 *
 * Prints an explicit field allowlist rather than the raw payload: the response
 * carries key hashes and spend metadata that have no business in a CI log.
 */
const reportKeyIdentity = async (): Promise<void> => {
  const mcpUrl =
    process.env.AI_HEAL_LITELLM_MCP_URL || 'https://dev-portal.deuna.io/litellm/company_ai/mcp';
  const base = process.env.AI_HEAL_LITELLM_BASE_URL || mcpUrl.replace(/\/[^/]+\/mcp\/?$/, '');

  let response;
  try {
    response = await axios.get(`${base}/key/info`, {
      headers: { Authorization: `Bearer ${process.env.AI_HEAL_LITELLM_MCP_KEY}` },
      timeout: 20_000,
      validateStatus: () => true,
      // A browser-OIDC ingress answers a machine call with an HTML redirect;
      // don't let axios follow it into something unparseable.
      maxRedirects: 0,
    });
  } catch (err) {
    warn(`could not reach ${base}/key/info: ${(err as Error).message}`);
    return;
  }

  if (response.status >= 400 || typeof response.data !== 'object' || response.data === null) {
    warn(
      `key introspection unavailable (HTTP ${response.status}) — this endpoint may not be routed ` +
        `for machine calls. Ask the LiteLLM admin for the team's team_id and metadata.principal_id.`
    );
    return;
  }

  const info = ((response.data as Record<string, unknown>).info ?? response.data) as Record<
    string,
    unknown
  >;
  const metadata = (info.metadata ?? {}) as Record<string, unknown>;
  const teamId = info.team_id ?? '(none)';
  const principalId = metadata.principal_id ?? '(none)';

  ok('key introspection succeeded');
  console.log(`         team_id:                ${String(teamId)}`);
  console.log(`         metadata.principal_id:  ${String(principalId)}`);
  console.log(`         metadata.principal_type:${String(metadata.principal_type ?? '(none)')}`);
  console.log(`         models:                 ${JSON.stringify(info.models ?? [])}`);

  // The deployed allowlist entry is `service:ai-heal=ai-heal`.
  if (teamId !== EXPECTED_TEAM_ID || principalId !== EXPECTED_PRINCIPAL_ID) {
    bad(
      `identity mismatch: the SRE Agent's allowlist expects team_id="${EXPECTED_TEAM_ID}" and ` +
        `principal_id="${EXPECTED_PRINCIPAL_ID}" (entry "service:ai-heal=ai-heal"). Those are ` +
        `exact-match compares in workloadIdentityAllowed, so this alone produces a 401.`
    );
  }
};

const main = async (): Promise<void> => {
  const withRca = process.argv.includes('--rca');
  const problems: string[] = [];

  console.log('\nSRE Agent preflight — real gateway');
  console.log(
    `  gateway: ${process.env.AI_HEAL_LITELLM_MCP_URL || 'https://dev-portal.deuna.io/litellm/company_ai/mcp'}`
  );
  console.log(`  server:  ${process.env.AI_HEAL_SRE_AGENT_MCP_SERVER || 'prod_sre_agent'}`);
  console.log(`  key:     ${process.env.AI_HEAL_LITELLM_MCP_KEY ? 'present' : 'MISSING'}`);

  // ---- 0. who does this key say it is? -------------------------------------
  if (process.env.AI_HEAL_LITELLM_MCP_KEY) {
    console.log('\n[0] key identity (LiteLLM key introspection)');
    await reportKeyIdentity();
  }

  // ---- 1 + 2. handshake and tools/list (the client handshakes lazily) --------
  console.log('\n[1/2] handshake + tools/list');
  let visible: string[] = [];
  try {
    const tools = await listSreAgentTools();
    visible = tools.map((t) => t.name).sort();
    ok(`handshake accepted, ${visible.length} ${'prod_sre_agent'}-* tool(s) visible`);
    for (const name of visible) console.log(`         · ${name}`);
    for (const expected of EXPECTED_TOOLS) {
      if (!visible.includes(expected)) {
        bad(`expected tool not visible: ${expected}`);
        problems.push(`tool not visible: ${expected}`);
      }
    }
    if (visible.length > EXPECTED_TOOLS.length) {
      warn(
        `more tools visible than we asked for — either the gateway does not filter tools/list per ` +
          `team, or the grant is wider than requested. Confirm with the policy owner; ai-heal only ` +
          `ever calls the four.`
      );
    }
  } catch (err) {
    bad((err as Error).message);
    problems.push('handshake/tools-list failed');
    // Nothing below can work without a session.
    console.log('\nVERDICT: FAIL — could not reach the gateway with this key.\n');
    process.exit(1);
  }

  // ---- 3. a real read_only tool call ---------------------------------------
  console.log('\n[3] sre_agent_capabilities (read_only, no side effects)');
  const causes = new Set<Cause>();
  try {
    const capabilities = await callSreAgentTool('sre_agent_capabilities', {});
    ok('tool call round-tripped');
    console.log(`         ${preview(capabilities)}`);
  } catch (err) {
    const msg = (err as Error).message;
    bad(msg);
    problems.push('sre_agent_capabilities failed');
    causes.add(classify(msg));
  }

  // ---- 4. the conclusive one ----------------------------------------------
  if (!withRca) {
    console.log('\n[4] rca_session_run — SKIPPED (pass --rca to run it)');
    warn(
      'without this stage the operator_entitlement grant is NOT proven: a team missing it still ' +
        'passes every check above.'
    );
  } else {
    console.log('\n[4] rca_session_run (starts a throwaway RCA session)');
    try {
      const result = await callSreAgentTool('rca_session_run', {
        scenario: {
          id: 'ai-heal-preflight',
          title: 'ai-heal workload key preflight — synthetic scenario, not a real failure',
          environment: process.env.AI_HEAL_ENVIRONMENT || 'staging',
          symptoms: ['preflight check of the ai-heal workload grant'],
          services: [],
          telemetry: {},
          identifiers: {},
          testCases: [],
        },
        environment: process.env.AI_HEAL_ENVIRONMENT || 'staging',
        accountAlias: process.env.AI_HEAL_SRE_ACCOUNT_ALIAS || 'dev',
        region: process.env.AI_HEAL_SRE_REGION || 'us-east-2',
      });
      ok('operator entitlement confirmed — rca_session_run executed');
      console.log(`         ${preview(result)}`);
    } catch (err) {
      const msg = (err as Error).message;
      bad(msg);
      problems.push('rca_session_run failed');
      causes.add(classify(msg));
    }
  }

  resetSreAgentSession();

  if (problems.length > 0) {
    console.log('\nPROBABLE CAUSE');
    if (causes.has('upstream-delegation')) {
      // Printed even when tools/list also came back empty: an upstream that
      // rejects LiteLLM's delegation makes the tool list empty too, so the
      // "not visible" lines above are a symptom of this, not evidence about
      // the team's grants.
      explainUpstreamDelegation();
      if (visible.length === 0) {
        console.log(
          `\n  The empty tool list above is the same failure, not a second one — LiteLLM could not\n` +
            `  enumerate the upstream's tools either. Do not read it as a missing grant.`
        );
      }
    } else if (causes.has('gateway-auth')) {
      console.log(`
  LiteLLM itself refused the call, so this is the key or the team's grants:
  ${RCA_TOOLS.join(' / ')} are ai-operator tier with operator_entitlement in
  sre-dev-portal/services/litellm/policy/mcp-tools.staging.json. If
  sre_agent_capabilities passed and the RCA tools did not, the team exists but
  did not receive the operator grants. Route to the LiteLLM policy owner.`);
    } else if (visible.length === 0) {
      console.log(`
  No prod_sre_agent tools are visible to this key and no tool call was attempted
  or classified. Check that the team carries the company_ai MCP access group.`);
    }
    console.log(`\nVERDICT: FAIL — ${problems.join('; ')}\n`);
    process.exit(1);
  }
  console.log(
    `\nVERDICT: PASS${withRca ? '' : ' (partial — operator entitlement unproven, rerun with --rca)'}\n`
  );
};

main().catch((err) => {
  console.error(`\npreflight crashed: ${(err as Error).message}\n`);
  process.exit(1);
});
