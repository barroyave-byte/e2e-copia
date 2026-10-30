import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { newCustomStyle } from '@support/mocks/newcustomStyle';
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
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(newCustomStyle),
      },
    ],
  },
};
const email = EmailGenerator.generateRegisteredUserEmail();
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

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: email,
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

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2143 PaymentWidget: Validar aplicación correcta de CustomStyle',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('Assert theme config is has proper custom styles', async () => {
          await paymentDeunaNowPage.assertThemeConfigCustomStyles({
            ...newCustomStyle.theme.colors,
            ...newCustomStyle.theme.typography,
          });
        });

        await test.step('Assert merchant logo is has proper custom styles', async () => {
          const merchantLogoUrl = newCustomStyle.HeaderPattern.overrides.Logo.props.url;
          await paymentDeunaNowPage.assertMerchantLogoSrc(merchantLogoUrl);
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
        await test.step('Assert terms and conditions disclaimer has proper custom styles', async () => {
          const legalMessage = newCustomStyle.TermsConditionsPattern.legalMessage;
          const connectorText = newCustomStyle.TermsConditionsPattern.connectorText;
          await paymentDeunaNowPage.assertTermsAndConditionsDisclaimerCustomStyles(
            legalMessage,
            connectorText
          );
        });
        await test.step('Assert terms and conditions urls are correct', async () => {
          const termsAndConditionsUrl = newCustomStyle.TermsConditionsPattern.termsAndConditionsUrl;
          const privacyPolicyUrl = newCustomStyle.TermsConditionsPattern.privacyPolicyUrl;
          await paymentDeunaNowPage.assertTermsAndConditionsUrlsAreCorrect(
            termsAndConditionsUrl,
            privacyPolicyUrl
          );
        });
        await test.step('Assert pay button has proper custom styles', async () => {
          const payButton = newCustomStyle.PaymentButtonPattern;
          const customColors = newCustomStyle.theme.colors;
          await paymentDeunaNowPage.assertPayButtonCustomStyles(
            {
              ...payButton,
              amountDisplay,
            },
            customColors,
            { waitForColorTransition: true }
          );
        });
        await test.step('Assert powered by deuna pattern has proper custom styles', async () => {
          const poweredByDeunaImage = newCustomStyle.PoweredByPattern;
          await paymentDeunaNowPage.assertPoweredByDeunaCustomStyles(poweredByDeunaImage);
        });
      }
    );
  }
);
