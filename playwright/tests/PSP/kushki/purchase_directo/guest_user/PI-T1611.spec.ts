import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { CheckoutPage } from '@pages/explore/checkoutPage';
import { ConfigExplorePage } from '@pages/explore/configExplorePage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Realizar pago con tarjeta inválida de crédito Visa usando Kushki',
  { tag: ['@explore', '@team_payment_integration'] },
  () => {
    let orderToken: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchantSetup = await configMerchant.basicSetup('CO');
      const { merchantId, merchantToken } = merchantSetup;
      privateKey = merchantSetup.privateKey;
      publicKey = merchantSetup.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.globalpayVisaFailed.document_number,
        },
        {
          merchantPrivateKey: privateKey,
          merchantId: merchantId,
        }
      );
      await apiCallNewman.createNetwork(merchantId, merchantToken);

      orderToken = (
        await emaService.tokenizeDeunaNowOrder('CO', privateKey, { user_email: userEmail })
      ).data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@PI-T1611 Realizar pago con tarjeta inválida de crédito Visa usando Kushki',
      {
        tag: [
          '@preprod',
          '@purchase',
          '@smoke',
          '@payments_integration',
          '@team_payment_integration',
        ],
      },
      async ({ page }) => {
        const checkoutPage = new CheckoutPage(page);
        const configExplorePage = new ConfigExplorePage(page);

        await test.step('The user opens the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Setup to use Purchase v2 with credit card', async () => {
          await configExplorePage.clickMenuSidebar();
          await configExplorePage.clickAccordeonPaymentMethodsConfig();
          await configExplorePage.clickCheckboxPurchaseV2CC();
          await configExplorePage.clickCloseSidebar();
        });

        await test.step('Select card method', async () => {
          await checkoutPage.fillCreditCardData(creditCardData.kushkiVisaInvalidCard);
          await checkoutPage.clickOnCreditCard();
        });

        await test.step('Click on button finalize purchase', async () => {
          await checkoutPage.clickOnButtonFinalizePurchase();
          await checkoutPage.assertOrderStatusRequestPurchase('denied', 422);
        });
      }
    );
  }
);
