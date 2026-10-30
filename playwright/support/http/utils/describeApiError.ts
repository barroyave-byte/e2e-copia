import { redact } from 'playwright/framework/redact';

/**
 * Turns whatever a service call threw into a readable, redacted string for an error message.
 *
 * BaseHttpClient throws a plain `ApiError` object, so interpolating it with `${error}` printed
 * `[object Object]` and hid the status and code of the failure (e.g. a 502 from the gateway
 * read as "Register user failed: [object Object]"). Errors keep their usual `Error: message`
 * form, so wrapped messages read the same as before.
 */
export function describeApiError(error: unknown): string {
  if (error instanceof Error || typeof error !== 'object' || error === null) {
    return String(error);
  }
  return JSON.stringify(redact(error));
}
