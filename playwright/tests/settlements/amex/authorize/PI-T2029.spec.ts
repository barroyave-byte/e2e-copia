import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test, expect } from '@support/fixtures';
import { userDataUS, successUser } from '@support/interfaces/user_data';
import { StatusInvoice, validateInvoice } from '@tests/order_validate/validate_invoice';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '@tests/order_validate/validate_transactions';
import { validateSizeSettlements } from '@tests/order_validate/validate_settlements';
import * as crypto from 'crypto';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const orderID = crypto.randomUUID();
const email = EmailGenerator.generateRegisteredUserEmail();

const payload = {
  order_type: 'DEUNA_CHECKOUT',
  payer_info: {
    email: email,
    save_user_info: true,
  },
  payment_source: {
    method_type: 'credit_card',
    card_info: {
      expiry_month: '01',
      expiry_year: '2025',
      card_number: '373953192351004',
      card_holder: 'GUSTAVO MENA',
      card_holder_dni: '43459183',
      zip: '98107',
      city: 'Seattle',
      address1: '6201 14th Ave NW',
      state: 'WA',
      phone: '+14155688537',
      country: 'US',
      card_cvv: '1234',
    },
  },
  order: {
    order_id: orderID,
    currency: 'USD',
    items: [
      {
        id: 'PH2I5R',
        name: 'F: 1702 | O: GDL | D: ORD',
        description: 'F: 1702 | O: GDL | D: ORD',
        total_amount: {
          amount: 500,
          original_amount: 0,
          display_amount: 'USD 3.00',
          display_original_amount: 'USD 0.00',
          currency: 'USD',
          currency_symbol: '$',
          total_discount: 0,
          display_total_discount: 'USD 0.00',
        },
        unit_price: {
          amount: 500,
          display_amount: 'USD 3.00',
          currency: 'USD',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 0,
          display_amount: ' 0.00',
          currency: '',
          currency_symbol: '',
        },
        quantity: 1,
        category: 'Airline',
        type: 'digital',
        taxable: false,
        discounts: [],
        included_in_subscription: false,
        item_details: [],
      },
    ],
    sub_total: 500,
    total_amount: 500,
    store_code: 'all',
    billing_address: {
      email: 'ebueno@deuna.com',
      first_name: 'Eduardo',
      last_name: 'Bueno',
      identity_document: '02513613000',
      phone: '+5548988540552',
      address_type: 'home',
      address1: 'Rua Francisco Torres 381',
      address2: 'Apt 1504',
      zipcode: '82820060',
      city: 'Curitiba',
      state_code: 'PR',
      state_name: 'Parana',
      country_code: 'US',
      is_default: true,
    },
    shipping_address: {
      id: '204',
      first_name: 'Juan',
      last_name: 'Silva',
      email: email,
      address1: 'Jose Luis Lagrange 103',
      address2: 'Piso 12',
      zipcode: '11510',
      city: 'Ciudad de Mexico',
      state_name: 'Ciudad de Mexico',
      country_code: 'MX',
      identity_document: 'IAOI640911TB8',
      identity_document_type: 'RUT', //RTC or RUT E.g. IAOI640911TB8
      phone: '+5511985176644',
      lat: -22.943934,
      lng: -43.182984,
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('US');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.amexProcessorUSAuthorize,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2029 Authorize con AMEX fallido en USA',
    { tag: ['@team_payment_integration'] },
    async ({ paymentService }) => {
      let userAuthToken: string;

      // Register user
      await test.step('Register user', async () => {
        const registeredUser = await apiCallNewman.registerUser(
          email,
          userDataUS,
          successUser,
          privateKey,
          merchantId
        );

        expect(registeredUser).toHaveProperty('token');

        userAuthToken = registeredUser.token;
      });

      await test.step('Authorize order', async () => {
        const purchaseResponse = (
          await paymentService.purchaseV2(
            privateKey,
            userAuthToken,
            payload as any,
            true // expectError: this is a negative test — declined authorization expected
          )
        ).data as any;

        // Validate purchase response
        expect(purchaseResponse).toBeDefined();
        expect(purchaseResponse.data).toBeNull();
        expect(purchaseResponse.error).toBeDefined();
        expect(purchaseResponse.error.code).toEqual('DP-7022');
        expect(purchaseResponse.error.description).toEqual(
          'Payment was declined. Try another card or contact your bank.'
        );
        expect(purchaseResponse.error.processor_error).toBeDefined();
        expect(purchaseResponse.error.processor_error.code).toEqual('200');
        expect(purchaseResponse.error.processor_error.message).toEqual('Deny - Pick up card');

        // Validate invoice
        const invoice = await validateInvoice('', payload.order.order_id, StatusInvoice.Denied);

        // Validate transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Authorize,
          StatusTransaction.Denied
        );
        expect(transaction.amount).toEqual(invoice.amount);

        // Validate settlement
        validateSizeSettlements(invoice.order_token, 0);
      });
    }
  );
});
