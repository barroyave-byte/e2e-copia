import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as crypto from 'crypto';
import { TestingFramework } from 'playwright/framework/core';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';
import { AdminEventsName } from '@tests/events/adminEventsName';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { createDefaultCampaignMSI } from '@support/interfaces/campaigns/campaignsObject';

const configMerchant = new ConfigMerchant();
const installments = '9';

test.describe(
  '@regression Payment Widget: Validates that the paymentProcessing event metadata is correct for credit card payments with GlobalPay',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: `${crypto.randomUUID()}12345@testuser.com`,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2312 Payment Widget: Validates that the paymentProcessing event metadata is correct for credit card payments with GlobalPay',
      {
        tag: [
          '@admin_connection',
          '@preprod',
          '@checkout_ui',
          '@admin-preprod',
          '@team_enterprise',
        ],
      },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'analytics.events.startCapture',
              params: {
                skip: [
                  AdminEventsName.ordersSectionAdmin,
                  AdminEventsName.msiSectionAdmin,
                  CheckoutEventsName.tagShown,
                ],
              },
              stepName: 'Start capturing analytics events before navigation',
            },
            {
              action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
              params: { merchantId: merchantId },
              stepName: 'Set merchant id & credentials and go to admin',
            },
            {
              action: 'admin.navigate.goToConnections',
              stepName: 'Go to connections section',
            },
            {
              action: 'admin.connections.configureConnection',
              params: {
                connectionName: ConnectionsAvailable.globalpay,
                processorData: processorsConfig.globalpayProcessor,
              },
              stepName: 'Configure a new connection psp',
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
              action: 'checkout.paymentWidget.userDoesNotSeeErrors',
              stepName: 'No card form errors are visible',
            },
            {
              action: 'checkout.paymentWidget.assertUserSeePaymentForm',
              stepName: 'The user sees the card payment form',
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
              params: { installments: '9' },
              stepName: 'Select 9 MSI installments',
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
                event: CheckoutEventsName.paymentProcessing,
                expected: {
                  methodType: 'credit_card',
                  processorName: processorsConfig.globalpayProcessor.name,
                },
                timeout: 5000,
              },
              stepName: 'Validate paymentProcessing event metadata',
            },
          ],
        });
      }
    );
  }
);
