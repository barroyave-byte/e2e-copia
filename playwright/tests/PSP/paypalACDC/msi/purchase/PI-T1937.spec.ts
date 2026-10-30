import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
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
    {
      months: 12,
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
      months: 18,
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

const installmentsCampaign: InstallmentsCampaign = {
  name: 'Test campaign',
  description: 'Test campaign description',
  installments_type: 'MSI',
  campaign_date: null,
  processor: [ConnectionsAvailable.paypal],
  months: [3, 6, 9, 12, 18],
  months_config: configInstallmentsMonth,
};

test.describe('@regression Pays with PayPal ACDC - Installments Plan does not show 6 installments MSI', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      amount: totalAmount,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalACDCProcessor,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PI-T1937 Purchase exitoso con 3 meses de installments MSI (IC2B) - Plan de Installments no muestra 6 MSI porque el PSP tiene 6 MCI configurado - Paypal ACDC',
    {
      annotation: { type: 'bug', description: 'PI-3774' },
      tag: ['@payments_integration', '@installments', '@team_payment_integration'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');

      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const installments = '3';
      const installmentsNotVisible = '6';

      await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaign);
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });

      await test.step('The user inserts a credit card from widget de pagos', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.paypalACDCVisaSucessful,
          { country: 'MX' }
        );
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('Validate that have installments but 6 MSI is not present', async () => {
        await paymentDeunaNowPage.ensureNotVisibleInstallmentsMSI(installmentsNotVisible);
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);

        const totalPayment = PaymentCalculator.calculateTotalPaymentWithInterest(
          totalAmount,
          0,
          installments
        );

        await paymentDeunaNowPage.assertOrderAmountRequestPurchase(totalPayment);
      });

      await test.step('Validate in admin  order installments MSI details', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MSI');

        const installmentsAmount = PaymentCalculator.calculateInstallmentAmount(
          totalAmount,
          0,
          installments,
          true
        );

        await adminOrderDetailsPage.assertOrderFromCardInstallmentRateAndAmount(
          'MXN',
          installmentsAmount,
          Number(0)
        );
      });
    }
  );
});
