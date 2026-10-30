import { test, expect } from '@support/fixtures';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { DEFAULT_VERIFY_CREDENTIALS_WORLDPAY } from '@support/http/testData/payment/VerifyCredentials';

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  test(
    '@ENTP1-T1854 Delete verifier processor',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService }) => {
      let verifierCredentialsId: string;
      let merchantToken: string;

      await test.step('Setup: Create merchant and verifier credentials', async () => {
        const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
        merchantToken = merchant.merchantToken;

        // Enable card verification
        const enableResponse = await paymentService.configurationMerchantPayments({
          merchantToken: merchant.merchantToken,
          merchantId: merchant.merchantId,
          storeId: 'all',
          configurationMerchantPaymentsData: {
            config_code: 'USE_CARD_VERIFICATION',
            config_value: 'ENABLED',
          },
        });
        expect(enableResponse.status).toBe(200);

        // Create verifier credentials
        const verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse> =
          await paymentService.createVerifierCredentials({
            merchantToken: merchant.merchantToken,
            verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_WORLDPAY,
          });
        expect(verifierCredentialsResponse.status).toBe(200);
        verifierCredentialsId = verifierCredentialsResponse.data.data.id.toString();
      });

      await test.step('Delete verifier credentials', async () => {
        const deleteResponse = await paymentService.deleteVerifierCredentials(
          merchantToken,
          verifierCredentialsId
        );
        expect(deleteResponse.status).toBe(204);
      });
    }
  );
});
