import { EmailGenerator } from '@support/utils/EmailGenerator';
import { expect, test } from '@support/fixtures';

let privateKeyB: string;
let authMessage: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ merchantAuthService, userAuthService }) => {
    // Create merchant A and place it in private network A
    const merchantA = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    const networkA = await userAuthService.createNetwork({
      merchantToken: merchantA.merchantToken,
      data: { name: `network_${crypto.randomUUID()}`, is_private: true },
    });
    await userAuthService.addMerchantToNetwork({
      merchantToken: merchantA.merchantToken,
      network_id: networkA.id,
      merchant_id: merchantA.merchantId,
    });

    // Register user in merchant A (private network A)
    const email = EmailGenerator.generatePayerEmail();
    await userAuthService.registerUser({
      merchantPrivateKey: merchantA.privateKey,
      merchantId: merchantA.merchantId,
      data: {
        email,
        first_name: 'Sebas',
        last_name: 'Catalan',
        phone: '+56972514910',
        identity_document: '162915134',
        merchant_id: merchantA.merchantId,
      },
    });

    // Create merchant B in a separate private network B
    const merchantB = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    privateKeyB = merchantB.privateKey;

    const networkB = await userAuthService.createNetwork({
      merchantToken: merchantB.merchantToken,
      data: { name: `network_${crypto.randomUUID()}`, is_private: true },
    });
    await userAuthService.addMerchantToNetwork({
      merchantToken: merchantB.merchantToken,
      network_id: networkB.id,
      merchant_id: merchantB.merchantId,
    });

    // Generate RSA public key for merchant B and sign user email as auth message
    const publicKeyResult = await merchantAuthService.generetePublicKeys(
      merchantB.merchantId,
      merchantB.merchantToken
    );
    authMessage = await userAuthService.encryptMessage(email, publicKeyResult.data);
  });

  test(
    '@ENTP1-T2262 User existe en red privada A y no existe en red privada B',
    { tag: ['@preprod', '@checkout_ui', '@api', '@user_auth', '@team_payments_capabilities'] },
    async ({ userAuthService }) => {
      await test.step('The collection that complies with the steps required to validate the user registration is executed', async () => {
        const response = await userAuthService.externalAuthorize(privateKeyB, authMessage, true);
        expect(response.status).toBe(404);
        expect(response.data).toMatchObject({
          code: 'error.user_not_found',
          message: 'user not found',
        });
      });
    }
  );
});
