import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';
import { buildCardDataWithInvalidVerify } from '@support/http/testData/user_card/CardDataBuilder';
import { faker } from '@faker-js/faker';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { DEFAULT_VERIFY_CREDENTIALS_UNLIMIT } from '@support/http/testData/payment/VerifyCredentials';

let verifierCredentialsId: string;

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  let merchantToken: string;
  test(
    '@ENTP1-T1835 Create card propiedad de verificacion de tarjetas tiene un valor distinto a un boolean value - true or false or null',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService, userAuthService }) => {
      let userId: string;
      let userToken: string;
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

        const verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse> =
          await paymentService.createVerifierCredentials({
            merchantToken: merchantToken,
            verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_UNLIMIT,
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

      await test.step('Create card with invalid verify_card value - should NOT verify', async () => {
        const cardData = buildCardDataWithInvalidVerify();
        const cardResponse = await userAuthService.setCard(
          {
            userId: userId,
            userToken: userToken,
            data: cardData,
          },
          true
        );

        expect(cardResponse.status).toBe(400);
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
