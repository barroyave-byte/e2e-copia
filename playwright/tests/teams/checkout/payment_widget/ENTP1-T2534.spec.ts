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
import { validateDocumentFormat } from './share/validateDocumentFormat';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

const configMerchant = new ConfigMerchant();

// Uruguay only has CI as a document type, so the dropdown is disabled — it renders as a static
// prefix label rather than a clickable selector. The supportedDocumentTypes config below is
// included for consistency with other tests, even though CI is the only option available.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            UY: ['CI'],
          },
        },
      ],
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

const countryCode = 'UY';

test.describe(
  '@regression Payment Widget - Card Pattern identity document invalid format Uruguay',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes a UY order and applies the checkout modules config once before all tests.
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup(countryCode);
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('UY', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2534 [IdentityDocumentInput] Card Pattern - Invalid Format Uruguay: Verify CI validation and successful payment with valid input',
      { tag: ['@team_enterprise', '@payment_widget'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminConnectionsPage = new AdminConnectionsPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        // Uruguay only defines CI. The validation rules are:
        //   CI: 7–8 numeric digits | visualFormat: #.###.###-# (submitValue: clean)
        // The mask inserts dots and a dash while typing (e.g., '12345678' → '1.234.567-8'),
        // but submitValue: 'clean' strips the separators before sending to the API.
        // Valid CI: 8 digits (max length).
        // Invalid CI: fewer than 7 digits (below the required minimum length).
        const validCi = '12345678'; // 8 digits → mask #.###.###-# → '1.234.567-8' (submitValue: clean → sends '12345678')
        const invalidCi = '123456'; // 6 digits — below min length of 7

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
            processorsConfig.dlocalProcessorUY
          );
        });

        await test.step('The user navigates to the payment screen', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        // Uruguay has only one document type (CI), so the dropdown is disabled and shows only the
        // CI prefix. We verify the field is visible and displays CI but do NOT attempt to click
        // it or check for other options, unlike multi-document-type countries.
        await test.step('Open card payment form and verify dropdown shows CI as the only (disabled) document type', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toBeVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toContainText('CI');
        });

        // Fills all card fields except document number so we can control it manually.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.dlocalVisaCardSuccessfulUY,
            document_number: '',
          });
        });

        // Validates that typing an invalid CI shows an error, and a valid CI clears it.
        // Also verifies the mask correctly formats '12345678' → '1.234.567-8' in the input field.
        // No document type switching is needed since CI is the only option for Uruguay.
        await test.step('Validate CI invalid and valid formats', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            invalidValue: invalidCi,
            validValue: validCi,
            expectedDisplayValue: '1.234.567-8',
          });
        });

        await test.step('Click Pay and validate processed purchase and payload values', async () => {
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

          // CI has submitValue: 'clean', so the mask separators are stripped and raw digits are sent.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validCi);
          // V2Payment.buildIdentityCardInfo() (modular-checkout) writes the selected
          // document type into card_holder_dni_type. Uruguay only offers CI.
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be CI`
          ).toBe('CI');
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
