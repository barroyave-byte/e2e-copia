import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';

import envConfig from '@support/envConfig';
import { faker } from '@faker-js/faker';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { DEFAULT_VERIFY_CREDENTIALS_WOMPI } from '@support/http/testData/payment/VerifyCredentials';

const urlApi = envConfig.BASE_URL_POSTMAN;
let verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse>;

const body_register_user = {
  email: EmailGenerator.generatePayerEmail(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  phone: `+57${faker.string.numeric(10)}`,
  identity_document: faker.string.numeric(9),
};

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  let merchantToken: string;
  test(
    '@ENTP1-T1399 Verify credentials created',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService }) => {
      let merchantId: string;

      await test.step('Create basic merchant', async () => {
        const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
      });

      await test.step('Verify active card verifier for merchant', async () => {
        const merchantPaymentsResponse = await paymentService.configurationMerchantPayments({
          merchantToken: merchantToken,
          merchantId: merchantId,
          storeId: 'all',
          configurationMerchantPaymentsData: {
            config_code: 'USE_CARD_VERIFICATION',
            config_value: 'ENABLED',
          },
        });
        expect(merchantPaymentsResponse.status).toBe(200);
        expect(merchantPaymentsResponse.data.config_value).toBe('ENABLED');
        expect(merchantPaymentsResponse.data.config_code).toBe('USE_CARD_VERIFICATION');
        expect(merchantPaymentsResponse.data.merchant_id).toBe(merchantId);
        expect(merchantPaymentsResponse.data.store_id).toBe('all');
      });

      await test.step('Create verifier credentials', async () => {
        verifierCredentialsResponse = await paymentService.createVerifierCredentials({
          merchantToken: merchantToken,
          verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_WOMPI,
        });
        expect(verifierCredentialsResponse.status).toBe(200);
      });

      await test.step('Enable credentials for country', async () => {
        const response = await paymentService.enableVerifierCredentials(
          merchantToken,
          verifierCredentialsResponse.data.data.id.toString()
        );
        expect(response.status).toBe(204);
      });
    }
  );

  test.afterAll(async ({ paymentService }) => {
    if (verifierCredentialsResponse) {
      const verifyId = verifierCredentialsResponse.data.data.id.toString();
      const deleteResponse = await paymentService.deleteVerifierCredentials(
        merchantToken,
        verifyId
      );
      expect(deleteResponse.status).toBe(204);
    }
  });
});
