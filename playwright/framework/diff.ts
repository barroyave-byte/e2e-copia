/**
 * Structural diff between an expected value and an actual value.
 *
 * Used by the Matchers layer to explain *why* an assertion failed instead of dumping two full
 * JSON blobs and leaving the reader to spot the difference by eye — which is what
 * `apiCallNewman.ts` does today (`JSON.stringify(response, null, 2)` on every mismatch).
 */

export interface DiffEntry {
  /** Dotted path to the mismatched field, e.g. "order.payment.status". "" for the root value. */
  path: string;
  expected: unknown;
  actual: unknown;
}

const MAX_ENTRIES = 50;

/**
 * Walks `expected` and `actual` together and collects every leaf where they disagree.
 *
 * Only keys present in `expected` are checked — this is a "does actual satisfy expected"
 * comparison, not a symmetric equality, so ExpectedResponse objects can assert a subset of
 * fields without listing the whole payload.
 */
export function diff(expected: unknown, actual: unknown, path = ''): DiffEntry[] {
  if (isPlainObject(expected) && isPlainObject(actual)) {
    return Object.entries(expected).flatMap(([key, expectedValue]) =>
      diff(expectedValue, (actual as Record<string, unknown>)[key], path ? `${path}.${key}` : key)
    );
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return [{ path: path || '(root)', expected: `array(${expected.length})`, actual: `array(${actual.length})` }];
    }
    return expected.flatMap((item, index) => diff(item, actual[index], `${path}[${index}]`));
  }

  return Object.is(expected, actual) ? [] : [{ path: path || '(root)', expected, actual }];
}

/** Renders diff entries as a compact, human-readable block for a failure message. */
export function formatDiff(entries: DiffEntry[]): string {
  if (entries.length === 0) return '(no differences)';

  const shown = entries.slice(0, MAX_ENTRIES);
  const lines = shown.map((e) => `  - ${e.path}: expected ${stringify(e.expected)}, got ${stringify(e.actual)}`);

  if (entries.length > MAX_ENTRIES) {
    lines.push(`  ... and ${entries.length - MAX_ENTRIES} more difference(s)`);
  }
  return lines.join('\n');
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
