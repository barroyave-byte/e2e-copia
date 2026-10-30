import { ConsoleMessage, expect, FrameLocator, Locator, Page, Response } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import {
  formatAmountWithGrouping,
  formatAmountWithoutCurrency,
} from './admin/payment_link/utils/formatAmount';
import { MERCHANT_SESSION_STORAGE_KEY } from './admin/constants/commons';
import * as computedStyle from './helpers/computedStyle';

class Utils {
  capitalizeFirstLetter(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}

interface FillOptions {
  withoutSpaces?: boolean;
}

/**
 * Structure of the postMessage data received from iframe
 */
interface PostMessageData {
  event?: string;
  type?: string;
  data?: {
    metadata?: unknown;
  };
  metadata?: unknown;
}

/**
 * Return type for waitForPostMessageEvent
 */
interface PostMessageEventData<TMetadata = unknown> {
  event: string;
  metadata: TMetadata;
}

type BaseClickOptions = Parameters<Locator['click']>[0];
type ClickOptions = BaseClickOptions | { dispatchEvent?: boolean };

export class CommonsActions extends Utils {
  protected page: Page;

  constructor(page: Page) {
    super();
    this.page = page;
  }

  async clickAndVerifyLabel(element: Locator, label: Locator) {
    await this.ensureVisibleToClick(element);
    await this.page.waitForTimeout(500);
    await expect(label).toBeVisible();
  }

  async ensureVisibleToClick(
    element: Locator,
    iframe?: FrameLocator,
    errorMessage?: string,
    options?: {
      timeout?: number;
      visible?: boolean;
      force?: boolean;
    }
  ) {
    const targetElement = this.getLocator(element, iframe);
    await expect(targetElement, errorMessage).toBeVisible(options);
    await targetElement.waitFor({ state: 'visible' });
    await targetElement.click({ force: options?.force });
  }

  async ensureSelected(
    element: Locator,
    attribute: 'aria-checked' | 'aria-selected' | 'data-selected' = 'aria-checked'
  ) {
    const isSelected = (await element.getAttribute(attribute)) === 'true';
    if (!isSelected) {
      await this.ensureVisibleToClick(element, undefined, 'The element to select is not visible', {
        timeout: 40000,
      });
    }
  }

  async ensureNotVisible(element: Locator, iframe?: FrameLocator, errorMessage?: string) {
    const targetElement = this.getLocator(element, iframe);
    await expect(targetElement, errorMessage).toBeVisible({ visible: false });
  }

  async ensureVisible(
    element: Locator,
    options: { iframe?: FrameLocator; errorMessage?: string; timeout?: number }
  ) {
    const { iframe, errorMessage = undefined, timeout } = options;
    const targetElement = this.getLocator(element, iframe);

    if (timeout === undefined) {
      await expect(targetElement, errorMessage).toBeVisible();
    } else {
      await expect(targetElement, errorMessage).toBeVisible({ timeout });
    }
  }

  async ensureElementLoaderIsVisibleAndHidden(element: Locator, timeout: number = 20000) {
    try {
      await element.waitFor({ state: 'visible', timeout });
      await element.waitFor({ state: 'detached', timeout });
    } catch (e: unknown) {
      if (!(e instanceof Error) || e.name !== 'TimeoutError') throw e;
      const count = await element.count();
      if (count === 0) {
        console.warn(
          `[ensureElementLoaderIsVisibleAndHidden] loader already gone before observation — element: ${element}, timeout: ${timeout}ms`
        );
        return;
      }
      throw e;
    }
  }

  async isVisibleWithTimeout(
    locator: Locator,
    frame?: FrameLocator,
    timeout = 40000
  ): Promise<boolean> {
    const target = this.getLocator(locator, frame);
    try {
      await target.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async waitForConsoleMessage(
    messageExpected: string,
    optionsOrPredicate?: {
      predicate?: (consoleMessage: ConsoleMessage) => boolean | Promise<boolean>;
      timeout?: number;
    }
  ) {
    return this.page.waitForEvent('console', {
      predicate: (message) => message.text().includes(messageExpected),
      ...optionsOrPredicate,
    });
  }

  async isButtonEnabled(button: Locator) {
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  }

  async assertButtonIsDisabled(button: Locator) {
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  }

  removeSpaces(text: string) {
    return text.replace(/\s+/g, '');
  }

  async retryAction<T>(
    action: () => Promise<T>,
    condition: () => Promise<boolean>,
    maxRetries: number = 3,
    waitBetween: number = 1000
  ): Promise<T> {
    let lastResult: T;

    for (let i = 0; i < maxRetries; i++) {
      await this.page.waitForTimeout(waitBetween);
      lastResult = await action();

      if (await condition()) {
        return lastResult;
      }

      console.log(`🔄 Retry ${i + 1}/${maxRetries}`);
    }

    throw new Error(`Action failed after ${maxRetries} retries`);
  }

  async fillAndVerifyValue(locator: Locator, desc: string, options?: FillOptions) {
    await locator.fill(desc);
    const value = await locator.inputValue(); //TODO - check recommended way to expect value in input field (toHaveValue)

    if (options?.withoutSpaces) {
      expect(this.removeSpaces(value)).toBe(this.removeSpaces(desc));
      return;
    }

    expect(value).toBe(desc);
  }

  /**
   * Simulates typing into an input field, character by character, with a delay.
   * This can be used within an iframe or directly in the main page.
   *
   * @param {Locator} inputLocator - The locator for the input element.
   * @param {string} text - The string value to type into the input element.
   * @param {options} options - The options for the action. It can contain the following properties: iframe, delayPress.
   */
  async pressTextOnInput(
    inputLocator: Locator,
    text: string,
    options?: { iframe?: FrameLocator; delayPress?: number }
  ): Promise<void> {
    const elementLocator: Locator = this.getLocator(inputLocator, options?.iframe);
    await elementLocator.focus();
    for (const char of text) {
      await elementLocator.press(char, { delay: options?.delayPress ? options.delayPress : 0 });
    }
  }

  async clearInputField(inputLocator: Locator, iframe?: FrameLocator) {
    const locator = this.getLocator(inputLocator, iframe);
    await locator.clear();
  }

  async fillInputField(inputLocator: Locator, text: string, iframe?: FrameLocator) {
    const locator = this.getLocator(inputLocator, iframe);
    await locator.fill(text, { timeout: 50000 });
  }

  async waitForPostResponse(urlPattern: string, status: number): Promise<Response> {
    return this.page.waitForResponse(
      (response) => new RegExp(urlPattern).test(response.url()) && response.status() === status
    );
  }

  getLocator(inputLocator: Locator, iframe?: FrameLocator): Locator {
    return iframe ? iframe.locator(inputLocator) : inputLocator;
  }

  /**
   * Waits for a specific postMessage event to be emitted from an iframe to the parent window.
   * Only accepts messages from https://explore.dev.deuna.io for security.
   *
   * @param {string} eventName - The name of the event to listen for (e.g., 'vaultSaveSuccess', 'checkoutSuccess')
   * @param {object} options - Configuration options
   * @param {number} options.timeout - Maximum time to wait in milliseconds (default: 20000)
   * @returns {Promise<PostMessageEventData<TMetadata>>} - Resolves with the event name and metadata when the event is received
   * @throws {Error} - Throws if timeout is reached or if an unexpected error occurs
   *
   * @example
   * // Basic usage with default timeout
   * const eventPromise = commonActions.waitForPostMessageEvent('vaultSaveSuccess');
   * await paymentPage.clickOnPayButton();
   * const eventData = await eventPromise;
   *
   * @example
   * // With custom timeout
   * const eventData = await commonActions.waitForPostMessageEvent('checkoutSuccess', {
   *   timeout: 10000
   * });
   *
   * @example
   * // With typed metadata
   * const eventData = await commonActions.waitForPostMessageEvent<VaultMetadata>('vaultSaveSuccess');
   * console.log(eventData.metadata.userId); // TypeScript knows the type
   */
  async waitForPostMessageEvent<TMetadata = unknown>(
    eventName: string,
    options: {
      timeout?: number;
    } = {}
  ): Promise<PostMessageEventData<TMetadata>> {
    const { timeout = 20000 } = options;

    return this.page.evaluate(
      ({ targetEventName, timeoutMs }): Promise<PostMessageEventData<TMetadata>> => {
        return new Promise<PostMessageEventData<TMetadata>>((resolve, reject) => {
          let timeoutId: ReturnType<typeof setTimeout>;

          const cleanup = (handler: (event: MessageEvent) => void): void => {
            window.removeEventListener('message', handler);
            if (timeoutId) clearTimeout(timeoutId);
          };

          const messageHandler = (event: MessageEvent): void => {
            try {
              // Recursively parse JSON strings
              const deepParse = (input: unknown): unknown => {
                if (typeof input !== 'string') return input;
                try {
                  const parsed = JSON.parse(input);
                  return typeof parsed === 'string' ? deepParse(parsed) : parsed;
                } catch {
                  return input;
                }
              };

              const data = deepParse(event.data) as PostMessageData;
              const receivedEventName = data?.event ?? data?.type;

              // Check if the event matches
              if (receivedEventName === targetEventName) {
                cleanup(messageHandler);
                resolve({
                  event: receivedEventName,
                  metadata: (data.data?.metadata ?? {}) as TMetadata,
                });
              }
            } catch (error) {
              return;
            }
          };

          timeoutId = setTimeout(() => {
            cleanup(messageHandler);
            reject(
              new Error(
                `Timeout waiting for postMessage event '${targetEventName}' after ${timeoutMs}ms`
              )
            );
          }, timeoutMs);

          // Start listening
          window.addEventListener('message', messageHandler);
        });
      },
      {
        targetEventName: eventName,
        timeoutMs: timeout,
      }
    );
  }

  /**
   * Clicks an element. If dispatchEvent is true, dispatches a click event instead of using the click method.
   */
  async setMerchantSessionStorage(merchantId: string, targetPage?: Page): Promise<void> {
    const page = targetPage ?? this.page;
    await page.evaluate(({ key, value }) => window.sessionStorage.setItem(key, value), {
      key: MERCHANT_SESSION_STORAGE_KEY,
      value: merchantId,
    });
    await page.reload();
  }

  click(element: Locator, options?: ClickOptions): Promise<void> {
    if (options && 'dispatchEvent' in options && options.dispatchEvent) {
      return element.dispatchEvent('click');
    }
    return element.click(options as BaseClickOptions);
  }

  assertIsVisible(element: Locator, options?: Parameters<Locator['isVisible']>[0]) {
    return expect(element).toBeVisible(options);
  }

  assertIsNotVisible(element: Locator, options?: Parameters<Locator['isVisible']>[0]) {
    return expect(element).not.toBeVisible(options);
  }

  assertToBeAttached(element: Locator) {
    return expect(element).toBeAttached();
  }

  async typeFormattedAmount(
    locator: Locator,
    amount: number,
    languageCode: LanguageCodes,
    options?: { forceGrouping?: boolean }
  ): Promise<void> {
    const formattedAmount = options?.forceGrouping
      ? formatAmountWithGrouping(amount, languageCode)
      : formatAmountWithoutCurrency(amount, languageCode);

    // Seed with a 6-digit number so locales that omit the group separator for
    // 4-digit integers (e.g. 'es') still expose a 'group' part here.
    const groupSeparator = new Intl.NumberFormat(languageCode.toLowerCase())
      .formatToParts(111_111)
      .find((part) => part.type === 'group')?.value;
    const typingValue = groupSeparator
      ? formattedAmount.split(groupSeparator).join('')
      : formattedAmount;

    // The field can be repopulated with a stale default value by a late-resolving
    // async load right after we type (observed on repeated captures/refunds within
    // the same session — e.g. the modal refetching the remaining capturable amount),
    // silently overwriting what we just entered. Retry the whole type cycle instead
    // of failing outright if that race is caught, using a short per-attempt timeout
    // so a caught race retries quickly rather than stalling for the full timeout.
    await expect(async () => {
      await locator.clear();
      await locator.pressSequentially(typingValue);
      await expect(locator).toHaveValue(formattedAmount, { timeout: 3000 });
    }).toPass({ timeout: 40000 });
  }

  async waitForWidgetSkeletonToDisappear(timeout = 15000) {
    // The SDK renders .deuna-loader-container in the HOST PAGE (not inside the iframe).
    // useZoidContainer.ts calls loaderRef.current.remove() when paymentMethodsSelected /
    // loginStarted / checkoutFailed events fire from the widget.
    const loader = this.page.locator('.deuna-loader-container');
    try {
      // Wait for loader to appear first so we don't skip past it before it mounts
      await expect(loader).toBeAttached({ timeout: 5000 });
    } catch {
      // already gone or widget loaded so fast it never showed
    }
    await expect(loader).not.toBeAttached({ timeout });
  }

  // Shared by every widget page (previously duplicated per-class in
  // deunaNowPage.ts and vaultWidgetPage.ts — consolidated here so a fix only
  // has to happen once).
  async assertInputBorderColor(input: Locator, expectedHex: string, timeout?: number) {
    await computedStyle.assertInputBorderColor(input, expectedHex, timeout);
  }

  async assertDropdownBorderColor(dropdown: Locator, expectedHex: string, timeout?: number) {
    await computedStyle.assertDropdownBorderColor(dropdown, expectedHex, timeout);
  }
}
