/**
 * Matchers: the single place that knows how to compare an expected value against an actual
 * one and explain the result. Every assertion action in the DSL should go through here
 * instead of calling Playwright's `expect()` directly with a hand-rolled message — that is
 * how `apiCallNewman.ts` ended up with a dozen slightly different mismatch messages, none of
 * them redacted and none of them showing a diff.
 */

import { diff, formatDiff } from './diff';
import { redact } from './redact';

export interface MatchResult {
  passed: boolean;
  /** Empty when `passed` is true. Redacted and diff-formatted otherwise. */
  message: string;
}

export interface Matcher<T = unknown> {
  name: string;
  evaluate(actual: T, expected: T): MatchResult;
}

function result(passed: boolean, message = ''): MatchResult {
  return { passed, message };
}

/** Strict equality on primitives, structural equality (subset) on objects/arrays. */
export const equals: Matcher = {
  name: 'equals',
  evaluate(actual, expected) {
    const entries = diff(expected, actual);
    if (entries.length === 0) return result(true);
    return result(false, `Value did not match expected:\n${formatDiff(entries.map(redactEntry))}`);
  },
};

/** For HTTP status codes and other scalars where a diff would be noise. */
export const equalsScalar: Matcher = {
  name: 'equalsScalar',
  evaluate(actual, expected) {
    if (Object.is(actual, expected)) return result(true);
    return result(false, `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  },
};

function redactEntry(entry: { path: string; expected: unknown; actual: unknown }) {
  return { ...entry, expected: redact(entry.expected), actual: redact(entry.actual) };
}

export const Matchers = { equals, equalsScalar };
