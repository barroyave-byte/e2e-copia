import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { THEME_PAYMENT_LINK_PATTERNS } from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression @visual Checkout Payment Widget Roboto Typography',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let themeData;
    const themeName = 'RobotoTypographyE2E';

    const themeContent = {
      colors: {
        primaryTextColor: '#000000',
        buttonPrimaryFill: '#000000',
        backgroundPrimary: '#FFFFFF',
      },
      typography: {
        primaryFontFamily: 'Roboto',
      },
    };

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ userAuthService, emaService, checkoutConfigurationService }) => {
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.paymentezVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessorEC,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          country: 'EC',
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      const response = await checkoutConfigurationService.createTheme(privateKey, themeName, {
        theme: themeContent,
        ...THEME_PAYMENT_LINK_PATTERNS,
      });
      themeData = response.data as any;
    });

    test(
      '@ENTP1-T2156 - Custom typography roboto for elektra',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('The user navigates to the payment widget screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
          await paymentDeunaNowPage.userGuest();
        });

        await test.step('The user inserts a credit card from DeunaNow', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.kushkiVisaSuccessfull,
            { country: 'EC' }
          );
        });

        await test.step('The user validates the custom styles', async () => {
          await paymentDeunaNowPage.assertThemeConfigCustomStyles({
            primaryTextColor: '#000000',
            buttonPrimaryFill: '#000000',
            backgroundPrimary: '#FFFFFF',
            primaryFontFamily: 'Roboto, ui-sans-serif, system-ui, sans-serif',
          });
        });

        await test.step('The user clicks on pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          const status = 'processed';
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        });
      }
    );
  }
);
