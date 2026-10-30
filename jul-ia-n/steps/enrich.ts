import AdmZip = require('adm-zip');
import { existsSync, readFileSync } from 'fs';

import { ClassifiedFailure } from '../schemas/classifiedFailure';
import {
  ArtifactPaths,
  EnrichedFailure,
  EnrichedFailureSchema,
  NetworkCall,
} from '../schemas/enrichedFailure';
import { log } from '../util/log';
import { NormalizedFailure } from './normalize';

export interface EnrichOptions {
  // Kept for backwards compat with --test-results-dir flag.
  // No longer used: artifact paths now come directly from attachments[] in normalize.
  testResultsDir?: string;
  testResultsJsonPath?: string;
}

const DOM_SNAPSHOT_MAX_CHARS = 5000;
const STDERR_SNIPPET_MAX_CHARS = 1000;
const HTTP_BODY_ERROR_MAX_CHARS = 2000;
const HTTP_BODY_OK_MAX_CHARS = 200;
const HTTP_RECENT_BLOCKS_TO_KEEP = 3;
const TRACE_MAX_NETWORK_CALLS = 20;
const TRACE_BODY_ERROR_MAX_CHARS = 2000;
const TRACE_BODY_OK_MAX_CHARS = 200;

// ID extraction regexes — run over the joined text from all enriched sources.
const ORDER_ID_REGEX =
  /(?:"order_?(?:id|token)"\s*:\s*"([a-zA-Z0-9_-]{8,64})")|(?:order[_-]?(?:id|token)[=:\s]+([a-zA-Z0-9_-]{8,64}))/gi;
const TRANSACTION_ID_REGEX =
  /(?:"transaction_?id"\s*:\s*"([a-zA-Z0-9_-]{8,64})")|(?:transaction[_-]?id[=:\s]+([a-zA-Z0-9_-]{8,64}))/gi;
const X_REQUEST_ID_REGEX = /x-request-id["\s:=]+["']?([a-f0-9-]{8,})/gi;

// Trace network filters — only keep calls to internal DEUNA hosts AND
// (status>=400 OR null status OR relevant payment endpoint OR amongst the last N).
const INTERNAL_HOST_RE = /\.deuna\.(io|com)|localhost/i;
const RELEVANT_ENDPOINT_RE =
  /\/(purchase|authorize|capture|refund|void|orders|payments|3ds|invoices|merchants|processors)/i;

const extractAllMatches = (regex: RegExp, text: string): string[] => {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const value = m[1] ?? m[2];
    if (value) out.add(value);
  }
  return Array.from(out);
};

export interface ExtractedIds {
  orderId: string | null;
  transactionId: string | null;
  xRequestIds: string[];
}

/**
 * Same order/transaction/x-request-id extraction used to build the ORIGINAL
 * failure's evidence below, exposed standalone so steps/verify.ts can run it
 * again over its own re-run's stdout — the only re-run passing tests leave
 * behind (CI mode disables screenshot/trace/video unless a test fails, see
 * playwright.config.ts), and IDs are how a human actually confirms a PSP
 * transaction went through, not just that Playwright's own status was
 * "passed".
 */
export const extractIdsFromText = (text: string): ExtractedIds => {
  const orderIds = extractAllMatches(new RegExp(ORDER_ID_REGEX), text);
  const transactionIds = extractAllMatches(new RegExp(TRANSACTION_ID_REGEX), text);
  const xRequestIds = extractAllMatches(new RegExp(X_REQUEST_ID_REGEX), text);
  return {
    orderId: orderIds[0] ?? null,
    transactionId: transactionIds[0] ?? null,
    xRequestIds,
  };
};

// ---------------------------------------------------------------------------
// stdout HTTP log extraction
// ---------------------------------------------------------------------------

interface HttpBlock {
  kind: 'request' | 'response' | 'error';
  status: number | null;
  headerLine: string;
  bodyLines: string[];
}

const HTTP_HEADER_RE = /^\s*\[HTTP (Request|Response Error|Response)\]/;
const HTTP_STATUS_RE = /\[HTTP Response(?:\s+Error)?\]\s+(\d{3})/;

const classifyHeader = (line: string): HttpBlock['kind'] | null => {
  const m = HTTP_HEADER_RE.exec(line);
  if (!m) return null;
  if (m[1] === 'Request') return 'request';
  if (m[1] === 'Response Error') return 'error';
  return 'response';
};

const extractHttpBlocks = (stdoutText: string): HttpBlock[] => {
  const lines = stdoutText.split(/\r?\n/);
  const blocks: HttpBlock[] = [];
  let current: HttpBlock | null = null;

  for (const line of lines) {
    const kind = classifyHeader(line);
    if (kind) {
      if (current) blocks.push(current);
      const statusMatch = HTTP_STATUS_RE.exec(line);
      current = {
        kind,
        status: statusMatch ? Number(statusMatch[1]) : null,
        headerLine: line.trim(),
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
};

const bodyMaxChars = (block: HttpBlock): number => {
  if (block.kind === 'error') return HTTP_BODY_ERROR_MAX_CHARS;
  if (block.status !== null && block.status >= 400) return HTTP_BODY_ERROR_MAX_CHARS;
  return HTTP_BODY_OK_MAX_CHARS;
};

const formatBlock = (b: HttpBlock): string => {
  const max = bodyMaxChars(b);
  const body = b.bodyLines.join('\n').replace(/\s+$/g, '');
  const trimmed =
    body.length > max
      ? `${body.slice(0, max)}\n... [+${body.length - max} chars truncated]`
      : body;
  return `${b.headerLine}\n${trimmed}`;
};

/**
 * Returns the most relevant HTTP blocks from a Playwright stdout dump:
 * every error block (kind='error' or status>=400) plus the last
 * HTTP_RECENT_BLOCKS_TO_KEEP blocks regardless of status. Preserves
 * chronological order.
 */
export const extractHttpLogsFromStdout = (stdoutText: string): string => {
  if (!stdoutText) return '';
  const blocks = extractHttpBlocks(stdoutText);
  if (blocks.length === 0) return '';

  const lastRelevantIndex = blocks.length - 1;
  const recentThreshold = lastRelevantIndex - HTTP_RECENT_BLOCKS_TO_KEEP + 1;

  const kept = blocks.filter((b, i) => {
    const isError = b.kind === 'error' || (b.status !== null && b.status >= 400);
    const isRecent = i >= recentThreshold;
    return isError || isRecent;
  });

  return kept.map(formatBlock).join('\n\n');
};

// ---------------------------------------------------------------------------
// trace.zip network call extraction (filtered)
// ---------------------------------------------------------------------------

interface NetworkParseResult {
  calls: NetworkCall[];
  xRequestIds: string[];
  startTimeMs: number | null;
  endTimeMs: number | null;
  rawText: string;
}

const traceBodyTruncated = (body: unknown, status: number | null): string | null => {
  if (typeof body !== 'string') return null;
  const max =
    status !== null && status >= 400
      ? TRACE_BODY_ERROR_MAX_CHARS
      : status !== null && status >= 200
        ? TRACE_BODY_OK_MAX_CHARS
        : 0;
  if (max === 0) return null;
  return body.length > max
    ? `${body.slice(0, max)} ... [+${body.length - max} truncated]`
    : body;
};

const parseTraceZip = (tracePath: string): NetworkParseResult => {
  const calls: NetworkCall[] = [];
  const xRequestIds = new Set<string>();
  let startTimeMs: number | null = null;
  let endTimeMs: number | null = null;
  let rawText = '';
  let totalEvents = 0;
  let internalCount = 0;

  try {
    const zip = new AdmZip(tracePath);
    for (const entry of zip.getEntries()) {
      if (!/\.network$/.test(entry.entryName)) continue;
      const text = entry.getData().toString('utf-8');
      rawText += text;
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        let evt: any;
        try {
          evt = JSON.parse(line);
        } catch {
          continue;
        }
        totalEvents++;

        // Playwright traces wrap network events as { type: 'resource-snapshot', snapshot: { ... } }.
        // All fields (request, response, startedDateTime, time) live under `snapshot`.
        const snap = evt.snapshot ?? evt;
        const url: string | undefined = snap.request?.url ?? snap.url;
        if (!url) continue;

        // Track time window from startedDateTime (ISO string) for ALL events,
        // so the CloudWatch window covers the full test even if we filter most calls out.
        const startedIso = snap.startedDateTime;
        if (typeof startedIso === 'string') {
          const ms = Date.parse(startedIso);
          if (!Number.isNaN(ms)) {
            if (startTimeMs === null || ms < startTimeMs) startTimeMs = ms;
            const durMs = typeof snap.time === 'number' ? snap.time : 0;
            const endMs = ms + durMs;
            if (endTimeMs === null || endMs > endTimeMs) endTimeMs = endMs;
          }
        }

        // Filter 1: only internal DEUNA hosts (drops Google Maps, RudderStack, MasterCard SDK, fonts, etc).
        const isInternal = INTERNAL_HOST_RE.test(url);
        if (!isInternal) continue;
        internalCount++;

        // Filter 2: keep error/null status OR relevant payment-flow endpoint.
        const rawStatus = snap.response?.status;
        const statusNum =
          typeof rawStatus === 'number' && rawStatus > 0 ? rawStatus : null;
        const isErrorOrNull = statusNum === null || statusNum >= 400;
        const isRelevant = RELEVANT_ENDPOINT_RE.test(url);
        if (!isErrorOrNull && !isRelevant) continue;

        const headers: Record<string, string> = {};
        for (const h of snap.request?.headers ?? []) {
          if (h?.name && typeof h.value === 'string') {
            headers[h.name.toLowerCase()] = h.value;
          }
        }
        const xReq = headers['x-request-id'];
        if (xReq) xRequestIds.add(xReq);

        // Response body in HAR format lives under response.content.text (may be absent or base64).
        const respContent = snap.response?.content;
        const respBody =
          respContent && typeof respContent.text === 'string'
            ? respContent.text
            : null;

        calls.push({
          url,
          method: snap.request?.method ?? 'GET',
          status: statusNum,
          xRequestId: xReq ?? null,
          responseSnippet: traceBodyTruncated(respBody, statusNum),
          durationMs: typeof snap.time === 'number' ? snap.time : null,
        });
      }
    }
  } catch (err) {
    rawText += `\n[trace.zip parse error: ${(err as Error).message}]`;
    log.error('enrich', 'trace.zip parse error', err);
  }

  log.debug('enrich', 'trace stats', {
    totalEvents,
    internalCount,
    keptAfterEndpointFilter: calls.length,
  });

  // Keep only the last N most recent (chronological order preserved by JSONL order).
  const sliced = calls.slice(-TRACE_MAX_NETWORK_CALLS);

  return {
    calls: sliced,
    xRequestIds: Array.from(xRequestIds),
    startTimeMs,
    endTimeMs,
    rawText,
  };
};

// ---------------------------------------------------------------------------
// DOM snapshot (error-context.md)
// ---------------------------------------------------------------------------

const readDomSnapshot = (path: string | null): string | null => {
  if (!path || !existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    if (raw.length > DOM_SNAPSHOT_MAX_CHARS) {
      return (
        raw.slice(0, DOM_SNAPSHOT_MAX_CHARS) +
        `\n... [+${raw.length - DOM_SNAPSHOT_MAX_CHARS} chars truncated]`
      );
    }
    return raw;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public enrich API
// ---------------------------------------------------------------------------

export const enrichFailure = (
  classified: ClassifiedFailure,
  normalized: NormalizedFailure | undefined,
  _opts: EnrichOptions = {},
): EnrichedFailure => {
  const tracePath = normalized?.tracePath ?? null;
  const errorContextPath = normalized?.errorContextPath ?? null;
  const stdoutText = normalized?.stdoutText ?? '';
  const stderrText = normalized?.stderrText ?? '';

  log.info('enrich', `${classified.testCaseId}: starting`, {
    hasNormalized: Boolean(normalized),
    tracePath: tracePath ? '<set>' : null,
    errorContextPath: errorContextPath ? '<set>' : null,
    stdoutChars: stdoutText.length,
    stderrChars: stderrText.length,
  });

  const artifactPaths: ArtifactPaths = {
    trace: tracePath,
    errorContext: errorContextPath,
    screenshots: [],
    video: null,
  };

  const network = tracePath
    ? parseTraceZip(tracePath)
    : {
        calls: [] as NetworkCall[],
        xRequestIds: [] as string[],
        startTimeMs: null,
        endTimeMs: null,
        rawText: '',
      };

  if (tracePath) {
    log.info('enrich', `${classified.testCaseId}: trace.zip parsed (filtered)`, {
      networkCallsKept: network.calls.length,
      xRequestIdsFromTrace: network.xRequestIds.length,
      windowMs:
        network.startTimeMs && network.endTimeMs
          ? network.endTimeMs - network.startTimeMs
          : null,
    });
  } else {
    log.decision(
      'enrich',
      'no trace.zip',
      'attachments[name==trace] not present in test-results.json',
      { testCaseId: classified.testCaseId },
    );
  }

  const httpLogsSnippet = stdoutText
    ? extractHttpLogsFromStdout(stdoutText) || null
    : null;

  if (httpLogsSnippet) {
    log.info('enrich', `${classified.testCaseId}: HTTP blocks extracted from stdout`, {
      snippetChars: httpLogsSnippet.length,
    });
  }

  const stderrSnippet =
    stderrText.length > 0
      ? stderrText.length > STDERR_SNIPPET_MAX_CHARS
        ? stderrText.slice(0, STDERR_SNIPPET_MAX_CHARS) +
          `\n... [+${stderrText.length - STDERR_SNIPPET_MAX_CHARS} chars truncated]`
        : stderrText
      : null;

  const domSnapshot = readDomSnapshot(errorContextPath);

  const allText = [
    httpLogsSnippet ?? '',
    stdoutText,
    stderrText,
    network.rawText,
    domSnapshot ?? '',
    normalized?.error ?? '',
  ].join('\n');

  const orderIds = extractAllMatches(ORDER_ID_REGEX, allText);
  const transactionIds = extractAllMatches(TRANSACTION_ID_REGEX, allText);
  const xRequestIds = Array.from(
    new Set([
      ...network.xRequestIds,
      ...extractAllMatches(X_REQUEST_ID_REGEX, allText),
    ]),
  );

  log.info('enrich', `${classified.testCaseId}: ID extraction`, {
    orderId: orderIds[0] ?? null,
    orderIdsFound: orderIds.length,
    transactionId: transactionIds[0] ?? null,
    xRequestIds: xRequestIds.length,
    domSnapshotChars: domSnapshot?.length ?? 0,
  });

  return EnrichedFailureSchema.parse({
    ...classified,
    specFile: normalized?.file ?? null,
    specLine: normalized?.line ?? null,
    tags: normalized?.tags ?? [],
    orderId: orderIds[0] ?? null,
    transactionId: transactionIds[0] ?? null,
    xRequestIds,
    networkCalls: network.calls,
    domSnapshot,
    httpLogsSnippet,
    stderrSnippet,
    artifactPaths,
    testStartTimeMs: network.startTimeMs,
    testEndTimeMs: network.endTimeMs,
  });
};

export const enrichFailures = (
  classified: ClassifiedFailure[],
  normalizedById: Map<string, NormalizedFailure>,
  opts: EnrichOptions = {},
): EnrichedFailure[] =>
  classified.map((c) =>
    enrichFailure(c, normalizedById.get(c.testCaseId), opts),
  );
