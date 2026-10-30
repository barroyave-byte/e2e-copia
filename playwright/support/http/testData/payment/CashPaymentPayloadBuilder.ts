import { EmailGenerator } from '@support/utils/EmailGenerator';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { MethodType, PurchaseRequestV2 } from '../../models/payment';

export interface CashPaymentPayloadInput {
  /** Target country */
  country: CountryCodes;
  /** Processor name (e.g. 'cash') */
  processorName: string;
  /** Order token from tokenizeDeunaNowOrder */
  token: string;
  /** Payer email. If omitted, a random email is generated with faker */
  email?: string;
}

/**
 * Builds a complete PurchaseRequestV2 payload for cash payments via the v2 direct purchase API.
 *
 * Cash payments don't require card information, only payer info and payment source.
 *
 * @example
 * const payload = buildCashPaymentPayload({
 *   country: 'EC',
 *   processorName: 'cash',
 *   token: orderToken,
 * });
 * const response = await paymentService.purchaseV2(privateKey, userToken, payload);
 */
export function buildCashPaymentPayload(options: CashPaymentPayloadInput): PurchaseRequestV2 {
  const { processorName, token } = options;
  const email = options.email ?? EmailGenerator.generatePayerEmail();

  return {
    order_token: token,
    payer_info: { email },
    payment_source: {
      method_type: MethodType.CASH,
      processor: processorName,
    },
  };
}
