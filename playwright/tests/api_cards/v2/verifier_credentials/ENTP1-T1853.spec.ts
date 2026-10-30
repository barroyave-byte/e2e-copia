import { test, expect } from '@support/fixtures';
import { DEFAULT_VERIFY_CREDENTIALS_NUVEI } from '@support/http/testData/payment/VerifyCredentials';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';

let verifierCredentialsId: string;
let configId: string;
let merchantId: string;
let merchantToken: string;
test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  test(
    '@ENTP1-T1853 Desactivar card verifier for merchant',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService }) => {
      await test.step('Setup: Create merchant and enable verification', async () => {
        const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;

        // First enable verification
        const enableResponse = await paymentService.configurationMerchantPayments({
          merchantToken: merchantToken,
          merchantId: merchantId,
          storeId: 'all',
          configurationMerchantPaymentsData: {
            config_code: 'USE_CARD_VERIFICATION',
            config_value: 'ENABLED',
          },
        });
        expect(enableResponse.status).toBe(200);
        expect(enableResponse.data.config_value).toBe('ENABLED');
        configId = enableResponse.data.id.toString();
      });

      await test.step('Create verifier credentials', async () => {
        const verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse> =
          await paymentService.createVerifierCredentials({
            merchantToken: merchantToken,
            verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_NUVEI,
          });
        expect(verifierCredentialsResponse.status).toBe(200);
        verifierCredentialsId = verifierCredentialsResponse.data.data.id.toString();
      });

      await test.step('Pre-request: Disable card verification', async () => {
        const disableResponse = await paymentService.deleteConfigMerchantPayments(
          merchantToken,
          merchantId,
          configId,
          'all'
        );
        expect(disableResponse.status).toBe(200);
      });
    }
  );

  test.afterAll(async ({ paymentService }) => {
    if (verifierCredentialsId) {
      const deleteResponse = await paymentService.deleteVerifierCredentials(
        merchantToken,
        verifierCredentialsId
      );
      expect(deleteResponse.status).toBe(204);
    }
  });
});
