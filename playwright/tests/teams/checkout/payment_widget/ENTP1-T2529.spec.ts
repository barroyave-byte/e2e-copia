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
import { EcommercePage } from '@pages/explore/ecommercePage';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

const configMerchant = new ConfigMerchant();

// Restricts the identity document dropdown to show only RFC, CURP and PP for Mexico.
// Without this config, all document types registered for MX would be shown.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            MX: ['RFC', 'CURP', 'PP'],
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
  '@regression Payment Widget - Card Pattern identity document invalid format Mexico',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes an MX order and applies the checkout modules config once before all tests.
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.openPayProcessor,
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
      '@ENTP1-T2529 [IdentityDocumentInput] Card Pattern - Invalid Format Mexico: Verify CURP, RFC and PASSPORT validation while switching document type and paying successfully with valid final input',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const ecommercePage = new EcommercePage(page);

        const countryCode = 'MX';
        const documentTypes = {
          RFC: 'RFC',
          CURP: 'CURP',
          PP: 'PP',
        };

        // Valid values meet each document type's format requirements for MX.
        const validRfc = 'ABCD123456EF'; // 12 alphanumeric → no separators
        const validCurp = 'ABCD123456EFGHIJ12'; // exactly 18 alphanumeric → no separators
        const validPassport = 'ABC123456'; // 3 uppercase letters + 6 digits → no separators

        // Each entry defines the document type to test along with one invalid and one valid example.
        // The validation rules below reflect the MX document format constraints:
        //   RFC:      12–13 alphanumeric characters | no separators (submitValue: clean)
        //   CURP:     exactly 18 alphanumeric characters | no separators (submitValue: clean)
        //   PP:       3 uppercase letters + 6 digits (AAA######) | no separators (submitValue: clean)
        // None of the MX document types use separator-based masks, so expectedDisplayValue is
        // not set for any entry — the component does not reformat the input in real time.
        // The last entry repeats RFC (the country default) to switch back and confirm the final
        // payment is submitted with the default document type.
        const documentValidations: Array<{
          type: string;
          invalidValue: string;
          validValue: string;
          expectedDisplayValue?: string;
        }> = [
          { type: documentTypes.RFC, invalidValue: 'ABCD12345', validValue: validRfc },
          { type: documentTypes.CURP, invalidValue: 'ABCD123456EFGHIJ', validValue: validCurp },
          { type: documentTypes.PP, invalidValue: '12', validValue: validPassport },
          { type: documentTypes.RFC, invalidValue: 'ABCD12345', validValue: validRfc },
        ];

        // Asserts the form is visible, the dropdown shows RFC as default, and all configured types appear in the list.
        await test.step('Open card payment form and verify dropdown only contains Mexico configured document types', async () => {
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
        // - index 0 is the default type (RFC), already selected — no dropdown switch needed.
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

          // RFC has submitValue: 'clean', so the component sends the raw value to the API (no formatting separators).
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validRfc);
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be RFC`
          ).toBe('RFC');
          await ecommercePage.assertBackToHomeButtonIsVisible();
        });
      }
    );
  }
);
