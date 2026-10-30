import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { createDefaultCampaignMSI } from '@support/interfaces/campaigns/campaignsObject';
import * as crypto from 'crypto';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression @visual Buy with deuna now using installments',
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
      '@ENTP1-T2118 Payment Widget: Test de Regresión VIsual de Formulario de Tarjetas',
      { tag: ['@card', '@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
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

        await test.step('The user see cards form', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step1-screen-without-errors'
          );
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
      }
    );
  }
);
