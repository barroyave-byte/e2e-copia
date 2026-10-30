import * as crypto from 'crypto';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { createDefaultCampaignMSI } from '@support/interfaces/campaigns/campaignsObject';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Buy with deuna now using installments',
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
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2113 Validación de installments al ingresar o eliminar tarjetas',
      { tag: ['@card', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
        const adminConsolidatedFlows = new AdminConsolidatedFlows(page);

        const installments = '9';

        await test.step('The user configure campaign MSI from Admin', async () => {
          await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
          await adminConsolidatedFlows.configureInstallmentCampaign(
            createDefaultCampaignMSI(installments)
          );
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('The user can see error messages', async () => {
          await paymentDeunaNowPage.userDoesNotSeeErrors();
        });

        await test.step('User inserts Credit Card without Installments', async () => {
          await paymentDeunaNowPage.fillCreditCard('1234 5678 9123 4567');
          await paymentDeunaNowPage.userDoesNotSeeInstallmentsDropdown();
        });

        await test.step('User cleans card number input', async () => {
          await paymentDeunaNowPage.clickClosestClearButton('cardNumber');
        });

        await test.step('User inserts Credit Card with Installments Campaign', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.globalpayVisaSuccessful,
            { country: 'CO' }
          );
          await paymentDeunaNowPage.userSeesInstallmentsDropdown();
        });
        await test.step('User select MSI', async () => {
          await paymentDeunaNowPage.selectInstallmentsMSI(installments);
        });
      }
    );
  }
);
