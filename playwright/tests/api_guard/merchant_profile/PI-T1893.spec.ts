import { test, expect } from '@support/fixtures';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';

let merchantToken: string;
let merchantId: string;
let merchantName: string;
test.describe('@regression Api Guard Merchant Profile', () => {
  test(
    '@PI-T1893 Error en objeto processor vacio',
    { tag: ['@preprod', '@checkout_configuration', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, guardService }) => {
      await test.step('Create merchant setup config', async () => {
        const merchantLoginResponse = await merchantAuthService.merchantLogin({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        merchantToken = merchantLoginResponse.token;
      });

      await test.step('Send empty body merchant profile and expect error', async () => {
        const response = await guardService.createFraudProcessor(
          merchantToken,
          merchantId,
          merchantName,
          {},
          true
        );

        expect(response.status).toBe(400);
      });
    }
  );
});
