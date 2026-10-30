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

// Restricts the identity document dropdown to show only RUT and PP for Chile.
// Without this config, all document types registered for CL would be shown.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            CL: ['RUT', 'PP'],
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
  '@regression Payment Widget - Card Pattern identity document invalid format Chile',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes a CL order and applies the checkout modules config once before all tests.
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('CL');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.dlocalProcessor,
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
      '@ENTP1-T2530 [IdentityDocumentInput] Card Pattern - Invalid Format Chile: Verify RUT and PASSPORT validation while switching document type and paying successfully with valid final input',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const countryCode = 'CL';
        const documentTypes = {
          RUT: 'RUT',
          PP: 'PP',
        };

        // Valid values meet each document type's format requirements for CL.
        // RUT check digit algorithm: 11 - (sum of digit × cyclic weight [2..7]) % 11;
        // result 10 → 'K', result 11 → '0'.
        const validRut = '9068826K'; // 7 digits + K (8 chars) → mask #?#.###.###-* → '9.068.826-K'
        const validPassport = 'AB123456'; // 2 alphanumeric + 6 digits (pattern: **#######?) → no separators

        // Each entry defines the document type to test along with one invalid and one valid example.
        // The validation rules below reflect the CL document format constraints:
        //   RUT:      8–9 chars: 7–8 digits + check digit ([0-9K]) | visualFormat: #?#.###.###-* (submitValue: format)
        //             Also validated by the rut.js library (check-digit algorithm).
        //   PP:       2 alphanumeric + 6–7 digits                  | no separators (submitValue: clean)
        // expectedDisplayValue is set for RUT which has a separator-based mask to verify
        // that the component correctly formats the input in real time.
        // The last entry repeats RUT (the country default) to switch back and confirm the final payment
        // is submitted with the default document type.
        const documentValidations = [
          {
            type: documentTypes.RUT,
            invalidValue: '12345',
            validValue: validRut,
            expectedDisplayValue: '9.068.826-K',
          },
          { type: documentTypes.PP, invalidValue: '12', validValue: validPassport },
          {
            type: documentTypes.RUT,
            invalidValue: '12345',
            validValue: validRut,
            expectedDisplayValue: '9.068.826-K',
          },
        ];

        // Asserts the form is visible, the dropdown shows RUT as default, and all configured types (RUT, PP) appear in the list.
        await test.step('Open card payment form and verify dropdown only contains Chile configured document types', async () => {
          await assertIdentityDocumentDropdownOptions(
            paymentDeunaNowPage,
            countryCode,
            documentTypes
          );
        });

        // Fills all card fields except document number so we can control it manually in each validation step.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.dlocalMasterCardSuccessful,
            document_number: '',
          });
        });

        // Iterates over each document type validation scenario.
        // - index 0 is the default type (RUT), already selected — no dropdown switch needed.
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

          // RUT has submitValue: 'format', so the component sends the masked value to the API.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe('9068826K');
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be RUT`
          ).toBe('RUT');
        });
      }
    );
  }
);
