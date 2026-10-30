import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import {
  MerchantResponse,
  MerchantApplicationResponse,
  MerchantApplicationData,
} from '@support/http/models/merchantAuth';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';

const MERCHANT_PAYLOAD = {
  country: 'MX' as CountryCodes,
  city: 'CDMX',
  name: 'Test Merchant',
  short_name: 'TM',
  timezone: 'America/Mexico_City',
  currency: 'MXN',
  managed_by_deuna: true,
} as const;

const MERCHANT_APPLICATION_DATA: MerchantApplicationData = {
  expire_at: 'DEV',
  is_sandbox: true,
  name: 'Excepte',
};

const USER_PAYLOAD = {
  email: EmailGenerator.generatePayerEmail(),
  first_name: 'Sebas',
  last_name: 'Catalan',
  phone: '+56972514910',
  identity_document: '162915134',
};

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantTokenSuperAdmin: string;
  let merchantConfigA: MerchantResponse;
  let merchantConfigB: MerchantResponse;
  let merchantApplicationConfigA: MerchantApplicationResponse;
  let merchantApplicationConfig: MerchantApplicationResponse;

  test(
    '@ENTP1-T2263 User existe en red publica A y no existe en red publica B',
    { tag: ['@preprod', '@checkout_ui', '@api', '@user_auth', '@team_payments_capabilities'] },
    async ({ userAuthService, merchantAuthService }) => {
      await test.step('Create merchant A', async () => {
        merchantTokenSuperAdmin = (await merchantAuthService.merchantLogin()).token;
        merchantConfigA = await merchantAuthService.createMerchant(MERCHANT_PAYLOAD);
        merchantApplicationConfigA = await merchantAuthService.createMerchantApplications({
          merchantId: merchantConfigA.id,
          merchantToken: merchantTokenSuperAdmin,
          merchantApplicationData: MERCHANT_APPLICATION_DATA,
        });
      });

      await test.step('Register user on merchant A', async () => {
        await userAuthService.registerUser({
          merchantId: merchantConfigA.id,
          merchantPrivateKey: merchantApplicationConfigA.private_key,
          data: {
            ...USER_PAYLOAD,
            merchant_id: merchantConfigA.id,
          },
        });
      });

      await test.step('Create merchant B', async () => {
        merchantConfigB = await merchantAuthService.createMerchant(MERCHANT_PAYLOAD);
        merchantApplicationConfig = await merchantAuthService.createMerchantApplications({
          merchantId: merchantConfigB.id,
          merchantToken: merchantTokenSuperAdmin,
          merchantApplicationData: MERCHANT_APPLICATION_DATA,
        });
      });

      await test.step('Generate public keys and external authorize', async () => {
        const { data: rawPublicKey } = await merchantAuthService.generetePublicKeys(
          merchantConfigB.id,
          merchantTokenSuperAdmin
        );
        const publicKey = rawPublicKey.replace(/\\n/g, '\n');
        const authMessage = await userAuthService.encryptMessage(USER_PAYLOAD.email, publicKey);
        await userAuthService.externalAuthorize(merchantApplicationConfig.private_key, authMessage);
      });
    }
  );
});
