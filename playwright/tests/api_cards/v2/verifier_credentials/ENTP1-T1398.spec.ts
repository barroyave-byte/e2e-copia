import { test, expect } from '@support/fixtures';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';
import { DEFAULT_VERIFY_CREDENTIALS_TRANSBANK } from '@support/http/testData/payment/VerifyCredentials';

let verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse>;
let merchantConfig: BasicMerchantResult;

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  test(
    '@ENTP1-T1398 Verify Desactivar card verifier for merchant',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService }) => {
      await test.step('Create basic merchant', async () => {
        merchantConfig = await merchantAuthService.createBasicMerchantCheckout({ country: 'MX' });
      });

      await test.step('Verify active card verifier for merchant', async () => {
        const merchantPaymentsResponse = await paymentService.configurationMerchantPayments({
          merchantToken: merchantConfig.merchantToken,
          merchantId: merchantConfig.merchantId,
          storeId: 'all',
          configurationMerchantPaymentsData: {
            config_code: 'USE_CARD_VERIFICATION',
            config_value: 'ENABLED',
          },
        });
        expect(merchantPaymentsResponse.status).toBe(200);
        expect(merchantPaymentsResponse.data.config_value).toBe('ENABLED');
        expect(merchantPaymentsResponse.data.config_code).toBe('USE_CARD_VERIFICATION');
        expect(merchantPaymentsResponse.data.merchant_id).toBe(merchantConfig.merchantId);
        expect(merchantPaymentsResponse.data.store_id).toBe('all');
      });

      await test.step('Create verifier credentials', async () => {
        verifierCredentialsResponse = await paymentService.createVerifierCredentials({
          merchantToken: merchantConfig.merchantToken,
          verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_TRANSBANK,
        });
        expect(verifierCredentialsResponse.status).toBe(200);
      });
    }
  );

  test.afterAll(async ({ paymentService }) => {
    if (verifierCredentialsResponse) {
      const verifyId = verifierCredentialsResponse.data.data.id.toString();
      const deleteResponse = await paymentService.deleteVerifierCredentials(
        merchantConfig.merchantToken,
        verifyId
      );
      expect(deleteResponse.status).toBe(204);
    }
  });
});
