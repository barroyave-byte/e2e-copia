import { Page } from '@playwright/test';

/**
 * Resolves `true` as soon as a matching console message arrives, `false` if none does within
 * `timeout`. It used to listen for a fixed 5 s window, so a widget that took longer to load
 * (ENTP1-T2105: the vault iframe document still pending at 5 s) read as "message never logged".
 */
export const waitForConsoleMessage = async (
  page: Page,
  messageType: 'error' | 'log',
  expectedText: string,
  timeout: number = 30_000
): Promise<boolean> =>
  page
    .waitForEvent('console', {
      predicate: (msg) => msg.type() === messageType && msg.text().includes(expectedText),
      timeout,
    })
    .then((msg) => {
      console.log(`Found the expected console ${messageType}:`, msg.text());
      return true;
    })
    .catch(() => false);

export const waitForConsoleError = (errorText: string, page: Page) =>
  waitForConsoleMessage(page, 'error', errorText);

export const waitForConsoleLog = (text: string, page: Page) =>
  waitForConsoleMessage(page, 'log', text);
