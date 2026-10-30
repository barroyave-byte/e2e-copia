import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

test.describe('@regression Register User.', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@ENTP1-T2216 Validar se permita registrar usuario con numero celular de Ecuador correcto',
    { tag: ['@preprod', '@checkout_ui', '@api', '@user_auth', '@team_payments_capabilities'] },
    async ({ userAuthService }) => {
      await userAuthService.registerUser({
        merchantPrivateKey: privateKey,
        merchantId: merchantId,
        data: {
          email: `${faker.string.uuid()}@gmail.com`,
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          phone: `+593${faker.phone.number()}`,
          identity_document: '1722146485',
        },
      });
    }
  );
});
