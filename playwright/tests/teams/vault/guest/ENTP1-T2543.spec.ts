import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import {
  assertIdentityDocumentDropdownOptions,
  validateDocumentFormat,
} from '../../checkout/payment_widget/share/validateDocumentFormat';

const configMerchant = new ConfigMerchant();

// CO (Colombia): CardPattern with identity_document required and supportedDocumentTypes configured.
// Restricts the identity document dropdown to CC, NIT, CE and PASSPORT for Colombia.
// BillingPattern disabled.
const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          validation: { required: true },
          supportedDocumentTypes: {
            CO: ['CC', 'NIT', 'CE', 'PP'],
          },
        },
      ],
    },
  },
];

const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
};

test.describe(
  '@regression [Vault][IdentityDocument] Change of Document Type and Validation',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    test.use({ viewport: { width: 1400, height: 900 } });
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const ecommercePage = new EcommercePage(page);
        await ecommercePage.clickOnProduct();
        await ecommercePage.addToCart();
        await ecommercePage.clickOnIconBasket();
        await testingTool.navigateToSelectOrderType();
      }
    );

    test(
      '@ENTP1-T2543 [Vault][IdentityDocument] Change of Document Type and Validation - Verify CC, NIT, CE and PASSPORT validation while switching document type in Vault',
      { tag: ['@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const countryCode = 'CO';
        const documentTypes = {
          CC: 'CC',
          NIT: 'NIT',
          CE: 'CE',
          PP: 'PP',
        };

        // Valid values meet each document type's format requirements for CO.
        const validCc = '1234567890'; // 10 digits (min 6, max 10)            | no separators (submitValue: clean)
        const validNit = '9001234567'; // exactly 10 digits                    | visualFormat: ###.###.###-# → '900.123.456-7' (submitValue: format)
        const validCe = '1234567'; // 7 digits (min 6, max 7)              | no visualFormat (submitValue: clean)
        const validPassport = 'AB123456'; // 2 letters + 6 digits (AA######)      | no separators (submitValue: clean)

        // Each entry defines the document type to test along with one invalid and one valid example.
        // The validation rules below reflect the CO document format constraints:
        //   CC:       6–10 numeric digits               | no separators (submitValue: clean)
        //   NIT:      exactly 10 numeric digits          | visualFormat: ###.###.###-# (submitValue: format)
        //   CE:       6–7 numeric digits                 | no visualFormat (submitValue: clean)
        //   PASSPORT: 2 letters followed by 6 digits     | no separators (submitValue: clean)
        // expectedDisplayValue is set only for NIT which has a separator-based mask to verify
        // that the component correctly formats the input in real time.
        // The last entry repeats CC (the country default) to switch back and confirm the final card save
        // is submitted with the default document type.
        const documentValidations = [
          { type: documentTypes.CC, invalidValue: '12345', validValue: validCc },
          {
            type: documentTypes.NIT,
            invalidValue: '123456789',
            validValue: validNit,
            expectedDisplayValue: '900.123.456-7',
          },
          { type: documentTypes.CE, invalidValue: '12345', validValue: validCe },
          { type: documentTypes.PP, invalidValue: 'A1234567', validValue: validPassport },
          { type: documentTypes.CC, invalidValue: '12345', validValue: validCc },
        ];

        // Fills all card fields except document number so we can control it manually in each validation step.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.mercadopagoMasterCardSuccessfulMX,
            document_number: '',
          });
        });

        // Iterates over each document type validation scenario.
        // - index 0 is the default type (CC), already selected — no dropdown switch needed.
        // - index > 0 requires switching the dropdown to a different type, which should also reset the input.
        for (const [
          index,
          { type, invalidValue, validValue, expectedDisplayValue },
        ] of documentValidations.entries()) {
          const stepLabel =
            index === 0
              ? `Validate ${type} default invalid and valid formats`
              : `Switch to ${type}, validate reset and invalid and valid formats`;

          await test.step(stepLabel, async () => {
            await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
              switchTo: index === 0 ? undefined : type,
              invalidValue,
              validValue,
              expectedDisplayValue,
            });
          });
        }

        await test.step('Save card and verify payload contains correct document type and value', async () => {
          const { createCard } = await vaultWidgetPage.clickOnSaveCard({ capture: 'createCard' });
          const requestBody = createCard.request.postDataJSON();
          console.log({ requestBody });
          expect(requestBody.card_holder_dni, `CHK: card_holder_dni is not valid`).toBe(validCc);
        });
      }
    );
  }
);
