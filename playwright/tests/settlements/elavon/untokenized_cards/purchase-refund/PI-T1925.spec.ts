import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as refundData from '@support/interfaces/refundV2';
import * as userData from '@support/interfaces/user_data';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as crypto from 'crypto';
import { validateRefundV2 } from '@tests/order_validate/validate_refund_v2';
import { StatusInvoice, validateInvoice } from '../../../../order_validate/validate_invoice';
import {
  StatusSettlement,
  validateSettlement,
} from '../../../../order_validate/validate_settlements';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '../../../../order_validate/validate_transactions';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const order_id = crypto.randomUUID();

const email = EmailGenerator.generateRegisteredUserEmail();

const body_sent_purchase_v2 = {
  order_type: 'AIRLINE_ORDER',
  payer_info: {
    email: 'test_gus@testuser.com',
    save_user_info: true,
  },
  payment_source: {
    method_type: 'credit_card',
    card_info: {
      expiry_month: '01',
      expiry_year: '2028',
      card_number: '4237471004567871',
      card_holder: 'GUSTAVO MENA',
      card_holder_dni: '43459183',
      zip: '98107',
      city: 'Seattle',
      address1: '6201 14th Ave NW',
      state: 'WA',
      phone: '+14155688537',
      country: 'US',
      card_cvv: '123',
      secure_authentication: {
        cavv: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        xid: '5a56fdc9-6d47-5fee-8000-000000296743',
        three_ds_authentication_response: 'Y',
      },
    },
  },
  order: {
    airline_information: {
      booking_items: [
        {
          pnr: 'ABC123',
          ticket_number: '1234567890',
          e_ticket: true,
          airline_3_digit_code: '001',
          airline_iata_designator: 'AA',
          ticketing_travel_agency: {
            iata_code: '12345678',
            name: 'Best Travel Agency',
            agency_invoice_number: 'INV-98765',
          },
          passenger: {
            user_id: 'USR001',
            first_name: 'Jean',
            middle_name: 'Carlos',
            last_name: 'Roldan',
            document_type: 'Passport',
            identity_document_number: 'A12345678',
            email: 'johndoe@example.com',
            phone: '+59398663773',
            frequent_flyer_code: 'FF12345',
            title: 'Mr.',
            date_of_birth: '1994-08-15',
            country_code: 'EC',
          },
          legs: [
            {
              carrier_code: 'AA',
              carrier_name: 'American Airlines',
              origin: {
                date: '2025-03-25',
                time: '08:00',
                iata_code: 'JFK',
                city: 'New York',
              },
              destination: {
                date: '2025-03-25',
                time: '12:00',
                iata_code: 'LAX',
                city: 'Los Angeles',
              },
              flight_number: 'AA100',
              fare_basis_code: 'Y1234',
              seat_location: '12A',
              stopover_code: 'X',
              sub_total_amount: 300.0,
              tax_amount: 50.0,
              total_amount: 350.0,
              service_class: 'Economy',
            },
          ],
        },
      ],
    },
    order_id: order_id,
    currency: 'USD',
    items: [
      {
        id: '216',
        name: '10 EMPANADAS',
        description: '',
        options: 'string option',
        total_amount: {
          original_amount: 4000,
          amount: 4000,
          currency: 'USD',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 0,
          currency: 'USD',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 0,
          currency: 'USD',
          currency_symbol: '$',
        },
        quantity: 1,
        uom: 'string',
        upc: 'string',
        sku: '',
        isbn: '',
        brand: '',
        manufacturer: '',
        category: '',
        color: '',
        size: '',
        weight: {
          amount: 0,
          unit: 'kg',
        },
        image_url:
          'https://images-staging.getduna.com/95463fb5-6279-4ec3-8ff9-fe07aacd2142/db5b698c57654116_domicilio_216_750x750_1662162887.png?d=200x200&format=webp',
        details_url: '',
        type: 'physcal',
        taxable: true,
      },
    ],
    sub_total: 4000,
    total_amount: 4000,
    store_code: 'all',
    billing_address: {
      id: 1342,
      user_id: '564e1418-6398-4ece-bc9d-f0c82bebb592',
      address1: '6201 14th Ave NW',
      address2: 'Apt 101',
      address_type: 'home',
      city: 'Seattle',
      country_code: 'US',
      email: 'test_gus@testuser.com',
      first_name: 'Gustavo',
      last_name: 'Mena',
      identity_document: '43459183',
      is_default: true,
      phone: '+525545014210',
      state_code: 'CO',
      state_name: 'Washington',
      zipcode: '98107',
    },
    shipping_address: {
      id: '23423423',
      user_id: '564e1418-6398-4ece-bc9d-f0c82bebb592',
      address1: '6201 14th Ave NW',
      address2: 'Apt 101',
      address_type: 'home',
      city: 'Seattle',
      country_code: 'US',
      email: 'test_gus@testuser.com',
      first_name: 'Gustavo',
      last_name: 'Mena',
      identity_document: '43459183',
      is_default: true,
      phone: '+14155688537',
      state_code: 'EC',
      state_name: 'Washington',
      zipcode: '98107',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    // Configure Merchant
    const merchant = await configMerchant.basicSetup('US');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    // Create Merchant
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    // Create Merchant Payment Processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.elavonProcessorSettlement,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1925 (1.0) Purchase → Refund Total(Void) ELAVON Flow without registering card',
    { tag: ['@settlement', '@team_payment_integration'] },
    async ({ paymentService }) => {
      let conciliationIdPurchase: string;
      let userAuthToken: string;
      let orderToken: string;
      let orderId: string;
      await test.step('Register User', async () => {
        const registerUser = await apiCallNewman.registerUser(
          email,
          userData.userDataMX,
          userData.successUser,
          privateKey,
          merchantId
        );
        expect(registerUser).toHaveProperty('token');
        userAuthToken = registerUser.token;
      });
      await test.step('Validate Purchase V2', async () => {
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_sent_purchase_v2 as any)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual('USD');
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Processing);
        orderToken = purchase_v2.order_token;
        orderId = purchase_v2.order.order_id;
        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Processing);
        expect(invoice.amount).toEqual(4000);
        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Purchase,
          StatusTransaction.Processing
        );
        expect(transaction.amount).toEqual(invoice.amount);
        conciliationIdPurchase = transaction.conciliation_id;
        // Validate Settlement
        const settlement = await validateSettlement(
          purchase_v2.order_token,
          0,
          StatusTransaction.Processing,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.amount).toEqual(4000);
        expect(settlement.raw_billing_address).not.toBeFalsy();
      });
      await test.step('Validate Refund Total', async () => {
        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          refundData.successRefundV2,
          privateKey,
          0,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: 4000,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Refunded,
          indexRefund: 0,
          skipTransactionId: true,
        });
        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Refunded);
        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          1,
          TypeTransaction.Refund,
          StatusTransaction.Refunded
        );
        expect(transaction.amount).toEqual(4000);
        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          0,
          StatusTransaction.Processing,
          StatusSettlement.Unsettleable
        );
        expect(settlement.conciliation_id).toEqual(conciliationIdPurchase);
        expect(settlement.amount).toEqual(4000);
      });
    }
  );
});
