import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { fullWidgetGuestCustomStyle } from '@support/mocks/customStyles/fullWidgetGuest';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const checkout_modules = [
  {
    name: 'PriceBreakdownPattern',
    props: {
      show_in_main_view: false,
      fields: [],
    },
  },
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
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
        config: JSON.stringify(fullWidgetGuestCustomStyle),
      },
    ],
  },
};

const amount = '190000';
const amountDisplay = 'COP 1.900,00';

test.describe(
  '@regression PaymentWidget: Validate complete CustomStyle configuration in guest flow',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let merchantToken: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, paymentMsiService }) => {
      const email = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      merchantToken = merchant.merchantToken;
      await apiCallNewman.createConfigurationV2(
        {
          widgetGeneralsConfig: generalWidgetConfig.widgets_general_config,
          elementsConfig: generalWidgetConfig.elementsConfig,
        },
        merchantId,
        merchantToken
      );

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await paymentMsiService.configCampaign(merchantId, merchantToken, 'COP', 'MSI', [
        'mastercard',
        'amex',
        'diners',
      ]);

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: email,
        amount: Number(amount),
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
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
      '@ENTP1-T2600 PaymentWidget: Validate complete CustomStyle configuration in guest flow',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const { colors, typography, buttons, inputs } = fullWidgetGuestCustomStyle.theme;

        await test.step('theme.colors + theme.typography: base title/button colors and font', async () => {
          await paymentDeunaNowPage.assertThemeConfigCustomStyles({
            ...colors,
            ...typography,
          });
        });

        await test.step('theme.colors: inputBorder default state', async () => {
          await paymentDeunaNowPage.assertThemeColorTokens({
            inputBorder: colors.inputBorder,
          });
        });

        await test.step('buttons.borderRadius + buttons.height', async () => {
          await paymentDeunaNowPage.assertButtonDimensions(buttons);
        });

        await test.step('inputs.borderRadius + inputs.height', async () => {
          await paymentDeunaNowPage.assertInputsDimensions(inputs);
        });

        await test.step('HeaderPattern: merchant logo url and style', async () => {
          const merchantLogoUrl = fullWidgetGuestCustomStyle.HeaderPattern.overrides.Logo.props.url;
          await paymentDeunaNowPage.assertMerchantLogoSrc(merchantLogoUrl);
        });

        await test.step('PriceBreakdownPattern: order summary title', async () => {
          const priceBreakdownTitle =
            fullWidgetGuestCustomStyle.PriceBreakdownPattern.translations.es.title;
          await paymentDeunaNowPage.assertOrderSummaryTitleText(priceBreakdownTitle);
        });

        await test.step('PaymentMethodsPattern: card title/subtitle translations', async () => {
          const paymentMethodsInfo =
            fullWidgetGuestCustomStyle.PaymentMethodsPattern.translations.es.paymentMethods.info
              .card;
          await paymentDeunaNowPage.assertPaymentMethodsInfoCustomStyles(paymentMethodsInfo);
        });

        await test.step('CardPattern: card form field labels', async () => {
          const cardFormInputs = fullWidgetGuestCustomStyle.CardPattern.translations.es.inputs;
          await paymentDeunaNowPage.assertCardFormCustomStyles(cardFormInputs);
        });

        await test.step('inputs.inputMode "validated": error border on invalid expiration date', async () => {
          const expirationDateInput = paymentDeunaNowPage.iframeZoidVisible.locator(
            paymentDeunaNowPage.inputExpirationDate
          );
          await paymentDeunaNowPage.fillInputExpirationDate('11/20');
          await paymentDeunaNowPage.page.keyboard.press('Tab');
          await paymentDeunaNowPage.assertInputBorderColor(
            expirationDateInput,
            colors.inputBorderError
          );
          await paymentDeunaNowPage.clearInputsCreditCard('expDate');
        });

        await test.step('inputs.inputMode "validated": success border on valid expiration date', async () => {
          const expirationDateInput = paymentDeunaNowPage.iframeZoidVisible.locator(
            paymentDeunaNowPage.inputExpirationDate
          );
          await paymentDeunaNowPage.fillInputExpirationDate(
            creditCardData.globalpayVisaSuccessful.expiration_date
          );
          await paymentDeunaNowPage.page.keyboard.press('Tab');
          await paymentDeunaNowPage.assertInputBorderColor(
            expirationDateInput,
            colors.inputBorderPositive
          );
        });

        await test.step('UpperTagPattern: title, description and container style', async () => {
          const upperTag = fullWidgetGuestCustomStyle.UpperTagPattern;
          await paymentDeunaNowPage.clickTagDetailToggle('upper');
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(upperTag.title);
          for (const line of upperTag.description) {
            await paymentDeunaNowPage.assertCustomStyleTextIsVisible(line);
          }
          await paymentDeunaNowPage.assertComputedBackgroundColor(
            paymentDeunaNowPage.notificationWrapperFor(
              paymentDeunaNowPage.iframeZoidVisible.locator(paymentDeunaNowPage.UpperTag)
            ),
            upperTag.style.backgroundColor
          );
        });

        await test.step('LowerTagPattern: title and description', async () => {
          const lowerTag = fullWidgetGuestCustomStyle.LowerTagPattern;
          await paymentDeunaNowPage.scrollToElement(
            paymentDeunaNowPage.LoweTag,
            paymentDeunaNowPage.iframeZoidVisible
          );
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(lowerTag.title);
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(lowerTag.description);
        });

        await test.step('InstallmentsPattern: no-installments tooltip and popover content', async () => {
          const tooltip =
            fullWidgetGuestCustomStyle.InstallmentsPattern.overrides.NoInstallmentsTooltip;
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.globalpayVisaSuccessful,
            { country: 'CO' }
          );
          await paymentDeunaNowPage.assertNoInstallmentsTooltipCustomStyles(tooltip);
        });

        await test.step('TermsConditionsPattern: disclaimer message and connector', async () => {
          const tyc = fullWidgetGuestCustomStyle.TermsConditionsPattern;
          await paymentDeunaNowPage.assertTermsAndConditionsDisclaimerCustomStyles(
            tyc.legalMessage,
            tyc.connectorText
          );
        });

        await test.step('TermsConditionsPattern: terms and privacy policy urls', async () => {
          const tyc = fullWidgetGuestCustomStyle.TermsConditionsPattern;
          await paymentDeunaNowPage.assertTermsAndConditionsUrlsAreCorrect(
            tyc.termsAndConditionsUrl,
            tyc.privacyPolicyUrl
          );
        });

        await test.step('BillingPattern: billing view title, address1 label and save/cancel copy (bug ENTP1-17908)', async () => {
          const billing = fullWidgetGuestCustomStyle.BillingPattern.translations.es;
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(billing.billingView.title);
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(
            billing.inputs.personBilling.address1.label
          );
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(billing.billingView.cancel);
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(billing.billingView.save);
        });

        await test.step('BillingPattern: summary title after saving billing data', async () => {
          const billing = fullWidgetGuestCustomStyle.BillingPattern.translations.es;
          await paymentDeunaNowPage.fillInputField(
            paymentDeunaNowPage.inputAddress1,
            'Calle 123',
            paymentDeunaNowPage.iframeZoidVisible
          );
          await paymentDeunaNowPage.clickToSaveFormButton();
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(billing.title);
        });

        await test.step('PaymentButtonPattern: label, order total and colors', async () => {
          const payButton = fullWidgetGuestCustomStyle.PaymentButtonPattern;
          await paymentDeunaNowPage.assertPayButtonCustomStyles(
            { ...payButton, amountDisplay },
            colors,
            { waitForColorTransition: true }
          );
        });

        await test.step('PoweredByPattern: image url, visibility and inline styles', async () => {
          await paymentDeunaNowPage.assertPoweredByDeunaCustomStyles(
            fullWidgetGuestCustomStyle.PoweredByPattern
          );
        });

        await test.step('PaymentProcessing: processing screen texts (best-effort, transient screen)', async () => {
          const processing = fullWidgetGuestCustomStyle.PaymentProcessing.translations.es;
          await paymentDeunaNowPage.clickOnPayButton();
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(
            processing.header.title.paymentProcessing
          );
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(processing.header.subtitle);
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(processing.footer.caption);
          await paymentDeunaNowPage.responsePromise;
        });
      }
    );
  }
);
