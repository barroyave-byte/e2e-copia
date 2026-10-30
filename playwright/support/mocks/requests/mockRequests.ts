import { BrowserContext } from '@playwright/test';
import { mockRudderStack } from './rudderStack';
import { blockTransactionalEmails } from './blockTransactionalEmails';

export const mockRequests = async (context: BrowserContext) => {
  await context.route('**/*', async (route) => {
    await mockRudderStack(route);
  });

  // Registered after the catch-all so it takes precedence (Playwright runs the
  // most recently added matching handler first) and intercepts SES email sends.
  await blockTransactionalEmails(context);
};
