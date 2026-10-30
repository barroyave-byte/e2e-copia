import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';
import { MethodType, PurchaseRequestV2, PurchaseResponse } from '@support/http/models/payment';
import { ApiResponse } from '@support/http/BaseHttpClient';

const configMerchant = new ConfigMerchant();
let userToken: string;
let merchantResponse: BasicMerchantResult;
let purchaseResponse: ApiResponse<PurchaseResponse>;

const purchaseRequest: PurchaseRequestV2 = {
  order_token: '',
  payer_info: { email: 'pruebafraude@fraude.com' },
  payment_source: {
    method_type: MethodType.CREDIT_CARD,
    processor: 'kushki',
    card_info: {
      expiry_month: '11',
      expiry_year: '2025',
      card_holder: 'Franco Midence 0',
      card_holder_dni: '162915134',
      card_number: '4520121813132351',
      card_cvv: '123',
      address1: 'Vergara 546',
      zip: '001100',
      city: 'santiago',
      state: 'rm',
      country: 'cl',
      phone: '99999999',
    },
  },
};

test.describe('@regression Api Guard Merchant Profile', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test(
    '@PI-T1892 Purchase rechazado con fraud workflow',
    { tag: ['@team_payments_capabilities'] },
    async ({ userAuthService, emaService, paymentService }) => {
      await test.step('Create merchant setup config', async () => {
        merchantResponse = await configMerchant.basicSetup('MX');
        merchantId = merchantResponse.merchantId;
        merchantToken = merchantResponse.merchantToken;
        merchantName = merchantResponse.merchantName;
        privateKey = merchantResponse.privateKey;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.kushkiProcessor,
          merchantId,
          merchantToken
        );
        userToken = (await userAuthService.loginAsGuest(merchantResponse.merchantId, privateKey))
          .data.token;
      });

      await test.step('Purchase rejected with fraud workflow', async () => {
        const tokenizedOrderResponse = await emaService.tokenizeDeunaNowOrder(
          'MX',
          merchantResponse.privateKey,
          {
            amount: 11000,
          }
        );
        orderToken = tokenizedOrderResponse.data.token;
        orderId = tokenizedOrderResponse.data.order.order_id;
        purchaseRequest.order_token = tokenizedOrderResponse.data.token;
        purchaseResponse = await paymentService.purchaseV2(
          merchantResponse.privateKey,
          userToken,
          purchaseRequest,
          true
        );
      });

      await test.step('Verify purchase response', async () => {
        expect(purchaseResponse.status).toBe(422);
        expect(purchaseResponse.data.error.code).toBe('DP-8001');
        expect(purchaseResponse.data.error.description).toBe(
          'transaction may not have been approved.'
        );
      });
    }
  );
});
