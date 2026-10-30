import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { PaymentCalculator } from '@support/utils/paymentCalculator';
import {
  InstallmentsCampaign,
  ConfigInstallmentsMonths,
} from '@pages/admin/installments_configuration/installmentsCampaign';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();
const totalAmount = 300000;

const configInstallmentsMonth: ConfigInstallmentsMonths = {
  config_months: [
    {
      months: 3,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '0',
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
          installment_rate: '0',
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
          installment_rate: '0',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
  ],
};

const installmentsCampaignBamboo: InstallmentsCampaign = {
  name: 'Test campaign - Bamboo',
  description: 'Test campaign description',
  installments_type: 'MSI',
  campaign_date: null,
  processor: [ConnectionsAvailable.bamboo],
  months: [3, 6, 9],
  months_config: configInstallmentsMonth,
};

const installmentsCampaignPrisma: InstallmentsCampaign = {
  name: 'Test campaign - Prisma',
  description: 'Test campaign description',
  installments_type: 'MSI',
  campaign_date: null,
  processor: [ConnectionsAvailable.prisma],
  months: [3, 6, 9],
  months_config: configInstallmentsMonth,
};

test.describe('@regression Pays with Prisma - Two campaigns created, one for Prisma and one for Bamboo', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey, {
      user_email: `${crypto.randomUUID()}12345@testuser.com`,
      amount: totalAmount,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.bambooProcessorInARS,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1939 Purchase fallido con 3 meses de installments MSI - Plan de Installments consolidado desde dos campañas - Prisma y Bamboo',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');

      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page);
      const installments = '3';

      await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaignPrisma);
      await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaignBamboo);
      await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user select payment strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user configure payment strategy from Admin', async () => {
        await adminPaymentStrategyPage.editDefaultRouting([
          ConnectionsAvailable.bamboo,
          ConnectionsAvailable.prismaPayway,
        ]);
      });

      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });

      await test.step('The user inserts a credit card from widget de pagos', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.prismaPaywayVisaFailed,
          { country: 'AR' }
        );
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been denied successfully with status code "422" and status order "denied"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('denied', 422);
      });

      await test.step('Validate in admin  order installments MSI details', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied');
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MSI');
        await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.prismaPayway);

        const installmentsAmount = PaymentCalculator.calculateInstallmentAmount(
          totalAmount,
          0,
          installments,
          true
        );

        await adminOrderDetailsPage.assertOrderFromCardInstallmentRateAndAmount(
          'ARS',
          installmentsAmount,
          Number(0)
        );
      });
    }
  );
});
