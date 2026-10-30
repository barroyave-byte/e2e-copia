import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { buildPaypalAcdcMciMsiOrder } from '../../common/TokenizeOrderPayPalACDC';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

const INSTALLMENTS_CASES = ['3', '6', '9', '12', '18'] as const;

const CUSTOM_BODY_INSTALLMENTS = new Set(['3', '18']);

test.describe('@regression Pays with PayPal ACDC MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalACDCProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
  });

  test(
    '@PI-T292 Purchase installments 3, 6, 9, 12 y 18 meses - Paypal ACDC',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@flaky',
        '@team_payment_integration',
        '@preprod',
      ],
    },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const status = 'processed';

      for (const installments of INSTALLMENTS_CASES) {
        await test.step(`${installments} meses`, async () => {
          await test.step('The user opens the testing page and opens the required widget', async () => {
            if (CUSTOM_BODY_INSTALLMENTS.has(installments)) {
              const tokenized = await emaService.tokenizeOrderWithCustomBody(
                privateKey,
                buildPaypalAcdcMciMsiOrder()
              );
              orderToken = tokenized.data.token;
              orderId = tokenized.data.order.order_id;
            } else {
              const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
                amount: 300000,
              });
              orderToken = tokenized.data.token;
              orderId = tokenized.data.order.order_id;
            }
            const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
            await testingTool.navigateAndSetup({
              orderToken: orderToken,
              merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
            });
          });

          await test.step('The user inserts a credit card from widget de pagos', async () => {
            await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
              creditCardData.paypalACDCMasterCardSucessful,
              { country: 'MX' }
            );
          });

          await test.step('User select MSI', async () => {
            await paymentDeunaNowPage.selectInstallmentsMSI(installments);
          });

          await test.step('The user clicks on pay', async () => {
            await paymentDeunaNowPage.clickPay();
          });

          await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
            await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
            await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
            await adminOrderDetailsPage.assertPaymentStatus(status);
            await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
            await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
          });
        });
      }
    }
  );
});
