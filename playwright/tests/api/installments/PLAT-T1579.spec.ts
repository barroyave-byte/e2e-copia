import { expect, test } from '@support/fixtures';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();

let orderToken: string;
let privateKey: string;

test.describe('@regression validates to get installments via Api Key', () => {
  test.beforeAll(async ({ emaService, paymentMsiService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    const { merchantId, merchantToken } = merchant;
    privateKey = merchant.privateKey;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.nuveiProcessor,
      merchantId,
      merchantToken
    );

    await paymentMsiService.configCampaign(merchantId, merchantToken, 'MXN', 'MSI');

    const tokenizeResult = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      amount: 250000,
    });
    orderToken = tokenizeResult.data.token;
  });

  test(
    '@PLAT-T1579 Get installments using an ApiKey',
    {
      tag: [
        '@preprod',
        '@installments_mci_msi',
        '@api',
        '@installments',
        '@team_payments_capabilities',
      ],
    },
    async ({ paymentMsiService }) => {
      await test.step('Step 1: Get installments using private key as API key', async () => {
        const response = await paymentMsiService.getOrderInstallments(
          orderToken,
          privateKey,
          '424242'
        );

        expect(response.status).toBe(200);
        expect(response.data.installments).toBeDefined();
        expect(Array.isArray(response.data.installments)).toBe(true);

        const plan3 = (response.data.installments as any[]).find((item) => item.installments === 3);
        const plan6 = (response.data.installments as any[]).find((item) => item.installments === 6);

        expect(plan3).toBeDefined();
        expect(plan3.plan_option_id).toBeDefined();
        expect(plan6).toBeDefined();
        expect(plan6.plan_option_id).toBeDefined();
      });
    }
  );
});
