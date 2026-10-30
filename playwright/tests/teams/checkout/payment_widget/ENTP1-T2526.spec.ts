import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';

import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import {
  assertIdentityDocumentDropdownOptions,
  validateDocumentFormat,
} from './share/validateDocumentFormat';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

const configMerchant = new ConfigMerchant();

// Restricts the identity document dropdown to show only DNI, CUIT, CUIL and PASSPORT for Argentina.
// Without this config, all document types registered for AR would be shown.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            AR: ['DNI', 'CUIT', 'CUIL', 'PP'],
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
  '@regression Payment Widget - Card Pattern identity document invalid format Argentina',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes an AR order and applies the checkout modules config once before all tests.
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('AR');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.dlocalProcessorPayconnectAR,
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
      '@ENTP1-T2526 [IdentityDocumentInput] Card Pattern - Invalid Format Argentina: Validate type switch and format rules for DNI/CUIT/PASSPORT',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const countryCode = 'AR';
        const documentTypes = {
          DNI: 'DNI',
          CUIT: 'CUIT',
          CUIL: 'CUIL',
          PP: 'PP',
        };

        // Valid values meet each document type's format requirements for AR.
        const validDni = '12345678'; // 8 digits (min 6, max 8) → mask ##.###.### → '12.345.678'
        const validCuit = '20123456786'; // 11 digits → mask ##-########-# → '20-12345678-6'
        const validCuil = '27123456789'; // 11 digits → mask ##-########-# → '27-12345678-9'
        const validPassport = 'ABC123456'; // 3 letters + 6 digits (pattern: AAA######)

        // Each entry defines the document type to test along with one invalid and one valid example.
        // The validation rules below reflect the AR document format constraints:
        //   DNI:      6–8 numeric digits            | visualFormat: ##.###.### (submitValue: format)
        //   CUIT:     11 numeric digits              | visualFormat: ##-########-# (submitValue: format)
        //   CUIL:     11 numeric digits              | visualFormat: ##-########-# (submitValue: format)
        //   PP:       3 letters + 6 digits (AAA######) | no separators (submitValue: clean)
        // expectedDisplayValue is set only for types with separator-based masks to verify
        // that the component correctly formats the input in real time.
        // The last entry repeats DNI (the country default) to switch back and confirm the final payment
        // is submitted with the default document type.
        const documentValidations = [
          {
            type: documentTypes.DNI,
            invalidValue: '12345',
            validValue: validDni,
            expectedDisplayValue: '12.345.678',
          },
          {
            type: documentTypes.CUIT,
            invalidValue: '20123',
            validValue: validCuit,
            expectedDisplayValue: '20-12345678-6',
          },
          {
            type: documentTypes.CUIL,
            invalidValue: '20123',
            validValue: validCuil,
            expectedDisplayValue: '27-12345678-9',
          },
          { type: documentTypes.PP, invalidValue: '12', validValue: validPassport },
          {
            type: documentTypes.DNI,
            invalidValue: '12345',
            validValue: validDni,
            expectedDisplayValue: '12.345.678',
          },
        ];

        // Asserts the form is visible, the dropdown shows DNI as default, and all configured types (DNI, CUIT, CUIL, PP) appear in the list.
        await test.step('Open card payment form and verify dropdown only contains Argentina configured document types', async () => {
          await assertIdentityDocumentDropdownOptions(
            paymentDeunaNowPage,
            countryCode,
            documentTypes
          );
        });

        // Fills all card fields except document number so we can control it manually in each validation step.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.dlocalVisaCardSuccessful,
            document_number: '',
          });
        });

        // Iterates over each document type validation scenario.
        // - index 0 is the default type (DNI), already selected — no dropdown switch needed.
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

          // DNI is masked in the view , but always must be sent without mask to the API
          expect(
            cardIdentityInPayload,
            `CHK: cardIdentityInPayload is not valid, it must be '12345678'`
          ).toBe('12345678');
        });
      }
    );
  }
);
