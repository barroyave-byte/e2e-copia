import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { fullWidgetAuthCustomStyle } from '@support/mocks/customStyles/fullWidgetAuth';
import { EmailGenerator } from '@support/utils/EmailGenerator';

// Card whose actions menu the test opens to reach the delete-card copy.
const managedCardNumber = '4242424242424242';

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
        config: JSON.stringify(fullWidgetAuthCustomStyle),
      },
    ],
  },
};

const amount = '190000';
const amountDisplay = 'COP 1.900,00';
const activeCardLastFour = '1111';

test.describe(
  '@regression PaymentWidget: Validate complete CustomStyle configuration in registered user flow',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let merchantToken: string;
    let orderToken: string;
    let orderId: string;
    let userEmail: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      userEmail = EmailGenerator.generateRegisteredUserEmail();

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

      const registerResponse = await userAuthService.registerUserAndSetAddress(
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
      const { token: userToken, user_id: userId } = registerResponse.user;

      const baseCardData = {
        expiry_month: '01',
        card_holder: 'CustomStyle Auth',
        card_holder_dni: creditCardData.globalpayVisaSuccessful.document_number,
        address1: 'Santo Domingo 1',
        zip: '1215',
        city: 'Santo Domingo',
        state: 'Distrito Nacional',
        country: 'CO',
        phone: userAddressCreditCard.userAddressCreditCardCO.phone,
      };
      // A second and third card are required so the saved-cards list exceeds the
      // inline-display threshold and the "see all my cards" button renders.
      await userAuthService.setCard({
        userId,
        userToken,
        data: {
          ...baseCardData,
          expiry_year: '2039',
          card_number: '378282246310005',
          card_cvv: '0000',
        },
      });
      // Active card: used later to reach the pay button / powered-by assertions.
      await userAuthService.setCard({
        userId,
        userToken,
        data: {
          ...baseCardData,
          expiry_year: '2039',
          card_number: '4111111111111111',
          card_cvv: '123',
        },
      });
      await userAuthService.setCard({
        userId,
        userToken,
        data: {
          ...baseCardData,
          expiry_year: '2039',
          card_number: managedCardNumber,
          card_cvv: '123',
        },
      });

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
      '@ENTP1-T2601 PaymentWidget: Validate complete CustomStyle configuration in registered user flow',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const otpOverrides = fullWidgetAuthCustomStyle.OtpPage.overrides;
        const userCardTexts =
          fullWidgetAuthCustomStyle.UserCardPattern.translations.es.paymentMethods;
        const addNewCardInfo =
          fullWidgetAuthCustomStyle.CardPattern.translations.es.addNewCard.info;
        const payWithText =
          fullWidgetAuthCustomStyle.UserCardPattern.translations.es.moreOptions.payWith;

        await test.step('OtpPage: logo, headings, channel change, resend and continue-as-guest overrides', async () => {
          const merchantLogoUrl = otpOverrides.Header.props.overrides.Logo.props.url;
          await paymentDeunaNowPage.assertMerchantLogoSrc(merchantLogoUrl);

          await paymentDeunaNowPage.assertOtpViewCustomStyles({
            ...otpOverrides.Headings.props,
            maskedPhone: `*****${userAddressCreditCard.userAddressCreditCardCO.phone.slice(-3)}`,
            resendCodeButton: otpOverrides.OtpResendButton.props,
            otpChangeChannelButton: otpOverrides.OtpChangeChannelButton.props,
            continueAsGuestButton: otpOverrides.ContinueAsGuestButton.props,
          });
        });

        await test.step('User logs in with the OTP code', async () => {
          await paymentDeunaNowPage.enterOTPCode();
        });

        await test.step('theme.colors: reapplied in the authenticated view', async () => {
          await paymentDeunaNowPage.assertThemeConfigCustomStyles({
            ...fullWidgetAuthCustomStyle.theme.colors,
            ...fullWidgetAuthCustomStyle.theme.typography,
          });
        });

        await test.step('UserCardPattern: saved cards list translations', async () => {
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(userCardTexts.seeAllMyCards);
          await paymentDeunaNowPage.clickOnSeeAllMyCards();
        });

        await test.step('UserCardPattern: "pay with selected card" copy', async () => {
          await paymentDeunaNowPage.selectTokenizedCard(activeCardLastFour);
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(payWithText);
        });

        await test.step('UserCardPattern: "add new card" copy', async () => {
          await paymentDeunaNowPage.clickOnSeeAllMyCards();
          await paymentDeunaNowPage.openCardActions(managedCardNumber.slice(-4));
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(addNewCardInfo);
        });

        await test.step('UserCardPattern: delete-card confirmation modal copy', async () => {
          await paymentDeunaNowPage.clickDeleteCardOption(
            managedCardNumber.slice(-4),
            userCardTexts.deleteMainText
          );

          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(
            userCardTexts.confirmDeleteMethodTitle
          );
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(
            userCardTexts.confirmDeleteMethod
          );
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(
            userCardTexts.confirmDeleteMethodAccept
          );
          await paymentDeunaNowPage.assertCustomStyleTextIsVisible(
            userCardTexts.confirmDeleteMethodCancel
          );

          await paymentDeunaNowPage.clickCancelDeleteCard(userCardTexts.confirmDeleteMethodCancel);
        });

        await test.step('TermsConditionsPattern.showForAuth: false — disclaimer hidden for logged-in users', async () => {
          await paymentDeunaNowPage.assertTermsAndConditionsDisclaimerIsHidden();
        });

        await test.step('LegalInfoPattern.hidePoweredBy + PaymentButtonPattern.hidePoweredBy: no powered-by image renders', async () => {
          await paymentDeunaNowPage.assertPoweredByDeunaIsHidden();
        });

        await test.step('PaymentButtonPattern: label and order total with the selected card', async () => {
          await paymentDeunaNowPage.selectTokenizedCard(activeCardLastFour);
          await paymentDeunaNowPage.assertPayButtonCustomStyles(
            { ...fullWidgetAuthCustomStyle.PaymentButtonPattern, amountDisplay },
            fullWidgetAuthCustomStyle.theme.colors
          );
        });
      }
    );
  }
);
