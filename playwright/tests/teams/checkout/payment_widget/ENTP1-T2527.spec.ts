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

// Restricts the identity document dropdown to show only CPF, CNPJ and PP for Brazil.
// Without this config, all document types registered for BR would be shown.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            BR: ['CPF', 'CNPJ', 'PP'],
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
  '@regression Payment Widget - Card Pattern identity document invalid format Brazil',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes a BR order and applies the checkout modules config once before all tests.
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('BR');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.pagbankProcessor,
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
      '@ENTP1-T2527 [IdentityDocumentInput] Card Pattern - Invalid Format Brazil: Verify CPF/CNPJ/PASSPORT validation while switching document type and paying successfully with valid final input',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const countryCode = 'BR';
        const documentTypes = {
          CPF: 'CPF',
          CNPJ: 'CNPJ',
          PP: 'PP',
        };

        // Valid values meet each document type's format requirements for BR.
        const validCpf = '11144477735'; // 11 digits (Luhn-valid) → mask ###.###.###-## → '111.444.777-35'
        const validCnpj = '11222333000181'; // 14 digits (Luhn-valid) → mask ##.###.###/####-## → '11.222.333/0001-81'
        const validPassport = 'A1234567'; // 2 alphanumeric + 6 digits → no separators

        // Each entry defines the document type to test along with one invalid and one valid example.
        // The validation rules below reflect the BR document format constraints:
        //   CPF:      11 numeric digits (Luhn-validated)  | visualFormat: ###.###.###-## (submitValue: format)
        //   CNPJ:     14 numeric digits (Luhn-validated)  | visualFormat: ##.###.###/####-## (submitValue: format)
        //   PP:       2 alphanumeric + 6–7 digits         | no separators (submitValue: clean)
        // expectedDisplayValue is set only for types with separator-based masks to verify
        // that the component correctly formats the input in real time.
        // The last entry repeats CPF (the country default) to switch back and confirm the final payment
        // is submitted with the default document type.
        const documentValidations = [
          {
            type: documentTypes.CPF,
            invalidValue: '1234567890',
            validValue: validCpf,
            expectedDisplayValue: '111.444.777-35',
          },
          {
            type: documentTypes.CNPJ,
            invalidValue: '123456780001',
            validValue: validCnpj,
            expectedDisplayValue: '11.222.333/0001-81',
          },
          { type: documentTypes.PP, invalidValue: '12', validValue: validPassport },
          {
            type: documentTypes.CPF,
            invalidValue: '1234567890',
            validValue: validCpf,
            expectedDisplayValue: '111.444.777-35',
          },
        ];

        // Asserts the form is visible, the dropdown shows CPF as default, and all configured types appear in the list.
        await test.step('Open card payment form and verify dropdown only contains Brazil configured document types', async () => {
          await assertIdentityDocumentDropdownOptions(
            paymentDeunaNowPage,
            countryCode,
            documentTypes
          );
        });

        // Fills all card fields except document number so we can control it manually in each validation step.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.pagbankVisaSuccessfulProcessing,
            document_number: '',
          });
        });

        // Iterates over each document type validation scenario.
        // - index 0 is the default type (CPF), already selected — no dropdown switch needed.
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

          const purchasePayload = await Promise.race([
            paymentDeunaNowPage.getPurchaseRequestPayload(),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('getPurchaseRequestPayload timeout after 15s')),
                15_000
              )
            ),
          ]);
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

          // CPF is masked in the view , but always must be sent without mask to the API
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(
            '11144477735'
          );
          expect(identityTypeInPayload, `CHK: identityTypeInPayload is not valid`).toBe(
            documentTypes.CPF
          );
        });
      }
    );
  }
);
