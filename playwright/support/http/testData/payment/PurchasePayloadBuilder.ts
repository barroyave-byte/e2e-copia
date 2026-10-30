import { faker } from '@faker-js/faker';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { MethodType, PurchaseRequest } from '../../models/payment';
import { PURCHASE_COUNTRY_DATA } from './PurchaseCountryData';

export interface PurchasePayloadInput {
  /** Target country — determines static address and credit_card base data */
  country: CountryCodes;
  /** Processor name (e.g. 'kushki', 'stripe') */
  processorName: string;
  /** Credit card test data (from @support/interfaces/credit_cards) */
  card: BaseCreditCard;
  /** Order token from tokenizeDeunaNowOrder (goes into the request body) */
  token: string;
  /** Payer email. If omitted, a random email is generated with faker */
  email?: string;
  /** Transaction ID from a prior step */
  transactionId: string;
  /** Store code, defaults to 'all' */
  storeCode?: string;
}

/**
 * Builds a complete PurchaseRequest payload for the direct purchase API.
 *
 * Static per country: credit_card address fields, billing_address, shipping_address.
 * Dynamic per call: email, card data (number, cvv, expiry, holder, dni), processor_name, transactionId.
 *
 * @example
 * const orderToken = emaService.getOrderToken();
 * const payload = buildPurchasePayload({
 *   country: 'CO',
 *   processorName: 'kushki',
 *   card: creditCardData.kushkiMasterCardExitosa,
 *   token: orderToken,
 *   transactionId: 'some-transaction-id',
 * });
 * const response = await paymentService.purchase(privateKey, userAuthToken, payload);
 */
export function buildPurchasePayload(options: PurchasePayloadInput): PurchaseRequest {
  const { country, processorName, card, token, transactionId, storeCode = 'all' } = options;
  const email = options.email ?? `${faker.internet.email({firstName: `${crypto.randomUUID()}`})}`

  const countryData = PURCHASE_COUNTRY_DATA[country];
  if (!countryData) {
    throw new Error(`No purchase country data found for country: ${country}`);
  }

  // Parse expiry from MMYY format (e.g. '1127' → month: '11', year: '2027')
  const expiry_month = card.expiration_date.substring(0, 2);
  const expiry_year = '20' + card.expiration_date.substring(2, 4);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  return {
    method_type: MethodType.CREDIT_CARD,
    processor_name: processorName,
    token,
    email,
    store_code: storeCode,
    device_id: 'e30=',
    payer_info: { email },
    transaction_id: transactionId,
    credit_card: {
      ...countryData.creditCardBase,
      card_cvv: card.cvv_code,
      expiry_month,
      expiry_year,
      card_holder: card.cardholder_name,
      card_holder_dni: card.document_number,
      card_number: card.number,
    },
    billing_address: {
      ...countryData.billingAddress,
      email,
      created_at: now,
      updated_at: now,
    },
    shipping_address: {
      ...countryData.shippingAddress,
      email,
      created_at: now,
      updated_at: now,
    },
  };
}
