import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import {
  ConfigInstallmentsMonths,
  InstallmentsCampaign,
} from '@pages/admin/installments_configuration/installmentsCampaign';

const configMerchant = new ConfigMerchant();

const configInstallmentsMonth: ConfigInstallmentsMonths = {
  config_months: [
    {
      months: 3,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '4,5',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
    {
      months: 6,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '4,5',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
    {
      months: 9,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '4,5',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
  ],
};

const installmentsCampaign: InstallmentsCampaign = {
  name: 'Test campaign',
  description: 'Test campaign description',
  installments_type: 'MCI',
  campaign_date: null,
  processor: [ConnectionsAvailable.dlocal],
  months: [3, 6, 9],
  months_config: configInstallmentsMonth,
};

test.describe('@regression Purchase MCI with Dlocal Ecuadors', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('EC');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);

    const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey, { amount: 2000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;

    await apiCallNewman.createNetwork(merchantId, merchantToken);
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      await adminConsolidatedFlows.configureConnectionWithLoginAndMerchant(
        ConnectionsAvailable.dlocal,
        processorsConfig.dlocalProcessorAdminEC,
        merchantId
      );
      await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaign);
      const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PAYM-T2168 Procesar transacción con MCI - dLocal - VaultWidget - installments_total_amount',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ paymentMsiService }) => {
      await test.step('Validate get installments', async () => {
        const response = await paymentMsiService.getOrderInstallments(
          orderToken,
          privateKey,
          '445446'
        );

        const installments = response.data.installments;
        expect(installments).not.toBeUndefined();
        expect(installments).toBeInstanceOf(Array);
        expect(installments.length).toBeGreaterThan(0);

        for (let i = 0; i < installments.length; i++) {
          const item = installments[i] as any;
          expect(item).toHaveProperty('installment_total_amount');
          expect(item.installment_total_amount).not.toBeUndefined();
          expect(item.installment_total_amount).toBeGreaterThan(0);
        }
      });
    }
  );
});
