import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { PayPalFormPage } from '@pages/explore/forms/paypalFormPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import {
  deletePaymentProcessor,
  registerProcessorForCleanup,
  registerUserWithAddress,
} from '../common';
import { EmailGenerator } from '@support/utils/EmailGenerator';

test.describe(
  '@regression PayPal Wallet - Express Flow (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId: string;
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      processorId = await apiCallNewman.createPaymentProcessor(
        processorsConfig.paypalWalletProcessor,
        merchantId,
        merchantToken
      );
      registerProcessorForCleanup(processorId, merchantId, merchantToken);

      const userEmail = EmailGenerator.generateRegisteredUserEmail();

      await registerUserWithAddress(userEmail, merchantId, privateKey);

      const configAuth = new ConfigAuth();
      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', {
        amount: 7980000,
        user_email: userEmail,
      });
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test(
      '@ENTP1-T2419 Authenticated user with vaulting disabled',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        let paypalPage: PayPalPage;
        const adminLoginPage = new AdminLoginPage(page);
        const adminHomePage = new AdminHomePage(page, 'ES');
        const adminConnectionsPage = new AdminConnectionsPage(page);
        const paypalFormPage = new PayPalFormPage(page);

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects PayPal Wallet (Express) as a Payment Method', async () => {
          await paypalFormPage.selectPayPalExpressForm();
        });

        await test.step('Should click on Pay button', async () => {
          const paypalPopupPromise = page.waitForEvent('popup');
          await paypalFormPage.clickOnPayButton();
          const paypalPopup = await paypalPopupPromise;
          paypalPage = new PayPalPage(paypalPopup);
        });

        await test.step('Should go to PayPal vaulting experience page', async () => {
          await paypalPage.assertPayPalVaultingExperiencePage();
        });

        await test.step('Should opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('Should goes to active connections', async () => {
          await adminHomePage.goToConnections();
          await adminConnectionsPage.clickOnListActiveProcessors();
        });

        await test.step('Should click on processor options', async () => {
          await adminConnectionsPage.clickOnButtonOptionsProcessor();
          await adminConnectionsPage.clickOnEditProcessorOption();
        });

        await test.step('Should disable vaulting mode', async () => {
          await adminConnectionsPage.clickOnVaultingCheckbox();
          const editProcessorResponse = adminConnectionsPage.waitForEditProcessorResponse();
          await adminConnectionsPage.confirmEditProcessor();
          await editProcessorResponse;
          await adminConnectionsPage.assertConnectionConfigured();
        });

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects PayPal Wallet (Express) as a Payment Method', async () => {
          await paypalFormPage.selectPayPalExpressForm();
        });

        await test.step('Should click on Pay button', async () => {
          const paypalPopupPromise = page.waitForEvent('popup');
          await paypalFormPage.clickOnPayButton();
          const paypalPopup = await paypalPopupPromise;
          paypalPage = new PayPalPage(paypalPopup);
        });

        await test.step('Should go to PayPal checkout experience page', async () => {
          await paypalPage.assertPayPalCheckoutExperiencePage();
        });
      }
    );

    test.afterAll(async () => {
      await deletePaymentProcessor(processorId, merchantId, merchantToken);
    });
  }
);
