/**
 * Declarative contract for HTTP-backed actions (capture, refund, void, purchase — anything in
 * `api.*` today calling into `apiCallNewman.ts`).
 *
 * Today those functions take an ad-hoc `validation` object, make the call, and assert inline
 * with a bespoke `expect(...)` per function. This describes the same intent as data — what
 * was sent (`Request`), what came back, and what was expected (`ExpectedResponse`) — so the
 * runner can execute and validate generically, and a failure carries a structured diff instead
 * of a raw JSON dump.
 *
 * This does not replace `apiCallNewman.ts` — it wraps it. `execute()` takes the same response
 * shape those functions already return.
 */

import { Matcher, Matchers, MatchResult } from './matchers';
import { redact } from './redact';

export interface HttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Path or logical operation name, e.g. "captureV2", "/orders/:id/refund" — for reporting only. */
  operation: string;
  body?: unknown;
}

export interface ExpectedResponse {
  status: number;
  /** Checked with `equals` (subset match) when present. Omit to only check `status`. */
  body?: unknown;
  /** Override the matcher for `body` with a custom `Matcher` implementation. Defaults to `Matchers.equals`. */
  bodyMatcher?: Matcher;
}

export interface HttpCheckResult {
  passed: boolean;
  /** One entry per checked field (status, body), empty on the ones that passed. */
  failures: string[];
  /** Redacted request/response, safe to attach to a CI report. */
  trace: { request: HttpRequest; response: { status: number; body: unknown } };
}

/**
 * Validates an already-executed HTTP response against an `ExpectedResponse`.
 *
 * Never throws for a response mismatch — returns a result object so the caller (a plugin
 * action) decides how to surface it (throw for the DSL runner, attach for a report, both). A
 * validation function that threw mid-comparison is how a wrong assumption about the response
 * shape turned into a "Cannot read property 'x' of undefined" instead of a clear diff.
 *
 * The one thing it does throw on is a missing `request.operation`: that is not a response
 * mismatch, it is a caller passing an incomplete `HttpRequest`. Every failure message and
 * report entry this module produces is keyed by `operation` — an empty one would print
 * `"" did not match the expected response`, silently useless for whoever reads the report.
 * TypeScript already requires the field at compile time; this guards the same rule at
 * runtime for values built dynamically (spread objects, data read from fixtures) where the
 * type checker cannot see the actual value.
 */
export function checkHttpResponse(
  request: HttpRequest,
  response: { status: number; body?: unknown },
  expected: ExpectedResponse
): HttpCheckResult {
  if (!request.operation || !request.operation.trim()) {
    throw new Error(
      'checkHttpResponse: request.operation is required and cannot be empty — pass a name that identifies this call (e.g. "captureV2", "purchaseWithCreditCard") so failures are traceable to it.'
    );
  }

  const failures: string[] = [];

  const statusResult: MatchResult = Matchers.equalsScalar.evaluate(response.status, expected.status);
  if (!statusResult.passed) failures.push(`status: ${statusResult.message}`);

  if (expected.body !== undefined) {
    const matcher = expected.bodyMatcher ?? Matchers.equals;
    const bodyResult = matcher.evaluate(response.body, expected.body);
    if (!bodyResult.passed) failures.push(`body: ${bodyResult.message}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    trace: { request, response: { status: response.status, body: redact(response.body) } },
  };
}

/**
 * Throws with a single, readable message if the check failed. The message names the
 * operation up front — `describeStepFailure` in `core.ts` already prefixes it with the step
 * index and action name, so this only needs to add what's specific to the HTTP call.
 */
export function assertHttpResponse(
  request: HttpRequest,
  response: { status: number; body?: unknown },
  expected: ExpectedResponse
): void {
  const check = checkHttpResponse(request, response, expected);
  if (check.passed) return;

  throw new Error(
    `${request.operation} did not match the expected response:\n` + check.failures.map((f) => `  - ${f}`).join('\n')
  );
}
