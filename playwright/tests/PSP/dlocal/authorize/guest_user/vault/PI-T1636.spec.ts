import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { createDefaultCampaignMSI } from '@support/interfaces/campaigns/campaignsObject';

const configMerchant = new ConfigMerchant();

test.describe('@regression Purchase MSI with Dlocal Uruguay', () => {
  let merchantId: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantSetup = await configMerchant.basicSetup('UY');
    const { merchantId: merchantIdParam, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    merchantId = merchantIdParam;

    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);
    const tokenized = await emaService.tokenizeDeunaNowOrder('UY', privateKey);
    orderToken = tokenized.data.token;
    await apiCallNewman.createNetwork(merchantId, merchantToken);
  });

  test(
    '@PI-T1636 Procesar transacción con MSI - dLocal - Uruguay - VaultWidget',
    { tag: ['@payments_integration', '@team_payment_integration'] },
    async ({ page }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const installments = '3';
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);

      await test.step('The user configure campaign MSI from Admin', async () => {
        await adminConsolidatedFlows.configureConnectionWithLoginAndMerchant(
          ConnectionsAvailable.dlocal,
          processorsConfig.dlocalProcessorAdminUY,
          merchantId
        );
        await adminConsolidatedFlows.configureInstallmentCampaign(
          createDefaultCampaignMSI(installments)
        );
      });

      await test.step('The user navigates to the payment screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('fill out the credit card form', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.dlocalVisaInstallmentCard, {
          country: 'UY',
        });
      });

      await test.step('Validate that the BIN is correctly sent within the request to retrieve installments params request', async () => {
        await vaultWidgetPage.sendPostMessageToRefetchOrder();
      });

      await test.step('User select MSI', async () => {
        await vaultWidgetPage.selectInstallmentsMSI(installments);
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
        await adminOrderDetailsPage.assertTypeInstallments('MSI');
      });
    }
  );
});
