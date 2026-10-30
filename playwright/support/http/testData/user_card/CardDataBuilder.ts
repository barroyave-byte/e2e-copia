import { UserCardRequestData } from '@support/http/models/userAuth';

/**
 * Default card data for testing
 */
export const DEFAULT_CARD_DATA: UserCardRequestData = {
  expiry_month: '11',
  expiry_year: '2030',
  card_holder: 'APRO APRO',
  card_holder_dni: '162915134',
  card_number: '4168818844447115',
  card_cvv: '123',
  address1: 'Santo Domingo 1',
  city: 'Santo Domingo',
  state: 'Distrito Nacional',
  country: 'MX',
  phone: '12345755',
  zip: '1215',
};

/**
 * Builder function to create card data with optional overrides
 */
export function buildCardData(
  overrides: Partial<UserCardRequestData> = {}
): UserCardRequestData {
  return {
    ...DEFAULT_CARD_DATA,
    ...overrides,
  };
}

/**
 * Card data presets for common test scenarios
 */

/** Card data without verify_card property */
export function buildCardDataWithoutVerifyCard(): UserCardRequestData {
  return buildCardData();
}

/** Card data with verify_card = true */
export function buildCardDataWithVerifyTrue(): UserCardRequestData {
  return buildCardData({
    fraud_config: {
      invoke_fraud_checkpoint: true,
    },
    card_verification_config: {
      invoke_card_verification: true,
    },
  });
}

/** Card data with verify_card = false */
export function buildCardDataWithVerifyFalse(): UserCardRequestData {
  return buildCardData({
    fraud_config: {
      invoke_fraud_checkpoint: true,
    },
    card_verification_config: {
      invoke_card_verification: false,
    },
  });
}

/** Card data with verify_card = null */
export function buildCardDataWithVerifyNull(): UserCardRequestData {
  return buildCardData({ verify_card: null });
}

/** Card data with invalid verify_card value (for error scenarios) */
export function buildCardDataWithInvalidVerify(): any {
  return buildCardData({  
    card_verification_config: {
      invoke_card_verification: 'something wrong',
    },
  });
}
