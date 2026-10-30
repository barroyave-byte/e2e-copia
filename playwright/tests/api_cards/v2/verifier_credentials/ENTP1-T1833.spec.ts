import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';
import { buildCardDataWithoutVerifyCard } from '@support/http/testData/user_card/CardDataBuilder';
import { faker } from '@faker-js/faker';
import { VerifierCredentialsResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { DEFAULT_VERIFY_CREDENTIALS_MERCADOPAGO } from '@support/http/testData/payment/VerifyCredentials';

let verifierCredentialsId: string;

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  let merchantToken: string;
  test(
    '@ENTP1-T1833 Create card sin propiedad de verificacion de tarjeta en el payload request',
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

        await test.step('Enable verification', async () => {
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
        });

        await test.step('Create verifier credentials', async () => {
          const verifierCredentialsResponse: ApiResponse<VerifierCredentialsResponse> =
            await paymentService.createVerifierCredentials({
              merchantToken: merchantToken,
              verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_MERCADOPAGO,
            });
          expect(verifierCredentialsResponse.status).toBe(200);
          verifierCredentialsId = verifierCredentialsResponse.data.data.id.toString();
        });
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

      await test.step('Create card without verify_card property - should VERIFY', async () => {
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
