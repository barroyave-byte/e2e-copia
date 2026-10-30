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

const configMerchant = new ConfigMerchant();

// Restricts the identity document dropdown to show all Colombia document types: CC, NIT, CE, PP, TI, CEL, DE, IDC, RC.
// Without this config, all document types registered for CO would be shown by default — here we explicitly enumerate all of them.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            CO: ['CC', 'NIT', 'CE', 'PP', 'TI', 'CEL', 'DE', 'IDC', 'RC'],
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
  '@regression Payment Widget - Card Pattern identity document invalid format Colombia',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes a CO order and applies the checkout modules config once before all tests.
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
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.openPayProcessorCO,
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
      '@ENTP1-T2528 [IdentityDocumentInput] Card Pattern - Invalid Format Colombia: Verify CC, NIT, CE and PASSPORT validation while switching document type and paying successfully with valid final input',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const countryCode = 'CO';
        const documentTypes = {
          CC: 'CC',
          NIT: 'NIT',
          CE: 'CE',
          PP: 'PP',
          TI: 'TI',
          CEL: 'CEL',
          DE: 'DE',
          IDC: 'IDC',
          RC: 'RC',
        };

        // Valid values meet each document type's format requirements for CO.
        const validCc = '1234567890'; // 10 digits (min 6, max 10)            | no separators (submitValue: clean)
        const validNit = '9001234567'; // exactly 10 digits                    | visualFormat: ###.###.###-# → '900.123.456-7' (submitValue: format)
        const validCe = '1234567'; // 7 digits (min 6, max 7)              | no visualFormat (submitValue: clean)
        const validPassport = 'AB123456'; // 2 letters + 6 digits (AA######)      | no separators (submitValue: clean)
        const validTi = '12345678901'; // 11 digits (min 7, max 11)            | no separators (submitValue: clean)
        const validCel = 'ABC1234567'; // 10 alphanumeric (min 6, max 15)      | no separators (submitValue: clean)
        const validDe = 'ABCDE12345'; // 10 alphanumeric (min 6, max 12)      | no separators (submitValue: clean)
        const validIdc = 'IDC12345678'; // 11 alphanumeric (min 6, max 12)      | no separators (submitValue: clean)
        const validRc = '2345678901'; // 10 digits (min 10, max 11)           | no separators (submitValue: clean)

        // Each entry defines the document type to test along with one invalid and one valid example.
        // The validation rules below reflect the CO document format constraints:
        //   CC:       6–10 numeric digits               | no separators (submitValue: clean)
        //   NIT:      exactly 10 numeric digits         | visualFormat: ###.###.###-# (submitValue: format)
        //   CE:       6–7 numeric digits                | no visualFormat (submitValue: clean)
        //   PP:       2 letters followed by 6 digits    | no separators (submitValue: clean)
        //   TI:       7–11 numeric digits               | no separators (submitValue: clean)
        //   CEL:      6–15 alphanumeric characters      | no separators (submitValue: clean)
        //   DE:       6–12 alphanumeric characters      | no separators (submitValue: clean)
        //   IDC:      6–12 alphanumeric characters      | no separators (submitValue: clean)
        //   RC:       10–11 numeric digits              | no separators (submitValue: clean)
        // expectedDisplayValue is set only for NIT which has a separator-based mask to verify
        // that the component correctly formats the input in real time.
        // The last entry repeats CC (the country default) to switch back and confirm the final payment
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
          { type: documentTypes.TI, invalidValue: '123456', validValue: validTi },
          { type: documentTypes.CEL, invalidValue: 'AB123', validValue: validCel },
          { type: documentTypes.DE, invalidValue: 'ABCD', validValue: validDe },
          { type: documentTypes.IDC, invalidValue: 'IDC12', validValue: validIdc },
          { type: documentTypes.RC, invalidValue: '123456789', validValue: validRc },
          { type: documentTypes.CC, invalidValue: '12345', validValue: validCc },
        ];

        // Asserts the form is visible, the dropdown shows CC as default, and all configured types appear in the list.
        await test.step('Open card payment form and verify dropdown only contains Colombia configured document types', async () => {
          await assertIdentityDocumentDropdownOptions(
            paymentDeunaNowPage,
            countryCode,
            documentTypes
          );
        });

        // Fills all card fields except document number so we can control it manually in each validation step.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.openpayMastercardSuccessful,
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

        await test.step('Click Pay and validate processed purchase and payload values for default document type', async () => {
          await paymentDeunaNowPage.clickPay();
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);

          const purchasePayload = await paymentDeunaNowPage.getPurchaseRequestPayload();
          const cardIdentityInPayload = isV2PurchaseRequest(purchasePayload)
            ? purchasePayload?.payment_source?.card_info?.card_holder_dni
            : purchasePayload?.credit_card?.card_holder_dni;

          // Different processors place the identity type in different payload fields.
          // We use fallback chaining to support all known processor response shapes.
          const identityTypeInPayload = isV2PurchaseRequest(purchasePayload)
            ? (purchasePayload?.payment_source?.card_info?.card_holder_dni_type ?? '')
            : (purchasePayload?.credit_card?.identity_document_type ??
              purchasePayload?.credit_card?.card_holder_dni_type ??
              purchasePayload?.billing_address?.identity_document_type ??
              purchasePayload?.payer?.identity_document_type);

          // CC has submitValue: 'clean', so the component strips the formatting and sends raw digits.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validCc);
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be CC`
          ).toBe('CC');
        });
      }
    );
  }
);
