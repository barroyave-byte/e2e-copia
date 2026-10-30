import { test } from '@support/fixtures';
import { ref, TestingFramework } from 'playwright/framework/core';
import {
  SHIPPING_CONTACT_NAME,
  CONTACT_PHONE_AS_STRING,
  CONTACT_PHONE_LONG_AS_STRING,
  CONTACT_PHONE_LONG_NUMERIC,
  CONTACT_PHONE_NUMERIC,
  SHIPPING_CONTACT_STORE_NAME,
  orderWithShippingContactPhone,
} from '@support/interfaces/orders';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression EMA shipping contact phone serialisation', () => {
  test(
    '@PLAT-T1624 Order with numeric shipping_options.details.contact.phone reaches admin without DP-4004',
    { tag: ['@team_platform', '@api'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            stepName: 'Create an MX merchant (MXN)',
            params: { country: 'MX' },
          },
          {
            action: 'setup.processor.createProcessor',
            stepName: 'Configure the merchant payment processor',
            params: { processorConfig: processorsConfig.kushkiProcessor },
            saveAs: 'processorId',
          },

          {
            action: 'setup.order.tokenizeOrder',
            stepName: 'Tokenize an order with phone as an integer (593983092404)',
            // expectError so a rejection reaches the assertion below as a status diff.
            params: {
              orderData: orderWithShippingContactPhone(CONTACT_PHONE_NUMERIC),
              expectError: true,
            },
            saveAs: 'numericPhoneOrder',
          },
          {
            action: 'setup.order.assertOrderTokenized',
            stepName: 'The numeric phone is accepted and data.token is returned',
            params: { response: ref('numericPhoneOrder'), expectedStatus: 200 },
          },
          {
            action: 'api.payment.purchaseWithCreditCard',
            stepName: 'Run Purchase V2 with the numeric-phone order_token',
            // expectError so an error reaches the assertion below as a response, not a throw.
            params: {
              creditCard: creditCardData.kushkiVisaSuccessfull,
              processorName: processorsConfig.kushkiProcessor.name,
              orderToken: ref('numericPhoneOrder').at('data.token'),
              expectError: true,
            },
          },
          {
            action: 'api.payment.assertPurchaseStatus',
            stepName: 'The purchase returns 200 with no error in the body',
            params: { expectedStatus: 200, expectedBody: { error: undefined } },
          },
          {
            action: 'api.orders.getOrder',
            stepName: 'Read back the numeric-phone order (GET Order)',
            params: { orderToken: ref('numericPhoneOrder').at('data.token') },
            saveAs: 'numericPhoneOrderRead',
          },
          {
            action: 'api.orders.assertOrderShippingContact',
            stepName:
              'phone comes back as the string "593983092404", with name and store_name intact',
            params: {
              response: ref('numericPhoneOrderRead'),
              expectedPhone: CONTACT_PHONE_AS_STRING,
              expectedName: SHIPPING_CONTACT_NAME,
              expectedStoreName: SHIPPING_CONTACT_STORE_NAME,
            },
          },

          {
            action: 'setup.order.tokenizeOrder',
            stepName: 'Tokenize an order with a 15-digit numeric phone (E.164 maximum)',
            params: {
              orderData: orderWithShippingContactPhone(CONTACT_PHONE_LONG_NUMERIC),
              expectError: true,
            },
            saveAs: 'longNumericPhoneOrder',
          },
          {
            action: 'setup.order.assertOrderTokenized',
            stepName: 'The long numeric phone is accepted as well',
            params: { response: ref('longNumericPhoneOrder'), expectedStatus: 200 },
          },
          {
            action: 'api.orders.getOrder',
            stepName: 'Read back the long numeric-phone order (GET Order)',
            params: { orderToken: ref('longNumericPhoneOrder').at('data.token') },
            saveAs: 'longNumericPhoneOrderRead',
          },
          {
            action: 'api.orders.assertOrderShippingContact',
            stepName: 'The long phone comes back as an exact string, with no rounding',
            params: {
              response: ref('longNumericPhoneOrderRead'),
              expectedPhone: CONTACT_PHONE_LONG_AS_STRING,
              expectedName: SHIPPING_CONTACT_NAME,
              expectedStoreName: SHIPPING_CONTACT_STORE_NAME,
            },
          },

          {
            action: 'setup.order.tokenizeOrder',
            stepName: '(Baseline) Tokenize the same order with phone as a string',
            params: {
              orderData: orderWithShippingContactPhone(CONTACT_PHONE_AS_STRING),
              expectError: true,
            },
            saveAs: 'stringPhoneOrder',
          },
          {
            action: 'setup.order.assertOrderTokenized',
            stepName: '(Baseline) The string phone is accepted',
            params: { response: ref('stringPhoneOrder'), expectedStatus: 200 },
          },
          {
            action: 'api.payment.purchaseWithCreditCard',
            stepName: '(Baseline) Run Purchase V2 with the string-phone order_token',
            params: {
              creditCard: creditCardData.kushkiVisaSuccessfull,
              processorName: processorsConfig.kushkiProcessor.name,
              orderToken: ref('stringPhoneOrder').at('data.token'),
              expectError: true,
            },
          },
          {
            action: 'api.payment.assertPurchaseStatus',
            stepName: '(Baseline) The purchase returns 200 with no error in the body',
            params: { expectedStatus: 200, expectedBody: { error: undefined } },
          },
          {
            action: 'api.orders.getOrder',
            stepName: '(Baseline) Read back the string-phone order (GET Order)',
            params: { orderToken: ref('stringPhoneOrder').at('data.token') },
            saveAs: 'stringPhoneOrderRead',
          },
          {
            action: 'api.orders.assertOrderShippingContact',
            stepName: '(Baseline) The string phone behaves the same way',
            params: {
              response: ref('stringPhoneOrderRead'),
              expectedPhone: CONTACT_PHONE_AS_STRING,
              expectedName: SHIPPING_CONTACT_NAME,
              expectedStoreName: SHIPPING_CONTACT_STORE_NAME,
            },
          },
        ],
        cleanup: [
          {
            action: 'setup.processor.deleteProcessor',
            params: { processorId: ref('processorId') },
          },
        ],
      });
    }
  );
});
