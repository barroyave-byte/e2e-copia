import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [],
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
};

test.describe(
  '@regression PaymentWidget: Enviar el user_id a RudderStack',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
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
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2391 PaymentWidget - Enviar el user_id a RudderStack',
      {
        tag: [
          '@admin_connection',
          '@preprod',
          '@checkout_ui',
          '@admin-preprod',
          '@team_enterprise',
        ],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user goes the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('An event is sent to RudderStack and contains the user_id', async () => {
          await paymentDeunaNowPage.assertEventWasFired(
            CheckoutEventsName.checkoutStarted,
            (body) => {
              const properties = body.properties as Record<string, unknown>;
              const userProperties = properties.user as Record<string, unknown>;
              const userId = userProperties.id as string | undefined;
              return Boolean(userId) && userId !== '' && userId!.trim() !== '';
            }
          );
        });
      }
    );
  }
);
