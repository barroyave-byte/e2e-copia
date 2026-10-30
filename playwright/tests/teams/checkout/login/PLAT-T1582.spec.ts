import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as processorConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as userData from '@support/interfaces/user_data';
import * as userAddress from '@support/interfaces/address_user';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression feature to validate with the automated test case', () => {
  let privateKeyWithoutNetwork: string;
  let publicKeyWithoutNetwork: string;
  let merchantIdWithoutNetwork: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, userAuthService }) => {
    const configMerchantWithoutNetwork = await configMerchant.basicSetup('MX');
    merchantIdWithoutNetwork = configMerchantWithoutNetwork.merchantId;
    privateKeyWithoutNetwork = configMerchantWithoutNetwork.privateKey;
    publicKeyWithoutNetwork = configMerchantWithoutNetwork.publicKey;

    await apiCallNewman.createConfigurationV2(
      { widgetGeneralsConfig: widgetsGeneralConfig },
      merchantIdWithoutNetwork,
      configMerchantWithoutNetwork.merchantToken
    );

    const configMerchantNetwork = await configMerchant.basicSetup('MX');
    const merchantIdNetwork = configMerchantNetwork.merchantId;
    const merchantTokenNetwork = configMerchantNetwork.merchantToken;
    await apiCallNewman.createNetwork(merchantIdNetwork, merchantTokenNetwork);

    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardMX.phone,
        identity_document: creditCardData.kushkiVisaSuccessfull.document_number,
      },
      {
        merchantId: merchantIdNetwork,
        merchantPrivateKey: configMerchantNetwork.privateKey,
      }
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKeyWithoutNetwork, {
      user_email: userEmail,
      billing_phone: userData.userDataMX.phone,
      billing_identity_document: userData.userDataMX.dni,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PLAT-T1582 Comprar como usuario invitado que está creado en un comercio de otra red',
    { tag: ['@checkout_qsr', '@preprod', '@team_enterprise'] },
    async ({ page, userAuthService }) => {
      const adminConsolidatedFlowsPage = new AdminConsolidatedFlows(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');

      await test.step('The merchant has a kushki configurated as payment processor', async () => {
        await adminConsolidatedFlowsPage.configureConnectionWithLoginAndMerchant(
          ConnectionsAvailable.kushki,
          processorConfig.kushkiProcessor,
          merchantIdWithoutNetwork
        );
      });

      await test.step('The user open payment widget from explore', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken,
          merchantCredentials: {
            publicKey: publicKeyWithoutNetwork,
            privateKey: privateKeyWithoutNetwork,
          },
        });
      });

      await test.step('The user enters the credit card information of the Kushki Visa', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus(
          status,
          privateKeyWithoutNetwork,
          orderToken
        );
      });

      await test.step('Validate that user data is equal to last information used', async () => {
        const loginResponse = await userAuthService.loginUserTypeSms(
          userEmail,
          '010101',
          merchantIdWithoutNetwork,
          privateKeyWithoutNetwork
        );
        const userResponse = await userAuthService.getUser(
          privateKeyWithoutNetwork,
          loginResponse.token
        );
        expect(userResponse.data.phone).toBe(userData.userDataMX.phone);
        expect(userResponse.data.identity_document).toBe(userData.userDataMX.dni);
      });
    }
  );
});
