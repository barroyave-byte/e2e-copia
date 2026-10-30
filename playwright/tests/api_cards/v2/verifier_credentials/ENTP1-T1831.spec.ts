import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';
import { buildCardDataWithVerifyNull } from '@support/http/testData/user_card/CardDataBuilder';
import { faker } from '@faker-js/faker';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { DEFAULT_VERIFY_CREDENTIALS_AMEX } from '@support/http/testData/payment/VerifyCredentials';

let verifierCredentialsId: string;

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  let merchantToken: string;
  test(
    '@ENTP1-T1831 Create card si verifica tarjeta cuando se envia propiedad de verificacion de tarjetas null',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService, userAuthService }) => {
      let userId: string;
      let userToken: string;
      let configId: string;
      let merchantId: string;
      let privateKey: string;

      await test.step('Setup: Create merchant, enable verification and create credentials', async () => {
        const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        privateKey = merchant.privateKey;

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
        configId = enableResponse.data.id.toString();

        const verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse> =
          await paymentService.createVerifierCredentials({
            merchantToken: merchantToken,
            verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_AMEX,
          });
        expect(verifierCredentialsResponse.status).toBe(200);
        verifierCredentialsId = verifierCredentialsResponse.data.data.id.toString();
      });

      await test.step('Register user', async () => {
        const userData = {
          email: EmailGenerator.generatePayerEmail(),
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          phone: `+52${faker.string.numeric(10)}`,
          identity_document: faker.string.numeric(9),
        };

        const registerResponse = await userAuthService.registerUser({
          merchantPrivateKey: privateKey,
          merchantId: merchantId,
          data: userData,
        });
        userId = registerResponse.data.user_id;
        userToken = registerResponse.data.token;
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

      await test.step('Create card with verify_card=null - should VERIFY', async () => {
        const cardData = buildCardDataWithVerifyNull();
        const cardResponse = await userAuthService.setCard({
          userId: userId,
          userToken: userToken,
          data: cardData,
        });

        expect(cardResponse.status).toBe(201);
        expect(cardResponse.data.data.verified_by).toBe('');
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
