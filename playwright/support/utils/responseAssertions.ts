import { expect, type Response } from '@playwright/test';

/**
 * Asserts that an HTTP response returned a 2xx status.
 *
 * On failure, throws via `expect()` so the assertion is rendered natively in
 * the Playwright report. The error message embeds the full backend payload
 * (URL, method, status and pretty-printed body) so it is visible directly in
 * the report without opening any attachment.
 *
 * @param response - Response captured via `page.waitForResponse(...)`.
 * @param operationName - Short label used in the message (e.g. 'capture', 'void').
 */
export async function assertResponseOk(
  response: Response,
  operationName: 'capture' | 'void' | 'refund'
): Promise<void> {
  if (response.ok()) return;

  const message = await buildFailureMessage(response, operationName);
  expect(response.ok(), message).toBe(true);
}

async function buildFailureMessage(
  response: Response,
  operationName: string
): Promise<string> {
  const rawBody = await response.text().catch(() => '<unreadable body>');
  let formattedBody = rawBody;
  try {
    formattedBody = JSON.stringify(JSON.parse(rawBody), null, 2);
  } catch {
    // Body is not JSON — keep it as raw text.
  }

  return [
    `[${operationName}] Backend rejected the request`,
    `  URL:    ${response.url()}`,
    `  Method: ${response.request().method()}`,
    `  Status: ${response.status()} ${response.statusText()}`,
    `  Body:`,
    formattedBody,
  ].join('\n');
}
