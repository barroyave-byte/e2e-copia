import { expect, test } from '@support/fixtures';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';
import { MerchantConfigByCountry } from '@support/http/testData/merchant_auth/MerchantConfigByCountry';
import { SiftAntiFraudProcessor } from '@support/http/testData/guard/AntiFraudProcessors';

let merchantToken: string;
let merchantId: string;
let merchantName: string;

test.describe('@regression Api Guard Merchant Profile', () => {
  test(
    '@PI-T1898 Obtener proveedores de fraude',
    { tag: ['@preprod', '@checkout_configuration', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, guardService }) => {
      await test.step('Create merchant setup config', async () => {
        const merchantLoginResponse = await merchantAuthService.merchantLogin({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        merchantToken = merchantLoginResponse.token;

        const merchantResponse = await merchantAuthService.createMerchant(
          MerchantConfigByCountry.createMerchantRequest('MX')
        );
        merchantId = merchantResponse.id;
        merchantName = merchantResponse.name;
      });

      await test.step('Send merchant profile and expect success', async () => {
        const response = await guardService.createFraudProcessor(
          merchantToken,
          merchantId,
          merchantName,
          SiftAntiFraudProcessor,
          false
        );
        expect(response.status).toBe(200);
      });

      await test.step('Obtener proveedores de fraude', async () => {
        const response = await guardService.getFraudProcessor(merchantToken, merchantId);
        expect(response.status).toBe(200);
      });
    }
  );
});
