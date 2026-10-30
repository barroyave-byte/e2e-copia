/**
 * Suite orchestrator for admin 2FA security policies.
 *
 * Groups @ADM-T799, @ADM-T800 and @ADM-T801 under a single serial describe.
 * The second MFA group lives in ADM-T802.spec.ts so Playwright can execute
 * both groups in parallel while preserving the order inside each group.
 */
import { test } from '@support/fixtures';
import { registerADMT799 } from './share/admT799';
import { registerADMT800 } from './share/admT800';
import { registerADMT801 } from './share/admT801';

test.describe.serial('Admin 2FA security policies suite: enrollment flows', () => {
  registerADMT799();
  registerADMT800();
  registerADMT801();
});
