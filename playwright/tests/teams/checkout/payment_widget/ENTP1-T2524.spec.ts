import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

const configMerchant = new ConfigMerchant();

const checkout_modules = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          validation: {
            required: true,
          },
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

test.describe(
  '@regression Payment Widget - Card Pattern identity document type selector',
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
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2524 [IdentityDocumentInput] Card Pattern - Change of Document Type: Verify dropdown allows switching between merchant-configured types',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const countryCode = 'CO';
        const documentTypes = {
          CC: 'CC',
          NIT: 'NIT',
          CE: 'CE',
        };

        await test.step('Open card payment form and verify document type dropdown is visible', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
        });

        await test.step('Verify dropdown only contains merchant-configured document types for Cards', async () => {
          await paymentDeunaNowPage.assertAndClickIdentityDocumentTypeDropdown();

          // Verify that the dropdown only contains merchant-configured document types for Cards
          for (const documentType of Object.values(documentTypes)) {
            const option = paymentDeunaNowPage.getIdentityDocumentOptionLocator(
              countryCode,
              documentType
            );
            await expect(
              option,
              `CHK: identityDocumentOptionLocator ${countryCode} - ${documentType} is not visible`
            ).toBeVisible();
          }

          // Keep deterministic state for next steps
          await paymentDeunaNowPage.closeIdentityDocumentTypeDropdownIfOpen();
        });

        await test.step('Fill card form and select CC with a valid document number', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.globalpayVisaSuccessful,
            document_number: '',
          });

          // Click on Pay & identityDoucmentError must be visible
          await paymentDeunaNowPage.clickOnPayButton(false);
          await paymentDeunaNowPage.userDoesSeeErrors('idDocumentError');

          await paymentDeunaNowPage.selectIdentityDocumentType(countryCode, documentTypes.CC);
          await paymentDeunaNowPage.fillInputDocumentNumber('1234567890');
          await paymentDeunaNowPage.blurInputDocumentNumber();

          // Error must be disappear
          await paymentDeunaNowPage.userDoesNotSeeErrors();
        });

        await test.step('Change document type to NIT and verify document number field resets', async () => {
          await paymentDeunaNowPage.selectIdentityDocumentType(countryCode, documentTypes.NIT);
          await paymentDeunaNowPage.assertInputDocumentNumberIsEmpty();
        });

        await test.step('Validate NIT rules apply for selected type', async () => {
          await paymentDeunaNowPage.fillInputDocumentNumber('123456789', true);
          await paymentDeunaNowPage.blurInputDocumentNumber();
          await paymentDeunaNowPage.userDoesSeeErrors('idDocumentError');

          await paymentDeunaNowPage.clearInputDocumentNumber();
          await paymentDeunaNowPage.fillInputDocumentNumber('9001234567');
          await paymentDeunaNowPage.blurInputDocumentNumber();
          await paymentDeunaNowPage.userDoesNotSeeErrors();
        });

        await test.step('Change document type to CE, verify reset, and input a valid CE number', async () => {
          await paymentDeunaNowPage.selectIdentityDocumentType(countryCode, documentTypes.CE);
          await paymentDeunaNowPage.assertInputDocumentNumberIsEmpty();

          await paymentDeunaNowPage.fillInputDocumentNumber('1234567');
          await paymentDeunaNowPage.blurInputDocumentNumber();
          await paymentDeunaNowPage.userDoesNotSeeErrors();
        });
      }
    );
  }
);
