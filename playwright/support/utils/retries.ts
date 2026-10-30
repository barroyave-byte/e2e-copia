import { Locator, Page, expect } from '@playwright/test';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { TransactionVisibilityService } from '@support/utils/getTransactionVisibility';
import { EmailInboxParams } from './MessageFeed';
import { EmaService } from '@support/http/services/EmaService';
import { ProcessorCreationError } from '@support/http/services/PaymentService';
import { FraudDecision, FraudProcessStatus, RiskLevel } from '@support/interfaces/riskOption';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { Fraud } from '@support/http/models/order';
import { getPostAuthorizationFlow } from '@support/request_helper/requestUtil';

export async function retryOperation(
  page: Page,
  elementLocator: Locator,
  maxRetries: number = 3,
  retryDelay: number = 4000
): Promise<void> {
  let attempts = 0;
  let isVisible = false;

  while (attempts < maxRetries && !isVisible) {
    try {
      await expect(elementLocator).toBeVisible({ timeout: retryDelay });
      isVisible = true;
    } catch (error) {
      console.log(
        `[INFO] --> Attempt ${attempts + 1}/${maxRetries} failed getting element ${elementLocator}. Retrying after ${retryDelay}ms...`
      );
      await page.waitForTimeout(retryDelay);
      const orderWaitResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/merchants/orders/') &&
          response.status() === 200 &&
          response.request().method() === 'GET'
      );
      await page.reload();
      await orderWaitResponse;
    }
    attempts++;
  }

  if (!isVisible) {
    throw new Error(`Element not visible after ${maxRetries} attempts`);
  }
}

export async function retryOperationWithAction(
  page: Page,
  elementLocator: Locator,
  maxRetries: number = 3,
  retryDelay: number = 4000,
  action: () => Promise<void>
): Promise<void> {
  let attempts = 0;
  let isVisible = false;

  while (attempts < maxRetries && !isVisible) {
    try {
      await expect(elementLocator).toBeVisible({ timeout: retryDelay });
      isVisible = true;
    } catch (error) {
      console.log(
        `[INFO] --> Attempt ${attempts + 1}/${maxRetries} failed. Retrying after ${retryDelay}ms...`
      );
      await page.waitForTimeout(retryDelay);
      await action();
    }
    attempts++;
  }

  if (!isVisible) {
    throw new Error(`Element not visible after ${maxRetries} attempts`);
  }
}

export async function retryOperationReloadWithAction(
  page: Page,
  elementLocator: Locator,
  maxRetries: number = 3,
  retryDelay: number = 4000,
  action: () => Promise<void>
): Promise<void> {
  let attempts = 0;
  let isVisible = false;

  while (attempts < maxRetries && !isVisible) {
    try {
      await expect(elementLocator).toBeVisible({ timeout: retryDelay });
      isVisible = true;
    } catch (error) {
      console.log(
        `[INFO] --> Attempt ${attempts + 1}/${maxRetries} failed. Retrying after ${retryDelay}ms...`
      );
      await page.waitForTimeout(retryDelay);
      await page.reload();
      await action();
    }
    attempts++;
  }

  if (!isVisible) {
    throw new Error(`Element not visible after ${maxRetries} attempts`);
  }
}

export async function retryTransactionPaymentStatus(
  paymentStatus: OrderStatusTypes,
  privateKey: string,
  orderToken: string,
  maxRetries: number = 10,
  retryDelay: number = 3000
): Promise<void> {
  let retries = 0;
  let paymentStatusGetOrder = '';

  while (retries < maxRetries) {
    const orderData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    paymentStatusGetOrder = orderData.orderStatus;
    console.log(
      `[INFO] ----> Attempt ${retries + 1}: ${paymentStatusGetOrder} is the payment status in request get order`
    );

    if (paymentStatusGetOrder === paymentStatus) {
      break;
    }

    retries++;
    if (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  expect(paymentStatusGetOrder).toBe(paymentStatus);
}

export async function retryGetClickToPayEmailOTP(
  getOtpFn: (params: EmailInboxParams) => Promise<string | null>,
  params: EmailInboxParams,
  maxRetries: number = 5,
  retryDelay: number = 3000
): Promise<string> {
  let attempts = 0;
  let otp: string | null = null;

  while (attempts < maxRetries) {
    otp = await getOtpFn(params);
    if (otp) {
      return otp;
    }
    attempts++;
    console.log(
      `[INFO] OTP not found. Attempt ${attempts}/${maxRetries}. Retrying in ${retryDelay}ms...`
    );
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  throw new Error(`OTP not received after ${maxRetries} attempts.`);
}

/**
 * Retries `getOtp` up to `maxRetries` times. On each failure (email never arrived
 * in the MailSlurp inbox within the configured timeout) it calls `reRequest` to
 * re-trigger the OTP send before trying again.
 *
 * Use this instead of a bare `getDeunaCheckoutEmailOTP` call whenever SES delivery
 * to the MailSlurp inbox can be delayed beyond the single-attempt timeout — which
 * is an intermittent staging infrastructure issue, not a test logic failure.
 */
export async function retryGetDeunaCheckoutEmailOTP(
  getOtp: (params: EmailInboxParams) => Promise<string>,
  params: EmailInboxParams,
  reRequest: () => Promise<void>,
  maxRetries: number = 2
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getOtp(params);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(
        `[INFO] retryGetDeunaCheckoutEmailOTP --> OTP email not received (attempt ${attempt}/${maxRetries}), re-requesting...`
      );
      await reRequest();
    }
  }
  throw new Error('retryGetDeunaCheckoutEmailOTP: unreachable');
}

/**
 * Calls getValueByPath and retries until a valid result is found or maximum retries are reached.
 * If the result is empty (or undefined), it waits for the specified time and retries.
 *
 * @param orderId - Transaction identifier to query.
 * @param jsonPathQuery - Query in JSONPath format.
 * @param waitTime - Time in milliseconds to wait between retries.
 * @param maxRetries - Maximum number of retries.
 * @param page - Playwright Page instance to use for waitForTimeout.
 * @returns The result found from executing the query, or undefined if not found.
 */
export async function getValueByPathWithRetry(
  page: Page,
  orderId: string,
  jsonPathQuery: string,
  merchantId: string,
  merchantToken: string,
  waitTime: number = 2000,
  maxRetries: number = 5
): Promise<any> {
  let attempts = 0;
  let result: any = undefined;
  const transactionVisibilityService = new TransactionVisibilityService();

  while (attempts < maxRetries) {
    result = await transactionVisibilityService.getValueByPath(
      orderId,
      jsonPathQuery,
      merchantId,
      merchantToken
    );

    // Check if the result is not undefined or null, and if it's an array, ensure it's not empty.
    if (result !== undefined && result !== null && (!Array.isArray(result) || result.length > 0)) {
      return result;
    }

    attempts++;
    console.log(
      `Attempt ${attempts} did not return a valid result. Retrying after ${waitTime} ms.`
    );
    await page.waitForTimeout(waitTime);
  }

  console.warn(`No valid result found after ${maxRetries} retries.`);
  return result;
}

/**
 * Generic polling helper: re-executes `fn` until `predicate(result)` is true or
 * `maxRetries` is reached. Always returns the last result so the caller can run
 * its own assertions (and get a clear diff) when the predicate never holds.
 *
 * @param fn - Async producer to invoke on each attempt.
 * @param predicate - Returns true when the result is acceptable.
 * @param maxRetries - Maximum number of attempts (default: 7).
 * @param retryDelay - Milliseconds to wait between attempts (default: 2000).
 * @param waitForRetry - Optional wait strategy, such as Playwright's page.waitForTimeout.
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  maxRetries: number = 7,
  retryDelay: number = 2000,
  waitForRetry?: (delay: number) => Promise<void>
): Promise<T> {
  let result: T = await fn();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (predicate(result)) {
      return result;
    }

    if (attempt === maxRetries) {
      break;
    }

    console.log(
      `[INFO] retryUntil --> Attempt ${attempt}/${maxRetries} did not satisfy predicate. Retrying in ${retryDelay}ms...`
    );
    if (waitForRetry) {
      await waitForRetry(retryDelay);
    } else {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    result = await fn();
  }

  return result;
}

const PENDING_MOVEMENTS_CODE = 'DP-6008';
/**
 * Matches the 409 conflict status whether it appears as the processor wording
 * ("status code: 409") or as an HTTP status field in a serialized response
 * ("status": 409 / "status":409 / status: 409). The required `status`/`code`
 * prefix and the trailing word boundary keep it from matching unrelated numbers
 * (amounts, order ids, timestamps) that merely contain "409".
 */
const CONFLICT_STATUS_PATTERN = /status(?:\s*code)?["']?\s*[:=]\s*["']?409\b/i;

/**
 * Detects the transient conflict a processor raises when an operation runs
 * against a transaction whose movements are still pending (e.g. a MercadoPago
 * refund issued right after a capture). The platform surfaces it as an HTTP 422
 * with error code DP-6008 and a description ending in "status code: 409", so we
 * key off those stable markers instead of a bare "409" substring, which would
 * also match amounts, order ids or timestamps that happen to contain "409".
 */
function isPendingMovementsConflict(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes(PENDING_MOVEMENTS_CODE) || CONFLICT_STATUS_PATTERN.test(error.message)
  );
}

/**
 * Retries an API call when the response signals a transient "pending movements"
 * conflict. Useful for operations that may temporarily fail right after a
 * previous movement (e.g. MercadoPago refunds returning "status code: 409").
 * Any other error is re-thrown immediately so real failures are not masked.
 *
 * @param apiCall - Async function to execute and retry.
 * @param maxRetries - Maximum number of retry attempts (default: 5).
 * @param retryDelay - Milliseconds to wait between retries (default: 10000).
 */
export async function retryOn409<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 5,
  retryDelay: number = 10000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (!isPendingMovementsConflict(error)) {
        throw error;
      }

      lastError = error;
      console.log(
        `[INFO] retryOn409 --> Attempt ${attempt}/${maxRetries} got a pending-movements conflict. Retrying in ${retryDelay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError;
}

/**
 * PayPal rejects a processor when its app already has 10 webhooks: the API answers HTTP 200 with
 * `DP-9999` and this reason in the description. DP-9999 alone is a generic code, so the reason
 * is what identifies the case.
 */
function isWebhookLimitError(error: unknown): boolean {
  return (
    error instanceof ProcessorCreationError &&
    error.code === 'DP-9999' &&
    (error.description?.includes('WEBHOOK_NUMBER_LIMIT_EXCEEDED') ?? false)
  );
}

/**
 * Retries a PayPal processor creation while PayPal rejects it for webhook capacity. Each PayPal
 * processor registers one webhook and the app allows 10, shared by every environment
 * (docs/paypal-webhook-slots.md): another spec frees a slot when its afterAll deletes its
 * processor, in under a minute (run 40102923682). Any other error is re-thrown immediately.
 *
 * The default waits 90 s at most per creation: PI-T2005 creates two PayPal processors in one
 * beforeAll, and both waits must fit in the 4-minute hook timeout.
 *
 * @param createProcessor - The processor creation to execute and retry.
 * @param maxAttempts - Maximum number of attempts (default: 7).
 * @param retryDelay - Milliseconds to wait between attempts (default: 15000).
 */
export async function retryOnWebhookLimit<T>(
  createProcessor: () => Promise<T>,
  maxAttempts: number = 7,
  retryDelay: number = 15000
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await createProcessor();
    } catch (error) {
      if (!isWebhookLimitError(error)) {
        throw error;
      }
      if (attempt === maxAttempts) {
        const waited = ((maxAttempts - 1) * retryDelay) / 1000;
        throw new Error(
          `No PayPal webhook slot was freed in ${waited}s: ${(error as Error).message}`
        );
      }
      console.log(
        `[INFO] retryOnWebhookLimit --> Attempt ${attempt}/${maxAttempts} found no free PayPal webhook slot. Retrying in ${retryDelay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  validationFn: (result: T) => boolean,
  maxRetries: number = 5,
  retryDelay: number = 3000
): Promise<T> {
  let attempts = 0;
  let result: T;

  while (attempts < maxRetries) {
    try {
      result = await apiCall();
      if (validationFn(result)) {
        console.log(`[INFO] API call successful after ${attempts + 1} attempts.`);
        return result;
      }
    } catch (error) {
      console.error(`[ERROR] API call failed on attempt ${attempts + 1}:`, error);
    }

    attempts++;
    if (attempts < maxRetries) {
      console.log(
        `[INFO] API call attempt ${attempts}/${maxRetries} failed validation. Retrying in ${retryDelay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    } else {
      console.log('[INFO] Max retries reached.');
    }
  }

  throw new Error(`API call did not return a valid result after ${maxRetries} attempts.`);
}

export async function retryGetOrderStatus(
  emaService: EmaService,
  privateKey: string,
  orderToken: string,
  expectedStatus: OrderStatusTypes,
  maxRetries: number = 15,
  retryDelay: number = 3000
): Promise<void> {
  let currentStatus = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await emaService.getOrder(privateKey, orderToken);
    currentStatus = response.data.order.payment.data.status;

    if (currentStatus === expectedStatus) {
      break;
    }

    console.log(
      `[INFO] Attempt ${attempt}/${maxRetries}: status is "${currentStatus}", expected "${expectedStatus}". Retrying in ${retryDelay}ms...`
    );

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  expect(currentStatus).toBe(expectedStatus);
}

export async function retryGetFraudProcessStatus(
  emaService: EmaService,
  privateKey: string,
  orderToken: string,
  expectedFraudStatus: FraudProcessStatus,
  maxRetries: number = 10,
  retryDelay: number = 5000
): Promise<void> {
  let currentFraudStatus = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await emaService.getOrder(privateKey, orderToken);
    currentFraudStatus = String(response?.data?.order?.fraud?.status ?? '');

    if (currentFraudStatus.includes(expectedFraudStatus)) {
      break;
    }

    console.log(
      `[INFO] Attempt ${attempt}/${maxRetries}: fraud status is ${currentFraudStatus}, expected to contain ${expectedFraudStatus}. Retrying in ${retryDelay}ms...`
    );

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  expect(currentFraudStatus).toContain(expectedFraudStatus);
}

/**
 * Polls GET Order until the fraud engine has written its analysis, and returns the whole
 * fraud object.
 *
 * Sits next to `retryGetFraudProcessStatus` and `retryGetFraudDecision`, which wait for a
 * *specific* fraud value. Neither fits a flow whose analysis is expected to arrive with some
 * of its fields empty — there is no target value to wait for, only the object itself. Unlike
 * its siblings it asserts nothing: the caller owns the assertion, so a never-arriving
 * analysis fails with the caller's message instead of a generic one from here.
 */
export async function retryGetFraudAnalysis(
  emaService: EmaService,
  privateKey: string,
  orderToken: string,
  maxRetries: number = 10,
  retryDelay: number = 3000
): Promise<Fraud | undefined> {
  let fraud: Fraud | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await emaService.getOrder(privateKey, orderToken);
    fraud = response?.data?.order?.fraud;

    if (fraud?.analysis) {
      return fraud;
    }

    console.log(
      `[INFO] Attempt ${attempt}/${maxRetries}: fraud analysis not ready yet. Retrying in ${retryDelay}ms...`
    );

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return fraud;
}

export async function retryGetFraudDecision(
  emaService: EmaService,
  privateKey: string,
  orderToken: string,
  expected: {
    processor: ConnectionsAvailable;
    risk: RiskLevel;
    decision: FraudDecision;
  },
  maxRetries: number = 10,
  retryDelay: number = 5000
): Promise<any> {
  const toComparableString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value) ?? '';
    } catch {
      return String(value);
    }
  };

  let lastAnalysis: any;
  let processorValue = '';
  let riskValue = '';
  let decisionValue = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await emaService.getOrder(privateKey, orderToken);
    lastAnalysis = response?.data?.order?.fraud?.analysis;

    if (!lastAnalysis) {
      processorValue = '';
      riskValue = '';
      decisionValue = '';

      console.log(
        `[INFO] Attempt ${attempt}/${maxRetries}: fraud analysis not ready yet. Retrying in ${retryDelay}ms...`
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
    }

    processorValue = toComparableString(lastAnalysis?.processor);
    riskValue = toComparableString(lastAnalysis?.risk_level);
    decisionValue = toComparableString(lastAnalysis?.fraud_decision);

    const isValid =
      processorValue.includes(String(expected.processor)) &&
      riskValue.includes(String(expected.risk)) &&
      decisionValue.includes(String(expected.decision));

    if (isValid) {
      return lastAnalysis;
    }

    console.log(
      `[INFO] Attempt ${attempt}/${maxRetries}: fraud decision not ready. processor=${processorValue} risk=${riskValue} decision=${decisionValue}. Retrying in ${retryDelay}ms...`
    );

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  expect(processorValue).toContain(expected.processor);
  expect(riskValue).toContain(expected.risk);
  expect(decisionValue).toContain(expected.decision);
  return lastAnalysis;
}

export async function retryGetFraudProcessor(
  emaService: EmaService,
  privateKey: string,
  orderToken: string,
  expectedProcessor: ConnectionsAvailable,
  maxRetries: number = 10,
  retryDelay: number = 5000
): Promise<void> {
  let fraudProcessor = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await emaService.getOrder(privateKey, orderToken);
    fraudProcessor = (response?.data?.order?.fraud as any)?.analysis?.processor ?? '';

    if (fraudProcessor) break;

    console.log(
      `[INFO] Attempt ${attempt}/${maxRetries}: fraud processor not ready yet. Retrying in ${retryDelay}ms...`
    );

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  expect(fraudProcessor).toContain(expectedProcessor);
}

/**
 * Waits until guard has recorded every expected event for the order in the
 * QA_VERIFY_POST_AUTHORIZATION Metabase query, and returns that response.
 *
 * Two reasons this cannot be a single read:
 *   - Guard writes the `transaction` event asynchronously after the purchase, so a read right
 *     after paying can still return only `create_order`.
 *   - Inside the test runner a request context has no timeout of its own (it inherits
 *     actionTimeout, unset in this repo), and a Metabase query occasionally never answers.
 *     Each attempt is bounded by `attemptTimeout` so a hung query is retried instead of
 *     consuming the whole test timeout.
 *
 * Only the presence of the events is polled; the caller asserts their values once, so a
 * wrong value fails immediately instead of being retried until the deadline.
 */
export async function retryGetPostAuthorizationEvents(
  orderId: string,
  expectedEvents: string[],
  { timeout = 60_000, attemptTimeout = 15_000 }: { timeout?: number; attemptTimeout?: number } = {}
) {
  let response: Awaited<ReturnType<typeof getPostAuthorizationFlow>>;
  await expect(async () => {
    response = await getPostAuthorizationFlow(orderId, attemptTimeout);
    const recordedEvents = (response.body?.data?.rows ?? []).map((row: unknown[]) => row[2]);
    expect(recordedEvents, `guard events recorded for order ${orderId}`).toEqual(
      expect.arrayContaining(expectedEvents)
    );
  }).toPass({ intervals: [2_000, 3_000, 5_000], timeout });
  return response!;
}
