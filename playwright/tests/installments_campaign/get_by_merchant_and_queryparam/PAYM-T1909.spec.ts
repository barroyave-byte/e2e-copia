import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import {
  buildCampaign1,
  buildCampaign2,
  buildCampaign3,
  buildCampaign4,
  generateCampaignDates,
} from '@support/http/testData/payment_msi/CampaignGetTestsBuilder';

test.describe('@regression Payment Middleware.', () => {
  let merchantId: string;
  let merchantToken: string;
  let campaignIds: string[];
  const dates = generateCampaignDates();

  test.beforeAll(async ({ merchantAuthService, paymentMsiService }) => {
    // Setup merchant and processors
    const merchantData = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    merchantId = merchantData.merchantId;
    merchantToken = merchantData.merchantToken;

    await apiCallNewman.configSmartRouting(merchantId, merchantToken, '2');
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );

    // Create 4 campaigns for testing
    campaignIds = [];

    const campaign1Response = await paymentMsiService.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: buildCampaign1(dates.current_date, dates.one_day_later),
    });
    campaignIds.push(campaign1Response.data.data.id);

    const campaign2Response = await paymentMsiService.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: buildCampaign2(dates.current_date),
    });
    campaignIds.push(campaign2Response.data.data.id);

    const campaign3Response = await paymentMsiService.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: buildCampaign3(dates.one_day_later),
    });
    campaignIds.push(campaign3Response.data.data.id);

    const campaign4Response = await paymentMsiService.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: buildCampaign4(),
    });
    campaignIds.push(campaign4Response.data.data.id);
  });

  test(
    '@PAYM-T1909 Get campaigns con query Param end_date posterior al end_date de la campaña',
    { tag: ['@preprod', '@installments_mci_msi', '@api', '@team_payments_capabilities'] },
    async ({ paymentMsiService }) => {
      const response = await paymentMsiService.getCampaigns(merchantId, merchantToken, {
        end_date: dates.two_days_later,
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(200);
      expect(response.data.data).toBeDefined();

      // Should return campaigns 1 and 3 (those with end_date <= two_days_later)
      const responseCampaignIds = response.data.data.map((campaign) => campaign.id);
      expect(responseCampaignIds).toContain(campaignIds[0]); // campaign_id_1
      expect(responseCampaignIds).toContain(campaignIds[2]); // campaign_id_3

      // Verify all campaigns belong to the merchant
      response.data.data.forEach((campaign) => {
        expect(campaign.merchant_id).toBe(merchantId);
      });
    }
  );
});
