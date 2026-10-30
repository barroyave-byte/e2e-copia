import { EmailGenerator } from '@support/utils/EmailGenerator';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { BrowserDetails, MethodType, PurchaseRequestV2 } from '../../models/payment';
import { PURCHASE_COUNTRY_DATA } from './PurchaseCountryData';

export interface PurchaseV2PayloadInput {
  /** Target country — determines static card address fields */
  country: CountryCodes;
  /** Processor name (e.g. 'kushki', 'stripe') */
  processorName: string;
  /** Credit card test data (from @support/interfaces/credit_cards) */
  card: BaseCreditCard;
  /** Order token from tokenizeDeunaNowOrder */
  token: string;
  /** Payer email. If omitted, a random email is generated with faker */
  email?: string;
  /** Number of installments (for MSI/MCI). If omitted, uses country default (usually 0) */
  installments?: number;
  /**
   * `plan_option_id` of the installment option (from `getOrderInstallments`). Required for MCI:
   * without it the backend resolves the installments as MSI. Sent as `payment_source.installment`.
   */
  planOptionId?: string;
  /**
   * Browser details for anti_fraud_info.browser_details. Required by processors
   * that validate browser context (e.g. Unlimit rejects with INVALID_API_REQUEST
   * when screen_height/screen_width are 0). Pass `true` to use sane defaults,
   * or a full BrowserDetails object to override. Omit to keep backward-compatible
   * behavior (no anti_fraud_info in payload).
   */
  browserDetails?: BrowserDetails | true;
}

/** Sensible defaults for processors that require non-zero browser_info. */
export const DEFAULT_BROWSER_DETAILS: BrowserDetails = {
  accept_header: '*/*',
  color_depth: 24,
  java_enabled: false,
  java_script_enabled: true,
  language: 'en-US',
  screen_height: 1080,
  screen_width: 1920,
  time_zone_offset: 0,
};

/**
 * Builds a complete PurchaseRequestV2 payload for the v2 direct purchase API.
 *
 * Static per country: card address fields (address1, city, state, zip, country, phone).
 * Dynamic per call: email, card data (number, cvv, expiry, holder, dni), processor.
 *
 * @example
 * const payload = buildPurchaseV2Payload({
 *   country: 'CO',
 *   processorName: 'kushki',
 *   card: creditCardData.kushkiMasterCardExitosa,
 *   token: orderToken,
 * });
 * const response = await paymentService.purchaseV2(privateKey, userToken, payload);
 */
export function buildPurchaseV2Payload(options: PurchaseV2PayloadInput): PurchaseRequestV2 {
  const { country, processorName, card, token } = options;
  const email = options.email ?? EmailGenerator.generatePayerEmail();

  const countryData = PURCHASE_COUNTRY_DATA[country];
  if (!countryData) {
    throw new Error(`No purchase country data found for country: ${country}`);
  }

  // Parse expiry from MMYY format (e.g. '1127' → month: '11', year: '2027')
  const expiry_month = card.expiration_date.substring(0, 2);
  const expiry_year = '20' + card.expiration_date.substring(2, 4);

  const browserDetails =
    options.browserDetails === true ? DEFAULT_BROWSER_DETAILS : options.browserDetails;

  return {
    order_token: token,
    payer_info: { email },
    payment_source: {
      method_type: MethodType.CREDIT_CARD,
      processor: processorName,
      card_info: {
        ...countryData.creditCardBase,
        card_cvv: card.cvv_code,
        expiry_month,
        expiry_year,
        card_holder: card.cardholder_name,
        card_holder_dni: card.document_number,
        card_number: card.number,
        ...(options.installments !== undefined && { installments: options.installments }),
      },
      ...(options.planOptionId && { installment: { plan_option_id: options.planOptionId } }),
    },
    ...(browserDetails && {
      anti_fraud_info: {
        browser_details: browserDetails,
      },
    }),
  };
}
