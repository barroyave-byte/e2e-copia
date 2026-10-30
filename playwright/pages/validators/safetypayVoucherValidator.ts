import type { Request } from '@playwright/test';
import { expect } from '@playwright/test';
import { PurchaseResponseValidator } from './purchaseResponseValidators';

export class SafetypayVoucherValidator implements PurchaseResponseValidator {
  async validatePayload(request: Request) {
    const payload = request.postDataJSON?.() ?? JSON.parse(request.postData() ?? '{}');

    expect(payload.token).toBeDefined();
    expect(['voucher', 'bank_transfer']).toContain(payload.method_type);
    expect(payload.processor_name).toBe('safetypay');
  }

  async validateResponse(responseJson: any) {
    if (!responseJson.order) {
      const errorDetail = responseJson.error
        ? `[${responseJson.error.code}] ${responseJson.error.description} — Processor: ${responseJson.error.processor_error?.code}: ${responseJson.error.processor_error?.message}`
        : JSON.stringify(responseJson);
      throw new Error(
        `SafetyPay purchase API returned an error — no 'order' in response.\n${errorDetail}`
      );
    }

    const { order } = responseJson;

    expect(order.status).toBe('pending');
    expect(order.payment.data).toBeDefined();
    expect(order.payment.data.status).toBe('pending');

    const authorizationBankTransfer = order.payment.data.authorization_bank_transfer;
    expect(authorizationBankTransfer).toBeDefined();
    expect(authorizationBankTransfer?.redirect_url).toBeDefined();
  }
}
