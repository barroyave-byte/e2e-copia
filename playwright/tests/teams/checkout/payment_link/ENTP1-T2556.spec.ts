import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

const configMerchant = new ConfigMerchant();

// Restricts the identity document dropdown to show only CC, NIT, and CE for Colombia.
// CardPattern is only valid inside createConfigurationV2 (widgetGeneralsConfig.checkout_modules),
// not inside the order's checkout_modules. The order checkout_modules is for flow modules only
// (LoginPattern, BillingPattern, etc.).
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            CO: ['CC', 'NIT', 'CE'],
          },
        },
      ],
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

const countryCode = 'CO';

test.describe(
  '@regression Payment Link - Card Pattern identity document multiple types Colombia',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    test.use({ viewport: { width: 1400, height: 900 } });
    // Sets up merchant config, registers user, tokenizes a CO payment link order with
    // checkout_modules config, and registers the processor once before all tests.
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
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder(countryCode, privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
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
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2556 [IdentityDocumentInput][Payment Link][CO] Purchase exitoso con múltiples tipos de documento',
      { tag: ['@team_enterprise', '@payment_link'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup', { timeout: 20000 });
        const paymentPage = new PaymentPage(paymentLinkPage);

        const documentTypes = {
          CC: 'CC',
          NIT: 'NIT',
          CE: 'CE',
        };

        // Valid values meet each document type's format requirements for CO.
        // CO validation rules:
        //   CC:  6–10 numeric digits                | no separator (submitValue: clean)
        //   NIT: exactly 10 numeric digits          | visualFormat: ###.###.###-# (submitValue: format)
        //   CE:  6–7 numeric digits                 | no separator (submitValue: clean)
        // The final payment is submitted with CE (the last type switched to).
        const validCc = '12345678'; // 8 digits — within the valid range of 6–10
        const validNit = '9001234567'; // 10 digits — exactly the required length
        const validCe = '1234567'; // 7 digits — within the valid range of 6–7

        const invalidCc = '12345'; // 5 digits — below min length of 6
        const invalidNit = '123456789'; // 9 digits — below min length of 10
        const invalidCe = '12345'; // 5 digits — below min length of 6

        // Asserts the form is visible, the dropdown shows CC as default, and all configured
        // types (CC, NIT, CE) appear in the list — no other CO types should be visible.
        await test.step('Verify dropdown shows CC, NIT, CE as the only configured document types', async () => {
          await paymentPage.assertIdentityDocumentDropdownOptions(countryCode, documentTypes);
        });

        // Fills all card fields except document number so we can control it manually
        // in each validation step below.
        await test.step('Fill card form without identity document', async () => {
          await paymentPage.fillCreditCardDataWithBase({
            ...creditCardData.globalpayVisaSuccessful,
            document_number: '',
          });
        });

        // Iterates over each document type validation scenario.
        // - index 0 is the default type (CC), already selected — no dropdown switch needed.
        // - index > 0 requires switching the dropdown to a different type, which should also reset the input.
        // NIT has a separator mask: ###.###.###-# → expectedDisplayValue verifies the visual formatting.
        const documentValidations = [
          { type: documentTypes.CC, invalidValue: invalidCc, validValue: validCc },
          {
            type: documentTypes.NIT,
            invalidValue: invalidNit,
            validValue: validNit,
            expectedDisplayValue: '900.123.456-7',
          },
          { type: documentTypes.CE, invalidValue: invalidCe, validValue: validCe },
        ];

        for (const [
          index,
          { type, invalidValue, validValue, expectedDisplayValue },
        ] of documentValidations.entries()) {
          const stepLabel =
            index === 0
              ? `Validate ${type} default invalid and valid formats`
              : `Switch to ${type}, validate reset and invalid and valid formats`;

          await test.step(stepLabel, async () => {
            await paymentPage.validateDocumentFormat(countryCode, {
              switchTo: index === 0 ? undefined : type,
              invalidValue,
              validValue,
              expectedDisplayValue,
            });
          });
        }

        await test.step('Click Pay and validate processed purchase and payload values', async () => {
          await paymentPage.clickOnPay(paymentLinkPage);
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200);

          const purchaseResponse = await paymentPage.responsePromise;
          const requestBody = purchaseResponse.request().postDataJSON();
          const cardIdentityInPayload = isV2PurchaseRequest(requestBody)
            ? requestBody?.payment_source?.card_info?.card_holder_dni
            : requestBody?.credit_card?.card_holder_dni;

          // Different processors place the identity type in different payload fields.
          // We use fallback chaining to support all known processor response shapes.
          const identityTypeInPayload = isV2PurchaseRequest(requestBody)
            ? requestBody?.payment_source?.card_info?.card_holder_dni_type
            : (requestBody?.credit_card?.identity_document_type ??
              requestBody?.credit_card?.card_holder_dni_type ??
              requestBody?.billing_address?.identity_document_type ??
              requestBody?.payer?.identity_document_type);

          // CE has submitValue: 'clean', so the raw digits are sent (no formatting separators).
          expect(cardIdentityInPayload).toBe(validCe);
          expect(identityTypeInPayload).toBe(documentTypes.CE);
        });
      }
    );
  }
);
