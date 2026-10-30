import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { newCustomStyle } from '@support/mocks/newcustomStyle';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(newCustomStyle),
      },
    ],
  },
};
const amount = '190000';
const amountDisplay = 'COP 1.900,00';

test.describe(
  '@regression PaymentWidget: Validar aplicación correcta de CustomStyle',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const userEmail = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.globalpayVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: Number(amount),
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
      '@ENTP1-T2146 PaymentWidget: Validar aplicación correcta de CustomStyle en flujo de usuario registrado',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('The user opens the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Assert header logo has proper custom styles', async () => {
          const merchantLogoUrl =
            newCustomStyle.OtpPage.overrides.Header.props.overrides.Logo.props.url;
          await paymentDeunaNowPage.assertMerchantLogoSrc(merchantLogoUrl);
        });

        await test.step('Assert otp view has proper custom styles', async () => {
          const otpOverrides = newCustomStyle.OtpPage.overrides;
          await page.waitForTimeout((otpOverrides.OtpPattern.props.timeout + 2) * 1000);

          const otpHeadings = otpOverrides.Headings.props;
          const otpChangeChannelButton = otpOverrides.OtpChangeChannelButton.props;
          const continueAsGuestButton = otpOverrides.ContinueAsGuestButton.props;
          const resendCodeButton = otpOverrides.OtpResendButton.props;
          await paymentDeunaNowPage.assertOtpViewCustomStyles({
            ...otpHeadings,
            maskedPhone: `*****${userAddressCreditCard?.userAddressCreditCardCO?.phone?.slice(-3)}`,
            resendCodeButton,
            otpChangeChannelButton,
            continueAsGuestButton,
          });
        });

        await verifyVisualConsistency(
          paymentDeunaNowPage.page,
          commonViewportSets.desktopAndFullscreen,
          'verify-otp-view'
        );

        await test.step('User logs in', async () => {
          await paymentDeunaNowPage.enterOTPCode();
        });

        await test.step('Assert payment methods info is has proper custom styles', async () => {
          const paymentMethodsInfo =
            newCustomStyle.PaymentMethodsPattern.translations.es.paymentMethods.info.card;
          await paymentDeunaNowPage.assertPaymentMethodsInfoCustomStyles(paymentMethodsInfo);
        });

        await test.step('Assert card form has proper custom styles', async () => {
          const cardFormInputs = newCustomStyle.CardPattern.translations.es.inputs;
          await paymentDeunaNowPage.assertCardFormCustomStyles(cardFormInputs);
        });

        await test.step('Assert pay button has proper custom styles', async () => {
          const payButton = newCustomStyle.PaymentButtonPattern;
          await paymentDeunaNowPage.assertPayButtonCustomStyles(
            {
              ...payButton,
              amountDisplay,
            },
            newCustomStyle.theme.colors
          );
        });

        await test.step('Assert powered by deuna pattern has proper custom styles', async () => {
          const poweredByDeunaImage = newCustomStyle.PoweredByPattern;
          await paymentDeunaNowPage.assertPoweredByDeunaCustomStyles(poweredByDeunaImage);
        });

        await test.step('fill form with credit card', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.globalpayVisaSuccessful,
            { country: 'CO' }
          );
        });
      }
    );
  }
);
