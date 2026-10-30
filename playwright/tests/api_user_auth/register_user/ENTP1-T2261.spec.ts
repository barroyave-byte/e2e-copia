import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';

let privateKeyB: string;
let authMessage: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ merchantAuthService, userAuthService }) => {
    // Create merchant A (public network) and register a user on it
    const merchantA = await merchantAuthService.createBasicMerchant({ country: 'MX' });
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

    // Create merchant B and set up a private network
    const merchantB = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    privateKeyB = merchantB.privateKey;

    const networkName = `network_${crypto.randomUUID()}`;
    const network = await userAuthService.createNetwork({
      merchantToken: merchantB.merchantToken,
      data: { name: networkName, is_private: true },
    });
    await userAuthService.addMerchantToNetwork({
      merchantToken: merchantB.merchantToken,
      network_id: network.id,
      merchant_id: merchantB.merchantId,
    });

    // Generate PEM public key for merchant B to sign the auth message
    const publicKeyResult = await merchantAuthService.generetePublicKeys(
      merchantB.merchantId,
      merchantB.merchantToken
    );
    authMessage = await userAuthService.encryptMessage(email, publicKeyResult.data);
  });

  test(
    '@ENTP1-T2261 User existe en red publica A y no existe en red privada B',
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
