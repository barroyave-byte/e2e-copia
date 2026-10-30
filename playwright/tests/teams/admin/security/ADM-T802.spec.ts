/**
 * Groups @ADM-T802, @ADM-T803 and @ADM-T804 under a single serial describe.
 * This file runs in parallel with ADM-T799.spec.ts while preserving the order
 * of the reset and self-service MFA flows inside this group.
 */
import { test } from '@support/fixtures';
import { registerADMT802 } from './share/admT802';
import { registerADMT803 } from './share/admT803';
import { registerADMT804 } from './share/admT804';

test.describe.serial('@team_admin Admin 2FA security policies suite: reset flows', () => {
  registerADMT802();
  registerADMT803();
  registerADMT804();
});
