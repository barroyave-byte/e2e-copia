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
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

const configMerchant = new ConfigMerchant();

// Restricts the identity document dropdown to show only CC, RUC and PASSPORT for Ecuador.
// Without this config, all document types registered for EC would be shown.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            EC: ['CC', 'RUC', 'PP'],
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
  '@regression Payment Widget - Card Pattern identity document invalid format Ecuador',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes an EC order and applies the checkout modules config once before all tests.
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2532 [IdentityDocumentInput] Card Pattern - Invalid Format Ecuador: Verify CC, RUC and PASSPORT validation while switching document type and paying successfully with valid final input',
      { tag: ['@team_enterprise', '@payment_widget'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminConnectionsPage = new AdminConnectionsPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        const countryCode = 'EC';
        const documentTypes = {
          CC: 'CC',
          RUC: 'RUC',
          PP: 'PP',
        };

        // Valid values meet each document type's format requirements for EC.
        const validCc = '1234567890'; // exactly 10 digits → mask #########-# → '123456789-0' (submitValue: clean)
        const validRuc = '1234567890123'; // exactly 13 digits → no separators (submitValue: clean)
        const validPassport = 'AB123456'; // 2 letters + 6 digits (AA######?)  → no separators (submitValue: clean)

        // Each entry defines the document type to test along with one invalid and one valid example.
        // The validation rules below reflect the EC document format constraints:
        //   CC:       exactly 10 numeric digits     | visualFormat: #########-# (submitValue: clean)
        //   RUC:      exactly 13 numeric digits     | no separators (submitValue: clean)
        //   PASSPORT: 2 letters + 6–7 digits        | no separators (submitValue: clean)
        // expectedDisplayValue is set for CC because its mask inserts a separator dash after the
        // 9th digit (e.g., '1234567890' → '123456789-0'), so we verify the component formats it.
        // Despite having a separator mask, CC uses submitValue: 'clean', meaning the dash is
        // stripped before the value is sent to the API.
        // The last entry repeats CC (the country default) to switch back and confirm the final
        // payment is submitted with the default document type.
        const documentValidations = [
          {
            type: documentTypes.CC,
            invalidValue: '123456789',
            validValue: validCc,
            expectedDisplayValue: '123456789-0',
          },
          { type: documentTypes.RUC, invalidValue: '12345678901', validValue: validRuc },
          { type: documentTypes.PP, invalidValue: '12', validValue: validPassport },
          {
            type: documentTypes.CC,
            invalidValue: '123456789',
            validValue: validCc,
            expectedDisplayValue: '123456789-0',
          },
        ];

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user goes to connections', async () => {
          await adminHomePage.goToConnections();
        });

        await test.step('The user configure a new connection', async () => {
          await adminConnectionsPage.configureConnection(
            ConnectionsAvailable.dlocal,
            processorsConfig.dlocalProcessorEC
          );
        });

        await test.step('The user navigates to the payment screen', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        // Asserts the form is visible, the dropdown shows CC as default, and all configured types (CC, RUC, PASSPORT) appear in the list.
        await test.step('Open card payment form and verify dropdown only contains Ecuador configured document types', async () => {
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

          // CC has submitValue: 'clean', so the mask separator is stripped and the raw digits are sent.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validCc);
          // V2Payment.buildIdentityCardInfo() (modular-checkout) writes the selected
          // document type into card_holder_dni_type. The final switch in the loop above
          // lands back on CC, so that's what the purchase payload carries.
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be ${documentTypes.CC}`
          ).toBe(documentTypes.CC);
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
