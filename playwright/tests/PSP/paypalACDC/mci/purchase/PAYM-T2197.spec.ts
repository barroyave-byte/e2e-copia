import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { defaultCampaignsMCI } from '@support/interfaces/campaigns/campaignsObject';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentCalculator } from '@support/utils/paymentCalculator';
import { buildPaypalAcdcMciMsiOrder } from '../../common/TokenizeOrderPayPalACDC';

const configMerchant = new ConfigMerchant();
const totalAmount = 300000;
const installments = '3';
const threeMonthsConfig = defaultCampaignsMCI.months_config.config_months.find(
  (config) => config.months === Number(installments)
);
const installmentRate = threeMonthsConfig?.config_franchise[0].installment_rate;

test.describe('@regression Pays with PayPal ACDC MX', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      buildPaypalAcdcMciMsiOrder()
    );
    orderToken = tokenized.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalACDCProcessorWithMCItoPSPasMSI,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PAYM-T2197 Purchase installments PSP no soporta MCI - Paypal ACDC',
    {
      annotation: { type: 'bug', description: 'PAYM-6030' },
      tag: [
        '@payments_integration',
        '@installments',
        '@team_payment_integration',
        '@fixme_preprod',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');

      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      await adminConsolidatedFlows.configureInstallmentCampaign(defaultCampaignsMCI);
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

      await test.step('User select MCI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMCI(installments);
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);

        const totalPayment = PaymentCalculator.calculateTotalPaymentWithInterest(
          totalAmount,
          installmentRate,
          installments
        );

        await paymentDeunaNowPage.assertOrderAmountRequestPurchase(totalPayment);
      });

      await test.step('Validate in admin  order installments MCI details', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MCI');

        const installmentsAmount = PaymentCalculator.calculateInstallmentAmount(
          totalAmount,
          installmentRate,
          installments,
          true
        );

        await adminOrderDetailsPage.assertOrderFromCardInstallmentRateAndAmount(
          'MXN',
          installmentsAmount,
          Number(installmentRate)
        );
      });
    }
  );
});
