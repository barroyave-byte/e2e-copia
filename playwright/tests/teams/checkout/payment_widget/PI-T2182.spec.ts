import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { randomUUID } from 'crypto';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { customStyleForSpei } from '@support/mocks/customStyleForSpei';
import { SpeiVoucherPage } from '@pages/explore/speiVoucherPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  elementsConfig: {
    theme_config: [
      {
        id: randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customStyleForSpei),
      },
    ],
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression PaymentWidget as Form: make StpSpei autopurchase and validate voucher',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let orderToken: string;
    let publicKey: string;
    let privateKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      publicKey = merchant.publicKey;
      privateKey = merchant.privateKey;
      await apiCallNewman.configureWidget(merchant.merchantId, merchantToken, generalWidgetConfig);

      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchant.privateKey);
      orderToken = tokenized.data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stpSpeiProcessor,
        merchant.merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@PI-T2182 PaymentWidget as Form: SpeiOpm processor autopurchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const voucherPage = new SpeiVoucherPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

        await test.step('Click on Pay button STP Spei', async () => {
          await paymentDeunaNowPage.clickOnPayButton();
        });

        await test.step('It is validated that the order has been pending successfully with status pending', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('voucher view', async () => {
          await voucherPage.assertSpeiVoucher();
        });

        await test.step('It is validated that the order has been pending successfully with status pending', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending', 5, 2000);
        });
      }
    );
  }
);
