import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { FormsPage } from '@pages/explore/formsPage';
import { ClickToPayFormPage } from '@pages/explore/forms/clickToPayFormPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { avoidAntibot } from '@support/utils/avoidAntibot';
import { MessageFeed } from '@support/utils/MessageFeed';
import { retryGetClickToPayEmailOTP } from '@support/utils/retries';
import createBasicOrder from '@support/mocks/orders/basicOrder';
import { getCustomThemeConfig } from '@support/mocks/newThemeConfig';

const configMerchantVault = new ConfigMerchant();
const messageFeed = new MessageFeed();
let inboxObj = null;

const email = 'clicktopaydeunaqa20262027@temprelay.net';

const inboxId = '4243db64-67e6-4016-903f-5ba204e4cf43';

test.describe(
  '@regression Click to Pay Purchase - MX',
  { tag: ['@checkout', '@elements_link', '@click_to_pay'] },
  () => {
    let orderToken: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
      const merchantSetup = await configMerchantVault.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      privateKey = merchantSetup.privateKey;
      publicKey = merchantSetup.publicKey;

      const customConfig = {
        buttons: { borderRadius: '20px' },
        inputs: { borderRadius: '50%' },
      };
      const customThemeConfig = getCustomThemeConfig(customConfig);

      await checkoutConfigurationService.configClickToPay(merchantId, merchantToken, [
        { id: 'test', name: 'default', config: JSON.stringify(customThemeConfig) },
      ]);

      const basicOrder = createBasicOrder();
      const payloadOrder = {
        order: {
          ...basicOrder.order,
          shipping_address: {
            ...basicOrder.order.shipping_address,
            email: email,
          },
          billing_address: {
            ...basicOrder.order.billing_address,
            email: email,
          },
        },
      };

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, payloadOrder as any))
        .data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nuveiProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page }) => {
        await avoidAntibot(page);

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2342 CVV Field Validation for Registered Click to Pay Users',
      { tag: ['@smoke', '@team_payment_integration'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const formsPage = new FormsPage(page);
        const clickToPayFormPage = new ClickToPayFormPage(page);
        inboxObj = await messageFeed.getInboxById(inboxId);
        let otp: string | null = null;

        await test.step('Should select Click to Pay as a Payment Method', async () => {
          await paymentPage.selectPaymentMethod('Click to Pay (Payment Widget)');
        });

        await test.step('Should open Click To Pay Form', async () => {
          await formsPage.clickOnPay();
        });

        await test.step('Should see Collect Email Page Title', async () => {
          await clickToPayFormPage.assertClickToPayAuthFormIsVisible();
        });

        await test.step('User requests OTP via email', async () => {
          await clickToPayFormPage.clickOnSendOtp('email');
        });

        await test.step('User waits for OTP code', async () => {
          try {
            otp = await retryGetClickToPayEmailOTP(
              messageFeed.getClickToPayEmailOTP.bind(messageFeed),
              { inbox: inboxObj, unreadOnly: true },
              4, // maxRetries
              2000 // retryDelay (ms)
            );
          } catch (error) {
            console.log('OTP not received after retries:', error);
            otp = null;
          }
        });

        if (otp) {
          await clickToPayFormPage.waitForValidationRequest();
          await clickToPayFormPage.fillOtp(otp);
        } else {
          throw new Error('OTP could not be retrieved after retries');
        }

        await test.step('User clicks "Continue"', async () => {
          await clickToPayFormPage.clickOnContinueToAuthFlow();
        });
        await test.step('User sees available cards', async () => {
          await clickToPayFormPage.assertAvailableCards();
        });
        await test.step('User clicks "Continue" without adding CVV', async () => {
          await clickToPayFormPage.clickOnContinue();
        });
        await test.step('User sees CVV required error message', async () => {
          await clickToPayFormPage.assertCvvRequiredMessage();
          await page.waitForTimeout(1000);
        });
        await test.step('User enters valid CVV', async () => {
          await clickToPayFormPage.fillStandaloneCvv(
            creditCardData.clickToPayMastercardSuccess.cvv_code
          );
        });
        await test.step('User clicks "Continue" after entering CVV', async () => {
          await clickToPayFormPage.clickOnContinue();
          const cardsResponse = await clickToPayFormPage.waitResponseFromSaveCard();
          await clickToPayFormPage.assertCreateCardPayload(cardsResponse);
          await clickToPayFormPage.assertCreateCardResponse(cardsResponse);
        });
        await test.step('The thank you page should be displayed on the merchant', async () => {
          await paymentPage.assertThankyouPage('Pago completado');
        });
      }
    );
  }
);
