import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';
import {
  buildCardDataWithoutVerifyCard,
  buildCardDataWithVerifyNull,
} from '@support/http/testData/user_card/CardDataBuilder';
import { faker } from '@faker-js/faker';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { DEFAULT_VERIFY_CREDENTIALS_STRIPE } from '@support/http/testData/payment/VerifyCredentials';

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  let merchantToken: string;
  let verifierCredentialsId: string;
  test(
    '@ENTP1-T1832 Create card no verifica tarjeta cuando se envia propiedad de verificacion de tarjetas en null pero merchant no configura verificacion de tarjetas - la pre-condicion 1 esta DISABLED o no existe registro',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService, userAuthService }) => {
      let merchantId: string;
      let privateKey: string;
      let userId: string;
      let userToken: string;
      let configId: string;

      await test.step('Setup: Create merchant WITHOUT verification config', async () => {
        const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        privateKey = merchant.privateKey;
      });

      const response = await paymentService.configurationMerchantPayments({
        merchantToken: merchantToken,
        merchantId: merchantId,
        storeId: 'all',
        configurationMerchantPaymentsData: {
          config_code: 'USE_CARD_VERIFICATION',
          config_value: 'DISABLED',
        },
      });
      expect(response.status).toBe(200);
      configId = response.data.id.toString();

      await test.step('Create verifier credentials', async () => {
        const verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse> =
          await paymentService.createVerifierCredentials({
            merchantToken: merchantToken,
            verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_STRIPE,
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

      await test.step('Create card with verifycards', async () => {
        const cardData = buildCardDataWithoutVerifyCard();
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
