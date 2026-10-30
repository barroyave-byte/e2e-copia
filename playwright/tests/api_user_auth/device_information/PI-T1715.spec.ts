import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test } from '@support/fixtures';
import * as validationUserDevice from '@support/interfaces/user_device';

test.describe('@regression Get user device information', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PI-T1715 Identificar dispositivo de usuario fallido por session no encontrada de Sift',
    { tag: ['@preprod', '@authorization', '@user_auth', '@team_payments_capabilities'] },
    async ({ page }) => {
      await test.step('Validates error when user device session information was not found', async () => {
        const invalidSessionID = 'invalid-session-id';

        await apiCallNewman.getUserDeviceInformation(
          invalidSessionID,
          validationUserDevice.errorUserDeviceNotFound(invalidSessionID),
          privateKey,
          merchantId
        );
      });
    }
  );
});
