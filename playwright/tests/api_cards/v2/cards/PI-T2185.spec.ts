import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import { UserCardRequestData } from '@support/http/models/userAuth';

/**
 * Regression cover for RIS-132 / INCS-3020 (payment-operational-prod-lb-5xx-errors).
 *
 * ~1600 cards were persisted with a corrupted expiration_date (e.g. "/"), which later made
 * GET /users/{userId}/cards fail with HTTP 500 (SQLSTATE 22007: invalid value "/" for "MM").
 * The fix adds create-time validation (isValidCardExpiration / getExpirationDate) so an
 * invalid expiry_month is rejected at POST time and never reaches the database, plus a
 * repository-level safeguard so get_cards tolerates any invalid row that slips through.
 *
 * This spec reproduces the two angles from Zephyr PI-T2185 — the create-time rejection of
 * expiry_month "/" and "" — plus one coverage extension (expiry_month "13", out of range but
 * syntactically well-formed), and confirms get_cards keeps returning 200 with a clean list
 * throughout.
 */

const INVALID_EXPIRY_MONTH_SLASH: UserCardRequestData = {
  expiry_month: '/',
  expiry_year: '2030',
  card_holder: 'APRO APRO',
  card_holder_dni: '162915134',
  card_number: '4168818844447115',
  card_cvv: '123',
  address1: 'Santo Domingo 1',
  zip: '1215',
  city: 'Santo Domingo',
  state: 'Distrito Nacional',
  country: 'MX',
  phone: '12345755',
};

// Same payload as PI-T2185's second attempt, with expiry_month empty instead of "/" — the
// Zephyr step's JSON body was pasted as a duplicate of the first attempt, but its title and
// expected result ("para expiry_month = \"\"") describe the empty-string case, so that's what
// this covers.
const INVALID_EXPIRY_MONTH_EMPTY: UserCardRequestData = {
  ...INVALID_EXPIRY_MONTH_SLASH,
  expiry_month: '',
};

// Coverage extension beyond the Zephyr steps: the incident's own detection query
// (`expiration_date !~ '^\d{1,2}/\d{2,4}$'`) treats any 1-2 digit month as syntactically
// valid, so it would not have flagged an out-of-range month like "13". If the create-time
// guard ever regresses to a format-only check instead of a 01-12 range check, a card like
// this would slip through exactly the same way "/" and "" did.
const INVALID_EXPIRY_MONTH_OUT_OF_RANGE: UserCardRequestData = {
  ...INVALID_EXPIRY_MONTH_SLASH,
  expiry_month: '13',
  card_number: '4168818844447116',
};

test.describe('@regression Api Cards V2 - Cards', () => {
  test(
    '@PI-T2185 Error - do not allow a card with an invalid expiration date to be created',
    { tag: ['@team_payments_capabilities', '@api'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          { action: 'setup.user.register', saveAs: 'registeredUser' },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Intento de creación de tarjeta con expiry_month = "/"',
            params: {
              userToken: ref('registeredUser').at('user.token'),
              cardData: INVALID_EXPIRY_MONTH_SLASH,
              expectError: true,
            },
            saveAs: 'slashCardResponse',
          },
          {
            action: 'setup.user.assertCardCreationRejected',
            stepName: 'Validaciones de la respuesta de error para expiry_month = "/"',
            params: { response: ref('slashCardResponse'), descriptionContains: 'invalid month' },
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Intento de creación de tarjeta con expiry_month = ""',
            params: {
              userToken: ref('registeredUser').at('user.token'),
              cardData: INVALID_EXPIRY_MONTH_EMPTY,
              expectError: true,
            },
            saveAs: 'emptyCardResponse',
          },
          {
            action: 'setup.user.assertCardCreationRejected',
            stepName: 'Validaciones de la respuesta de error para expiry_month = ""',
            params: { response: ref('emptyCardResponse'), descriptionContains: 'invalid month' },
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Intento de creación de tarjeta con expiry_month = "13" (fuera de rango)',
            params: {
              userToken: ref('registeredUser').at('user.token'),
              cardData: INVALID_EXPIRY_MONTH_OUT_OF_RANGE,
              expectError: true,
            },
            saveAs: 'outOfRangeCardResponse',
          },
          {
            action: 'setup.user.assertCardCreationRejected',
            stepName: 'Validaciones de la respuesta de error para expiry_month = "13"',
            params: {
              response: ref('outOfRangeCardResponse'),
              descriptionContains: 'invalid month',
            },
          },
          {
            action: 'setup.user.getCards',
            stepName: 'Consulta de tarjetas del usuario (get_cards)',
            params: { userToken: ref('registeredUser').at('user.token') },
            saveAs: 'cardsListResponse',
          },
          {
            action: 'setup.user.assertCardsListHealthy',
            stepName: 'Validaciones de que get_cards no falla y no contiene tarjetas inválidas',
            params: {
              response: ref('cardsListResponse'),
              rejectedCardNumbers: [
                INVALID_EXPIRY_MONTH_SLASH.card_number,
                INVALID_EXPIRY_MONTH_EMPTY.card_number,
                INVALID_EXPIRY_MONTH_OUT_OF_RANGE.card_number,
              ],
            },
          },
        ],
      });
    }
  );
});
