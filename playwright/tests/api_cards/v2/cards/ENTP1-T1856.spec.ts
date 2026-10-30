import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test, expect } from '@support/fixtures';
import { faker } from '@faker-js/faker';

const body_register_user = {
  email: EmailGenerator.generatePayerEmail(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  phone: `+57${faker.string.numeric(10)}`,
  identity_document: faker.string.numeric(9),
};

const DEFAULT_CARD_DATA = {
  expiry_month: '01',
  expiry_year: '2039',
  card_holder: 'Jean Roldan',
  card_holder_dni: '1315722768',
  card_number: '371449635398431',
  card_cvv: '0000',
  address1: 'Santo Domingo 1',
  zip: '1215',
  city: 'Santo Domingo',
  state: 'Distrito Nacional',
  country: 'MX',
  phone: '12345755',
};

test.describe('@regression Api Cards V2 - Cards', () => {
  let privateKey: string;
  let merchantId: string;
  let merchantName: string;
  let userId: string;
  let userToken: string;

  test.beforeAll(async ({ userAuthService, merchantPool }) => {
    ({ privateKey, merchantId } = await merchantPool.acquire('NO_PROCESSOR_MX'));

    const registerResponse = await userAuthService.registerUser({
      merchantPrivateKey: privateKey,
      merchantId,
      data: body_register_user,
    });

    userToken = registerResponse.data.token;
    userId = registerResponse.data.user_id;
  });

  test(
    '@ENTP1-T1856 Create card exitoso',
    { tag: ['@team_payments_capabilities', '@preprod', '@checkout_ui', '@api'] },
    async ({ userAuthService }) => {
      await test.step('Create card and verify response', async () => {
        const response = await userAuthService.setCard({
          userId,
          userToken,
          data: DEFAULT_CARD_DATA,
        });

        expect(response.status).toBe(201);
        expect(response.data.data.id).toBeTruthy();
        expect(response.data.data.bank_name).toBeTruthy();
        expect(response.data.data.country_iso).toBeTruthy();
      });

      await test.step('Get card by ID and verify response', async () => {
        const createResponse = await userAuthService.setCard({
          userId,
          userToken,
          data: DEFAULT_CARD_DATA,
        });
        const cardId = createResponse.data.data.id;

        const getResponse = await userAuthService.getCard(userId, cardId, userToken, privateKey);

        expect(getResponse.status).toBe(200);
        expect(getResponse.data.data.id).toBeTruthy();
        expect(getResponse.data.data.bank_name).toBeTruthy();
        expect(getResponse.data.data.country_iso).toBeTruthy();
      });
    }
  );
});
