import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import {
  assertIdentityDocumentDropdownOptions,
  validateDocumentFormat,
} from './share/validateDocumentFormat';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            ES: ['DNI', 'NIF', 'NIE', 'CIF', 'PP'],
          },
        },
      ],
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

test.describe(
  '@regression Payment Widget - Card Pattern identity document invalid format Spain',
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
      const merchant = await configMerchant.basicSetup('ES');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('ES', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.redsysProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
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
      '@ENTP1-T2533 [IdentityDocumentInput] Card Pattern - Invalid Format Spain: Verify all ES document type validations and successful payment with DNI',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const countryCode = 'ES';
        const documentTypes = {
          DNI: 'DNI',
          NIF: 'NIF',
          NIE: 'NIE',
          CIF: 'CIF',
          PP: 'PP',
        };

        await test.step('Open card payment form and verify dropdown shows all configured ES document types', async () => {
          await assertIdentityDocumentDropdownOptions(
            paymentDeunaNowPage,
            countryCode,
            documentTypes
          );
        });

        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.redsysVisaThreeDSFrictionlessWithoutThreeDSMethod,
            document_number: '',
          });
        });

        // DNI: 8 digits + 1 letter (mod-23 check). Example: 12345678Z
        await test.step('Validate DNI: rejects wrong check digit, accepts valid value', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            switchTo: documentTypes.DNI,
            invalidValue: '12345678A', // wrong check digit
            validValue: IDENTITY_DOCUMENTS.ES.DNI, // 12345678Z
          });
        });

        // NIF: same format and validation as DNI — used in fiscal/billing contexts
        await test.step('Validate NIF: rejects wrong check digit, accepts valid value', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            switchTo: documentTypes.NIF,
            invalidValue: '12345678A', // wrong check digit
            validValue: IDENTITY_DOCUMENTS.ES.NIF, // 12345678Z
          });
        });

        // NIE: X/Y/Z + 7 digits + 1 mod-23 check letter. Example: X1234567L
        await test.step('Validate NIE: rejects wrong check letter, accepts valid value', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            switchTo: documentTypes.NIE,
            invalidValue: 'X1234567A', // wrong check letter
            validValue: IDENTITY_DOCUMENTS.ES.NIE, // X1234567L
          });
        });

        // CIF: letter (entity type) + 7 digits + control char. Example: B12345674
        await test.step('Validate CIF: rejects wrong control character, accepts valid value', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            switchTo: documentTypes.CIF,
            invalidValue: 'B12345679', // wrong control digit
            validValue: IDENTITY_DOCUMENTS.ES.CIF, // B12345674
          });
        });

        // PP: alphanumeric 5–20 chars, no country-specific format
        await test.step('Validate Passport: rejects too-short value, accepts valid value', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            switchTo: documentTypes.PP,
            invalidValue: 'AB1', // below minimum length of 5
            validValue: IDENTITY_DOCUMENTS.ES.PP, // ABC12345
          });
        });

        // Switch back to DNI for the final payment step
        await test.step('Switch back to DNI and fill valid document number', async () => {
          await paymentDeunaNowPage.assertAndClickIdentityDocumentTypeDropdown();
          await paymentDeunaNowPage.selectIdentityDocumentType(countryCode, documentTypes.DNI);
          await paymentDeunaNowPage.fillInputDocumentNumber(IDENTITY_DOCUMENTS.ES.DNI);
          await paymentDeunaNowPage.blurInputDocumentNumber();
          await paymentDeunaNowPage.userDoesNotSeeErrors();
        });

        await test.step('Click Pay and validate processed purchase and payload values', async () => {
          await paymentDeunaNowPage.clickPay();
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);

          const purchasePayload = await paymentDeunaNowPage.getPurchaseRequestPayload();
          const cardIdentityInPayload = isV2PurchaseRequest(purchasePayload)
            ? purchasePayload?.payment_source?.card_info?.card_holder_dni
            : purchasePayload?.credit_card?.card_holder_dni;

          const identityTypeInPayload = isV2PurchaseRequest(purchasePayload)
            ? (purchasePayload?.payment_source?.card_info?.card_holder_dni_type ?? '')
            : (purchasePayload?.credit_card?.identity_document_type ??
              purchasePayload?.credit_card?.card_holder_dni_type ??
              purchasePayload?.billing_address?.identity_document_type ??
              purchasePayload?.payer?.identity_document_type);

          // DNI has submitValue: 'clean', so raw value is sent to the API
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(
            IDENTITY_DOCUMENTS.ES.DNI
          );
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be DNI`
          ).toBe('DNI');
        });
      }
    );
  }
);
