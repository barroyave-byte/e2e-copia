import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { randomUUID } from 'crypto';

test.describe('@regression Payment Middleware.', () => {
  let merchantToken: string;

  test.beforeAll(async ({ merchantAuthService }) => {
    // Setup merchant and processors
    const merchantData = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    merchantToken = merchantData.merchantToken;

    await apiCallNewman.configSmartRouting(merchantData.merchantId, merchantToken, '2');
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessor,
      merchantData.merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantData.merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T1967 Get con Merchant ID not found',
    { tag: ['@preprod', '@installments_mci_msi', '@api', '@team_payments_capabilities'] },
    async ({ paymentMsiService }) => {
      // Use a random merchant ID that doesn't exist
      const randomMerchantId = randomUUID();

      const response = await paymentMsiService.getCampaigns(
        randomMerchantId,
        merchantToken,
        undefined,
        true
      );

      expect(response.status).toBe(404);
      expect(response.data.code).toBe(404);
      expect(response.data.error).toBe('IC-027: installment campaign not found');
    }
  );
});
