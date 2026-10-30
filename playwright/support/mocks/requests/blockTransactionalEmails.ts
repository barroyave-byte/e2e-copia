import { BrowserContext, Route } from '@playwright/test';

/**
 * Endpoints that trigger real outbound transactional emails through AWS SES.
 *
 * E2E tests frequently use random / faker / uuid email addresses. When those
 * addresses reach SES they hard-bounce, and a high bounce rate degrades the
 * sending reputation (and can get the account paused). We intercept these
 * requests before they leave the browser so the email is never actually sent,
 * while still returning a successful response so the UI flow keeps working.
 *
 * Opt-out: a test that genuinely needs the email to be delivered (e.g. it
 * reads the inbox afterwards) can remove a specific interception with, e.g.:
 *   await page.context().unroute(VOUCHER_EMAIL_GLOB);
 */

// POST /merchants/{merchantId}/orders/{orderId}/vouchers — "resend voucher" by email.
export const VOUCHER_EMAIL_GLOB = '**/orders/*/vouchers';

// POST /users/request-code?type=email-passwordless — passwordless login OTP by email.
export const OTP_REQUEST_CODE_GLOB = '**/users/request-code**';

// POST /hermes/merchants/users/notifications?type=email — merchant user invite by email.
export const HERMES_NOTIFICATION_GLOB = '**/hermes/merchants/users/notifications**';

const fulfillSilently = async (route: Route): Promise<void> => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, mockRequest: true }),
  });
};

const fulfillNotificationSent = async (route: Route): Promise<void> => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({"message": "Notification sent"}),
  });
};

const fulfillResendEmail = async (route: Route): Promise<void> => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({"message": "OK"}),
  });
};

export const blockTransactionalEmails = async (context: BrowserContext): Promise<void> => {
  // "Resend voucher" by email. The PDF download (GET ...?format=pdf) carries a
  // query string and won't match this glob, but we guard by method as well.
  await context.route(VOUCHER_EMAIL_GLOB, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await fulfillResendEmail(route);
  });

  // Passwordless OTP request. Only the email channel hits SES; the SMS channel
  // (type=sms-passwordless) and any non-POST are left untouched.
  await context.route(OTP_REQUEST_CODE_GLOB, async (route) => {
    const request = route.request();
    const isEmailChannel =
      new URL(request.url()).searchParams.get('type') === 'email-passwordless';

    if (request.method() !== 'POST' || !isEmailChannel) {
      await route.continue();
      return;
    }
    await fulfillSilently(route);
  });

  // Merchant user invite. Only the email channel hits SES.
  await context.route(HERMES_NOTIFICATION_GLOB, async (route) => {
    const request = route.request();
    const isEmailChannel = new URL(request.url()).searchParams.get('type') === 'email';

    if (request.method() !== 'POST' || !isEmailChannel) {
      await route.continue();
      return;
    }
    await fulfillNotificationSent(route);
  });
};
