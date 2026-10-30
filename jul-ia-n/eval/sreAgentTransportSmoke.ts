/**
 * `npm run ai-heal:sre-smoke`
 *
 * Offline smoke test for `tools/prodSreAgentClient.ts`'s transport, against a
 * fake server that speaks the same contract as the LiteLLM `company_ai` gateway:
 * bearer workload key, `initialize` + echoed `mcp-session-id`, SSE responses,
 * and server-alias-prefixed tool names (`prod_sre_agent-*`). No credential, no
 * LLM, no network beyond loopback.
 *
 * It exists because the real gateway path can't be exercised until ai-heal's
 * LiteLLM workload key is granted (see
 * `jul-ia-n/docs/sre-agent-workload-access-request.md`), and the pieces most
 * likely to break silently — SSE frame selection, session reuse, the tool-name
 * prefix, and the narrow retry policy — are all checkable without it. Covers:
 * missing key fails before any request; happy path over SSE with a leading
 * progress frame; session reuse across calls; 429 honouring `Retry-After`; a
 * dropped session re-handshaking exactly once; a tool-level `isError` surfacing
 * as a throw.
 *
 * It does NOT prove the real gateway behaves this way — that's the curl + dry-run
 * check in the access-request doc.
 */
import { createServer, IncomingMessage, ServerResponse } from 'http';

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
  });

interface Seen {
  authHeaders: string[];
  accepts: string[];
  requestIds: string[];
  sessionIdsSent: (string | undefined)[];
  methods: string[];
  toolNames: string[];
  initializeCount: number;
  notificationCount: number;
}

const seen: Seen = {
  authHeaders: [],
  accepts: [],
  requestIds: [],
  sessionIdsSent: [],
  methods: [],
  toolNames: [],
  initializeCount: 0,
  notificationCount: 0,
};

/** Scripted per-call behaviour so we can exercise 429 and expired-session paths. */
let toolCallCount = 0;
let scenario: 'happy' | 'rate-limit-then-ok' | 'expired-session-then-ok' | 'tool-error' = 'happy';

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req);
  const msg = JSON.parse(body || '{}');
  seen.authHeaders.push(String(req.headers.authorization));
  seen.accepts.push(String(req.headers.accept));
  seen.requestIds.push(String(req.headers['x-request-id']));
  seen.sessionIdsSent.push(req.headers['mcp-session-id'] as string | undefined);
  seen.methods.push(msg.method);

  if (msg.method === 'initialize') {
    seen.initializeCount++;
    res.writeHead(200, {
      'content-type': 'application/json',
      'mcp-session-id': `sess-${seen.initializeCount}`,
    });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'fake' } },
      })
    );
    return;
  }

  if (msg.method === 'notifications/initialized') {
    seen.notificationCount++;
    res.writeHead(202).end();
    return;
  }

  if (msg.method === 'tools/call') {
    toolCallCount++;
    seen.toolNames.push(msg.params?.name);

    if (scenario === 'rate-limit-then-ok' && toolCallCount === 1) {
      res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '1' });
      res.end(JSON.stringify({ error: 'rate limited' }));
      return;
    }
    if (scenario === 'expired-session-then-ok' && toolCallCount === 1) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'session not found' }));
      return;
    }
    if (scenario === 'tool-error') {
      // SSE frame carrying a tool-level error (isError), not a JSON-RPC error.
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end(
        `event: message\ndata: ${JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: { isError: true, content: [{ type: 'text', text: 'accountAlias mismatch' }] },
        })}\n\n`
      );
      return;
    }

    // Happy path over SSE, with a leading progress notification that must be ignored.
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(
      `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: { progress: 1 },
      })}\n\n`
    );
    res.end(
      `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          structuredContent: {
            manifest: 'rca-session-manifest.json',
            echoedArgs: msg.params?.arguments,
          },
        },
      })}\n\n`
    );
    return;
  }

  res.writeHead(400).end('unexpected method');
});

const assert = (cond: boolean, label: string): void => {
  if (!cond) throw new Error(`FAIL: ${label}`);
  console.log(`  ok — ${label}`);
};

const main = async (): Promise<void> => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;

  // 1. No key -> fails fast, before any network call.
  delete process.env.AI_HEAL_LITELLM_MCP_KEY;
  process.env.AI_HEAL_LITELLM_MCP_URL = `http://127.0.0.1:${port}`;
  const client = await import('../tools/prodSreAgentClient');
  console.log('\n[1] missing key');
  try {
    await client.callSreAgentTool('rca_session_run', {});
    throw new Error('FAIL: expected a throw with no key');
  } catch (err) {
    assert(
      (err as Error).message.includes('AI_HEAL_LITELLM_MCP_KEY is not set'),
      'throws the actionable missing-key message'
    );
  }
  assert(seen.methods.length === 0, 'no request was made without a key');

  // 2. Happy path.
  process.env.AI_HEAL_LITELLM_MCP_KEY = 'sk-fake-workload-key';
  console.log('\n[2] happy path');
  const out = await client.callSreAgentTool('rca_session_run', { environment: 'staging' });
  assert(out.includes('rca-session-manifest.json'), 'returns the structured result text');
  assert(seen.initializeCount === 1, 'handshake ran exactly once');
  assert(seen.notificationCount === 1, 'sent notifications/initialized');
  assert(seen.toolNames[0] === 'prod_sre_agent-rca_session_run', 'prefixed the tool name');
  assert(
    seen.authHeaders.every((h) => h === 'Bearer sk-fake-workload-key'),
    'sent the bearer key'
  );
  assert(
    seen.accepts.every((a) => a === 'application/json, text/event-stream'),
    'sent the streamable-HTTP Accept header'
  );
  assert(seen.sessionIdsSent[2] === 'sess-1', 'tools/call carried the mcp-session-id');
  assert(
    new Set(seen.requestIds).size === seen.requestIds.length,
    'every call had a unique X-Request-ID'
  );

  // 3. Session is reused across calls (no second handshake).
  console.log('\n[3] session reuse');
  await client.callSreAgentTool('artifact_read', { path: 'x.json' });
  assert(seen.initializeCount === 1, 'did not re-handshake for the second call');
  assert(seen.toolNames[1] === 'prod_sre_agent-artifact_read', 'prefixed the second tool name');

  // 4. 429 -> retried with Retry-After.
  console.log('\n[4] rate limit');
  scenario = 'rate-limit-then-ok';
  toolCallCount = 0;
  const started = Date.now();
  const rateLimited = await client.callSreAgentTool('rca_session_run', {});
  assert(rateLimited.includes('rca-session-manifest.json'), 'succeeded after the 429 retry');
  assert(Date.now() - started >= 1000, 'honoured Retry-After before retrying');

  // 5. 404 on a session-bearing call -> one re-handshake, then success.
  console.log('\n[5] expired session');
  scenario = 'expired-session-then-ok';
  toolCallCount = 0;
  const revived = await client.callSreAgentTool('rca_session_investigate', { maxActions: 2 });
  assert(revived.includes('rca-session-manifest.json'), 'succeeded after re-initializing');
  assert(seen.initializeCount === 2, 're-handshaked exactly once');

  // 6. Tool-level error surfaces as a throw with the tool's message.
  console.log('\n[6] tool error');
  scenario = 'tool-error';
  toolCallCount = 0;
  try {
    await client.callSreAgentTool('rca_session_run', {});
    throw new Error('FAIL: expected a throw on isError');
  } catch (err) {
    assert(
      (err as Error).message.includes('accountAlias mismatch'),
      'propagates the tool error text'
    );
  }

  server.close();
  console.log('\nALL PASS');
};

main().catch((err) => {
  server.close();
  console.error(`\n${(err as Error).message}`);
  process.exit(1);
});
