import { expect, test } from '@support/fixtures';
import { DaviplataPaymentFlowUntilOTP } from './share/daviplataPaymentFlowUntilOtp';
import { faker } from '@faker-js/faker';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DaviplataFormPage } from '@pages/explore/forms/daviplataFormPage';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';

const daviplataPaymentFlowUntilOtp = new DaviplataPaymentFlowUntilOTP();

const config = {
  PaymentMethodsPattern: {
    translations: {
      es: {
        paymentMethods: {
          payWith: 'PAGAR CON DAVIPLATA',
        },
        daviplata_content: {
          subtitle: 'Subtitle daviplata',
        },
        inputs: {
          userDocumentId: {
            label: 'Document DNI',
            placeholder: 'Placeholder DNI',
          },
        },
      },
    },
  },
  PaymentButtonPattern: {
    label: 'Pagar 🚀',
    hidePoweredBy: false,
    showOrderTotal: true,
    styles: {
      padding: '10px 20px',
      borderRadius: '25px',
    },
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

const elementsConfig = {
  theme_config: [
    {
      config: JSON.stringify(config),
      id: faker.string.uuid(),
      name: 'theme1',
    },
  ],
};

test.describe(
  '@regression Validate redirection to OTP page in Daviplata payment flow',
  {
    tag: [
      '@checkout',
      '@checkout_base',
      '@payment_widget',
      '@preprod',
      '@checkout_ui',
      '@team_payment_integration',
    ],
  },
  () => {
    let themeConfig;

    daviplataPaymentFlowUntilOtp.globalSetup({
      configurations: async (merchantId, merchantToken) => {
        const checkoutConfigService = ServiceFactory.getService(
          SERVICE_KEYS.CHECKOUT_CONFIGURATION
        );
        const result = (await checkoutConfigService.createConfigCheckoutV2({
          merchant_id: merchantId,
          merchant_token: merchantToken,
          config_checkout_v2_data: { elements_config: elementsConfig },
        })) as any;
        if (result) {
          themeConfig = JSON.parse(result.elements_config.theme_config[0].config);
        }
      },
    });
    daviplataPaymentFlowUntilOtp.testSetup();

    test('@ENTP1-T2107 Redirection to OTP Page (Daviplata)', async ({ page }) => {
      const daviplataFormPage = new DaviplataFormPage(page);

      const { inputDocumentNumber } = daviplataFormPage;

      await daviplataPaymentFlowUntilOtp.run({
        page,
        asserts: {
          documentNumberToBeVisible: async () => {
            expect(daviplataFormPage.iframeLocator(inputDocumentNumber)).toBeVisible();
          },
        },
        onFillDocumentNumber: async (number: string = '11111111') => {
          await daviplataFormPage.fillAndVerifyValue(
            daviplataFormPage.iframeLocator(inputDocumentNumber),
            number
          );
        },
      });
    });
  }
);
