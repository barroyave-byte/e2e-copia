import { test, expect } from '@support/fixtures';

test.describe('@regression Api Cards V2 - Verifier Credentials.', () => {
  test(
    '@ENTP1-T1397 Verify Activar card verifier for merchant',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_payments_capabilities'] },
    async ({ merchantAuthService, paymentService }) => {
      let merchantId: string;
      let merchantToken: string;

      await test.step('Create basic merchant', async () => {
        const merchant = await merchantAuthService.createBasicMerchantCheckout({ country: 'MX' });
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
      });

      await test.step('Verify active card verifier for merchant', async () => {
        const merchantPaymentsResponse = await paymentService.configurationMerchantPayments({
          merchantToken: merchantToken,
          merchantId: merchantId,
          storeId: 'all',
          configurationMerchantPaymentsData: {
            config_code: 'USE_CARD_VERIFICATION',
            config_value: 'ENABLED',
          },
        });
        expect(merchantPaymentsResponse.status).toBe(200);
        expect(merchantPaymentsResponse.data.config_value).toBe('ENABLED');
        expect(merchantPaymentsResponse.data.config_code).toBe('USE_CARD_VERIFICATION');
        expect(merchantPaymentsResponse.data.merchant_id).toBe(merchantId);
        expect(merchantPaymentsResponse.data.store_id).toBe('all');
      });
    }
  );
});
