import { TelcelInquiryRequest } from '@support/http/models/telcel';

const EMPTY_PAYMENT_DATA = {
  amount: { amount: 0, currency: '' },
  authentication_method: '',
  authorization_3ds: null,
  authorization_bank_transfer: null,
  authorization_code: '',
  capture_cutoff_at: null,
  customer: { email: '', first_name: '', id: '', last_name: '' },
  data_sync: null,
  dynamic_routing_details: null,
  external_transaction_id: '',
  fraud: null,
  from_card: {
    bank_name: '',
    card_brand: '',
    card_holder: '',
    card_id: '',
    country_iso: '',
    credential_source: '',
    expiry_month: '',
    expiry_year: '',
    first_six: '',
    installment: null,
    last_four: '',
  },
  id: '',
  installments: 0,
  manual_status: '',
  merchant: { affiliation_code: '', id: '', mcc: '', store_code: '' },
  merchant_payment_processor_id: '',
  merchant_payment_processor_name: '',
  metadata: null,
  method_type: '',
  next_action: null,
  processor: '',
  processor_error: null,
  raw_response: null,
  reason: '',
  resources: null,
  secure_authentication: null,
  status: '',
  updated_at: '0001-01-01T00:00:00Z',
};

export class TelcelInquiryBodyBuilder {
  static build(): TelcelInquiryRequest {
    const now = new Date().toISOString();

    return {
      Order: {
        transaction_id: '2400009',
        store_code: 'all',
        billing_address: { phone: '' },
        created_at: now,
        items: [{ category: '11' }],
        metadata: {
          'additional_data.telcel_transaction_id': '',
          'additional_data.terminal': '10000',
          'additional_data.business_chain': 'DEUNADU001',
          'additional_data.phone_number': '5555555500',
          'additional_data.store_code': 'all',
          'additional_data.cur': '5551234567',
        },
        payment: { data: { ...EMPTY_PAYMENT_DATA, created_at: now } },
        payment_method: 'credit_card',
        total_amount: 10000,
      },
    };
  }
}
