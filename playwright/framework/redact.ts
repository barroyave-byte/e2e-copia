/**
 * Redaction for anything the framework writes to a CI artifact.
 *
 * Step params routinely carry card data and merchant credentials — `BaseCreditCard` has
 * `number`, `cvv_code` and `document_number`; processor fixtures carry `private_api_key`;
 * resolved values include merchant tokens and private keys. These are sandbox values, but a
 * published artifact is the wrong place for anything shaped like a PAN or a credential, so
 * redaction runs before serialisation rather than being left to the caller.
 *
 * The policy is deny-by-key plus a value-shape check, so a field nobody added to the list
 * still gets caught when it looks like a card number.
 */

import { isStepRef } from './ref';

const REDACTED = '[redacted]';

/**
 * Key names whose values never reach an artifact. Matched case-insensitively against the
 * whole key, on both snake_case and camelCase spellings.
 */
const SENSITIVE_KEY = new RegExp(
  [
    'number', // BaseCreditCard.number, document_number, card_number
    'cvv',
    'cvc',
    'pan',
    'password',
    'passwd',
    'secret',
    'token',
    'api_?key',
    'apikey',
    'private_?key',
    'public_?key',
    'privatekey',
    'publickey',
    'authorization',
    'credential',
    'dni',
    'document',
    'holder',
    'expiration',
    'expiry',
  ].join('|'),
  'i'
);

/** 13–19 digits, optionally split by spaces or dashes — a card number regardless of key. */
const PAN_SHAPED = /(?:\d[ -]?){13,19}/;

/** Keys that are safe and useful to keep even though they match the deny list. */
const ALLOWED_KEYS = new Set(['expectedProcessorName', 'processorName', 'orderType']);

const MAX_STRING = 200;
const MAX_ARRAY = 20;
const MAX_DEPTH = 6;

function redactString(value: string): string {
  if (PAN_SHAPED.test(value.replace(/\s/g, ''))) return REDACTED;
  return value.length > MAX_STRING
    ? `${value.slice(0, MAX_STRING)}…[+${value.length - MAX_STRING}]`
    : value;
}

/**
 * Returns a structurally similar value with sensitive fields replaced. Never throws: this
 * runs on a failure path, where losing the diagnostic to a serialisation error would be worse
 * than an imprecise one.
 */
export function redact(value: unknown, depth = 0): unknown {
  try {
    if (value === null || value === undefined) return value;
    if (depth > MAX_DEPTH) return '[depth limit]';

    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'symbol' || typeof value === 'bigint') return String(value);

    if (Array.isArray(value)) {
      const head = value.slice(0, MAX_ARRAY).map((item) => redact(item, depth + 1));
      return value.length > MAX_ARRAY ? [...head, `[+${value.length - MAX_ARRAY} more]`] : head;
    }

    if (value instanceof Error) return { name: value.name, message: redactString(value.message) };
    if (value instanceof Date) return value.toISOString();

    // An unresolved reference reads as `{ key, at: '[function]' }` otherwise, which tells a
    // reader nothing. Render it the way it was written in the spec.
    if (isStepRef(value)) {
      return value.path ? `ref('${value.key}').at('${value.path}')` : `ref('${value.key}')`;
    }

    if (typeof value === 'object') {
      const proto = Object.getPrototypeOf(value);
      const isPlain = proto === Object.prototype || proto === null;

      // Class instances (page objects, Buffers, locators) are named, not walked: their
      // internals are noise and can hold the whole page.
      if (!isPlain) return `[${value.constructor?.name ?? 'object'}]`;

      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          ALLOWED_KEYS.has(key)
            ? redact(item, depth + 1)
            : SENSITIVE_KEY.test(key)
              ? REDACTED
              : redact(item, depth + 1),
        ])
      );
    }

    return String(value);
  } catch {
    return '[unredactable]';
  }
}
