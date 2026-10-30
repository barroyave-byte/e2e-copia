import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';
import { VerifierCredentialsResponse } from '@support/http';
import { buildCardDataWithVerifyTrue } from '@support/http/testData/user_card/CardDataBuilder';
import { faker } from '@faker-js/faker';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { DEFAULT_VERIFY_CREDENTIALS_OPENPAY } from '@support/http/testData/payment/VerifyCredentials';

let verifierCredentialsId: string;
test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  test(
    '@ENTP1-T1834 Create card con propiedad de verificacion de tarjeta en payload request dado que merchant tiene habilitada configuracion pero no tiene procesador configurado',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService, userAuthService }) => {
      let merchantId: string;
      let merchantToken: string;
      let privateKey: string;
      let userId: string;
      let userToken: string;
      let configId: string;

      await test.step('Setup: Create merchant and enable verification WITHOUT credentials', async () => {
        const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        privateKey = merchant.privateKey;

        // Enable card verification but don't create credentials
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
            verifierCredentialsData: DEFAULT_VERIFY_CREDENTIALS_OPENPAY,
          });
        expect(verifierCredentialsResponse.status).toBe(200);
        verifierCredentialsId = verifierCredentialsResponse.data.data.id.toString();
      });

      await test.step('Pre-request: Disable card verification', async () => {
        const disableResponse = await paymentService.deleteVerifierCredentials(
          merchantToken,
          verifierCredentialsId
        );
        expect(disableResponse.status).toBe(204);
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

      await test.step('Create card - should NOT verify (no processor configured)', async () => {
        const cardData = buildCardDataWithVerifyTrue();
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
});
