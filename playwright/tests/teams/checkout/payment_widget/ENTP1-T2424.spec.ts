import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as crypto from 'crypto';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression PaymentWidget: Validar comportamiento de Hide_Pay_Button',
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
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: `${crypto.randomUUID()}12345@testuser.com`,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessorCO,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2424 Payment Widget: Validar comportamiento de Hide_Pay_Button',
      { tag: ['@remove_preprod', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const language: LanguageCodes = 'EN';
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page, language);
        const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('The user configure campaign MSI from Admin', async () => {
          await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            language,
            disablePayButtonWidget: true,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('The user see cards form', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
        });

        await test.step('The pay button is not visible', async () => {
          await paymentDeunaNowPage.assertPayButtonIsNotVisible();
        });

        await test.step('User inserts Credit Card', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.kushkiVisaSuccessfull,
            { country: 'CO' }
          );
        });

        await test.step('The user clicks pay and wait to order to be processed', async () => {
          await paymentDeunaNowPage.fireDeunaSDKSubmit(true);
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
