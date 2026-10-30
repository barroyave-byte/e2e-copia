import * as crypto from 'crypto';
import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { createDefaultCampaignMSI } from '@support/interfaces/campaigns/campaignsObject';
import * as creditCardData from '@support/interfaces/credit_cards';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { TestingFramework } from 'playwright/framework/core';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

const installments = '3';

test.describe(
  '@regression Payment Widget: Validates metadata of onInstallmentSelected event when installments are deselected',
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
      const configMerchant = new ConfigMerchant();

      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: `${crypto.randomUUID()}12345@testuser.com`,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2349 Payment Widget: Validates metadata of onInstallmentSelected event when installments are deselected',
      { tag: ['@fixme_preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'analytics.events.startCapture',
              stepName: 'Start capturing analytics events before navigation',
            },
            {
              action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
              params: { merchantId: merchantId },
              stepName: 'Go to admin and set merchant id',
            },
            {
              action: 'admin.consolidatedFlows.configureInstallmentCampaign',
              params: { campaign: createDefaultCampaignMSI(installments) },
              stepName: 'Configure MSI campaign from admin',
            },
            {
              action: 'checkout.openCheckout',
              params: {
                privateKey: privateKey,
                publicKey: publicKey,
                orderToken: orderToken,
                experienceType: 'Payment Widget',
              },
              stepName: 'Navigate to the payment screen as guest user',
            },
            {
              action: 'checkout.paymentWidget.assertUserSeePaymentForm',
              stepName: 'The user sees the card payment form',
            },
            {
              action: 'checkout.paymentWidget.userDoesNotSeeErrors',
              stepName: 'No card form errors are visible',
            },
            {
              action: 'checkout.paymentWidget.fillCardNumber',
              params: { number: creditCardData.uatpSuccess.number },
              stepName: 'Insert credit card without installments',
            },
            {
              action: 'checkout.paymentWidget.userDoesNotSeeInstallmentsDropdown',
              stepName: 'Installments dropdown is not shown for non-eligible card',
            },
            {
              action: 'checkout.paymentWidget.clickClosestClearButton',
              params: { fieldName: 'cardNumber' },
              stepName: 'Clear card number input',
            },
            {
              action: 'checkout.paymentWidget.fillCreditCardData',
              params: {
                creditCardData: creditCardData.globalpayVisaSuccessful,
                opts: { country: 'CO' },
              },
              stepName: 'Insert credit card with installments campaign',
            },
            {
              action: 'checkout.paymentWidget.userSeesInstallmentsDropdown',
              stepName: 'Installments dropdown is shown for eligible card',
            },
            {
              action: 'checkout.installments.selectMSI',
              params: { installments: '3' },
              stepName: 'Select 3 MSI installments',
            },
            {
              action: 'checkout.paymentWidget.selectInstallmentDeselected',
              stepName: 'Deselect installment option',
            },
            {
              action: 'checkout.paymentWidget.clickOnPayButton',
              params: { withResponse: false },
              stepName: 'Click pay button',
            },
            {
              action: 'analytics.events.verifyMetadata',
              params: {
                event: CheckoutEventsName.onInstallmentSelected,
                expected: {
                  cardBin: expect.stringMatching(
                    new RegExp(`^${creditCardData.globalpayVisaSuccessful.number.slice(0, 6)}`)
                  ),
                  cardIndex: 0,
                  installments: 1,
                  plan_option_id: '00000000-0000-0000-0000-000000000000',
                },
                timeout: 5000,
              },
              stepName: 'Validate onInstallmentSelected event metadata',
            },
          ],
        });
      }
    );
  }
);
