import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import {
  InstallmentsCampaign,
  ConfigInstallmentsMonths,
} from '@pages/admin/installments_configuration/installmentsCampaign';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

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

const amount = '2000';
const currency = 'USD';
const country = 'EC';

const body_dlocal_installment = {
  currency: currency,
  country: country,
  amount: amount,
  bin: '423771',
};

test.describe('@regression Purchase MCI with Dlocal Ecuador', () => {
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
    '@PAYM-T2163 Procesar transacción con MCI - dLocal - Ecuador - VaultWidget',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const installments = '3';
      const vaultWidgetPage = new VaultWidgetPage(page);
      const bin = creditCardData.dlocalVisaInstallmentCard2.number.substring(0, 6);

      let selectedPlanOptionId = '';

      await test.step('fill out the credit card form', async () => {
        const planOptionIdPromise = vaultWidgetPage.captureAndGetInstallmentPlanOptionId(
          bin,
          Number(installments)
        );
        await vaultWidgetPage.fillFormVault(creditCardData.dlocalVisaInstallmentCard2, {
          country: 'EC',
        });
        selectedPlanOptionId = await planOptionIdPromise;
      });

      await test.step('User selects the installments option', async () => {
        await vaultWidgetPage.assertInstallmentsFieldVisible();
        await vaultWidgetPage.clickOnInstallmentsDropdown();
        await vaultWidgetPage.selectInstallmentsById(selectedPlanOptionId);
      });

      await test.step('User select Pay', async () => {
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed with the correct number of installments', async () => {
        const status = 'processed';
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MCI');
      });
    }
  );
});
