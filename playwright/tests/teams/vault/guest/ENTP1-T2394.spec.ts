import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig, newElementsConfig } from '@support/mocks/newThemeConfig';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { userEmail } from '@support/interfaces/orders';
import { randomUUID } from 'crypto';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: true,
      fields: [
        {
          name: 'identity_document',
          validation: {
            required: true,
          },
        },
      ],
    },
  },
];
const customThemeConfig = {
  BillingPattern: {
    translations: {
      es: {
        inputs: {
          errors: {
            identityDocument: 'Número de CPF o CNPJ incorrecto ✅',
            inputRequired: 'Campo obligatorio ✅',
            invalidEmail: 'Email inválido ✅',
            invalidZipcode: 'Código postal incorrecto ✅',
            phoneInvalid: 'Teléfono no válido ✅',
          },
          personBilling: {
            identityDocument: {
              errorMessage: 'Debe ser un documento de identidad válido. ✅',
              invalidByCountry: {
                AR: 'DNI o identificación incorrecta ✅',
                BR: 'CPF o CNPJ inválido ✅',
                CL: 'RUT o DNI incorrecto ✅',
                CO: 'Cédula no válida ✅',
                EC: 'Cédula no válida ✅',
                MX: 'RFC incorrecto ✅',
                UY: 'Cédula no válida ✅',
              },
              label: {
                CO: 'Cédula / Doc de identidad',
                CL: 'RUT/DNI',
                EC: 'Cédula / Doc de identidad',
                MX: 'RFC ✅',
                BR: 'CPF/ CNPJ',
                AR: 'DNI / Doc de identidad',
                UY: 'Cédula / Doc de identidad',
                PE: 'DNI / Doc de identidad',
                CR: 'DNI / Doc de identidad',
                ES: 'DNI / Doc de identidad',
                default: 'Documento de identidad',
              },
            },
          },
        },
        title: 'Dirección de la tarjeta',
      },
    },
  },
};
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customThemeConfig),
      },
    ],
  },
};

test.describe(
  '@regression Validate field identity_document visibility',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);

      const email = userEmail();
      const orderBody = DeunacheckoutOrderBuilder.createBody('MX');

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2394 Validate identity document for billing and card pattern',
      { tag: ['@smoke', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Assert card identity document label is visible', async () => {
          await vaultWidgetPage.assertCardIdentityDocumentLabelIsVisible();
        });

        await test.step('Assert billing identity document label is visible', async () => {
          await vaultWidgetPage.assertTextIsVisible(
            customThemeConfig.BillingPattern.translations.es.inputs.personBilling.identityDocument
              .label.MX
          );
        });
      }
    );
  }
);
