import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { NequiPushFormPage } from '@pages/explore/forms/nequiPushFormPage';
import { randomUUID } from 'crypto';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { verifyIframeVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { NequiMockingStrategy } from '../share/nequiMockingStrategy';
import { getOrderSuccessResponse } from '../share/order/success';

const configMerchant = new ConfigMerchant();
const customStyles = {
  PaymentMethodsPattern: {
    translations: {
      es: {
        paymentMethods: {
          payWith: 'PAGAR CON NEQUIPUSH',
        },
        nequiPushContent: {
          subtitle: 'Subtitle NEQUIPUSH',
          phonePlaceholder: 'label nequipush phone',
        },
      },
    },
  },
  PhoneVerificationView: {
    overrides: {
      Footer: {
        props: {
          hideCancelButton: true,
        },
      },
    },
  },
  nequi_push_voucher: {
    overrides: {
      LayoutsContainer: {
        alignment: 'bottom',
      },
    },
  },
  PaymentButtonPattern: {
    label: 'Pagar 🚀',
    showOrderTotal: true,
    styles: {
      padding: '10px 20px',
      borderRadius: '25px',
    },
  },
  LegalInfoPattern: {
    hidePoweredBy: true,
  },
  HeaderPattern: {
    overrides: {
      Logo: {
        props: {
          url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Logo_del_Gobierno_de_M%C3%A9xico_%282018%29.png',
          position: 'center',
        },
      },
    },
  },
};

// Configuración del widget con custom styles
const widgetConfigWithCustomStyles: apiCallNewman.ConfigurationV2 = {
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
        name: 'nequi_push_custom_styles',
        config: JSON.stringify(customStyles),
      },
    ],
  },
};

test.describe(
  '@regression Nequi Push with Custom Styles',
  {
    tag: [
      '@ds_phone_migration',
      '@ds_phone_migration_visual',
      '@checkout',
      '@checkout_base',
      '@payment_widget',
    ],
  },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      // Configuración básica del merchant para Colombia
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      // Aplicar custom styles al widget
      await apiCallNewman.configureVaultWidget(
        merchantId,
        merchantToken,
        widgetConfigWithCustomStyles
      );

      // Crear el procesador de Nequi Push
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nequiPushProcessor,
        merchantId,
        merchantToken
      );

      // Tokenizar orden de DeunaNow
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2498 Nequi Push payment with custom styles configuration',
      { tag: ['@visual', '@payments_integration', '@team_payment_integration', '@fixme_preprod'] },
      async ({ page }) => {
        const formsPage = new FormsPage(page);
        const nequiPushFormPage = new NequiPushFormPage(page);

        await test.step('Select NequiPush processor and assert phone number visibility', async () => {
          await formsPage.selectProcessorToEmbed('nequiPush');
          await nequiPushFormPage.scrollIntoPaymentEmbedIframe();
        });

        await test.step('Verify custom PaymentMethodsPattern text "PAGAR CON NEQUIPUSH"', async () => {
          const payWithText =
            nequiPushFormPage.iframePaymentWidget.getByText('PAGAR CON NEQUIPUSH');
          await expect(payWithText).toBeVisible();
        });

        await test.step('Verify custom nequiPushContent subtitle text', async () => {
          const subtitleText =
            nequiPushFormPage.iframePaymentWidget.getByText('Subtitle NEQUIPUSH');
          await expect(subtitleText).toBeVisible();
        });

        await test.step('Verify custom phone placeholder text', async () => {
          const phonePlaceholder =
            nequiPushFormPage.iframePaymentWidget.getByText('label nequipush phone');
          await expect(phonePlaceholder).toBeVisible();
        });

        await test.step('Verify custom PaymentButtonPattern label "Pagar 🚀"', async () => {
          const payButton = nequiPushFormPage.iframePaymentWidget.getByRole('button', {
            name: /Pagar 🚀/,
          });
          await expect(payButton).toBeVisible();
        });

        await test.step('Verify custom PaymentButtonPattern styles (padding and borderRadius)', async () => {
          const payButton = nequiPushFormPage.iframePaymentWidget.getByRole('button', {
            name: /Pagar 🚀/,
          });
          await expect(payButton).toHaveCSS('padding', '10px 20px');
          await expect(payButton).toHaveCSS('border-radius', '25px');
        });

        await test.step('Take visual snapshot of Nequi Push with custom styles', async () => {
          await page.waitForTimeout(1000);
          await verifyIframeVisualConsistency({
            frameLocator: nequiPushFormPage.iframePaymentWidget,
            viewports: commonViewportSets.desktopOnly,
            snapshotName: 'nequi-push-custom-styles',
          });
        });

        await test.step('Fill phone number', async () => {
          const phoneInput = nequiPushFormPage.iframePaymentWidget
            .locator('input[name="phone"]')
            .or(nequiPushFormPage.iframePaymentWidget.locator('input[type="tel"]'));
          await phoneInput.fill('3166225619');
          await page.waitForTimeout(1000);
        });

        await test.step('Mock Nequi verify response and click pay', async () => {
          const successInterceptors = NequiMockingStrategy.getCommonInterceptors().success;
          await nequiPushFormPage.interceptVerifyResponse(
            {
              body: successInterceptors.verify.body,
            },
            1
          );

          const modifiedResponse = {
            error: null,
            order: getOrderSuccessResponse(),
          };
          await nequiPushFormPage.clickOnPay({
            interceptorRequest: { body: modifiedResponse, status: 200 },
          });
          await nequiPushFormPage.assertSuccessPurchaseResponse();
        });

        await test.step('Verify phone verification page and successful payment', async () => {
          await nequiPushFormPage.assertPhoneVerificationPageToBeVisible();
        });

        await test.step('Verify "Cambiar método de pago" is not visible', async () => {
          const cambiarMetodo =
            nequiPushFormPage.iframePaymentWidget.getByText('Cambiar método de pago');
          await expect(cambiarMetodo).not.toBeVisible();
        });
      }
    );
  }
);
