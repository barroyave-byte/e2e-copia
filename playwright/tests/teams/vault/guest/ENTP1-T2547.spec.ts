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
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

const configMerchant = new ConfigMerchant();

// CO (Colombia): CardPattern with identity_document required and supportedDocumentTypes,
// BillingPattern enabled with identity_document optional.
// Validates payload mapping for card_holder_dni, identity_document_type and billing identity.
const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          validation: { required: true },
          supportedDocumentTypes: {
            CO: ['CC', 'NIT', 'CE', 'PASSPORT'],
          },
        },
      ],
    },
  },
  {
    name: 'BillingPattern',
    props: {
      fields: [
        { name: 'address1', validation: { required: true } },
        { name: 'state_name', validation: { required: true } },
        { name: 'city', validation: { required: true } },
        {
          name: 'identity_document',
          validation: { required: false },
        },
      ],
      show_in_main_view: false,
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
  '@regression [Vault][IdentityDocument] Payload Mapping',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
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
      '@ENTP1-T2547 [Vault][IdentityDocument] Payload Mapping - Validate card_holder_dni, identity_document_type and billing identity in payloads',
      { tag: ['@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        // CO CC: 6–10 numeric digits, no visual separator (submitValue: clean).
        const validCC = IDENTITY_DOCUMENTS.CO.CC; // '1234567890'
        const orderDocumentNumber = '12345678';
        const expectedDocumentType = 'CC';

        await test.step('Fill card form with valid CC identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.mercadopagoMasterCardSuccessfulMX,
            document_number: validCC,
          });
        });

        await test.step('Open Billing, fill required fields, leave Billing identity document empty', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('Save card and verify payload contains correct document type and value', async () => {
          const { createCard, purchase } = await vaultWidgetPage.clickOnSaveCard({
            capture: ['createCard', 'purchase'],
          });
          const requestBody = createCard.request.postDataJSON();
          expect(requestBody.card_holder_dni, `CHK: card_holder_dni is not valid`).toBe(validCC);

          const purchasePayload = purchase.request.postDataJSON();

          expect(
            purchasePayload?.payer_info?.card_holder_dni,
            `CHK: card_holder_dni is not valid`
          ).toBe(orderDocumentNumber);
          expect(
            purchasePayload?.order.billing_address?.identity_document,
            `CHK: billing_address identity_document is not valid`
          ).toBe(orderDocumentNumber);
          expect(
            purchasePayload?.order.shipping_address?.identity_document,
            `CHK: shipping_address identity_document is not valid`
          ).toBe(orderDocumentNumber);

          expect(
            purchasePayload?.order?.billing_address.identity_document_type,
            `CHK: billing_address identity_document_type is not valid`
          ).toBe(expectedDocumentType);
          expect(
            purchasePayload?.order?.shipping_address.identity_document_type,
            `CHK: shipping_address identity_document_type is not valid`
          ).toBe(expectedDocumentType);
        });
      }
    );
  }
);
