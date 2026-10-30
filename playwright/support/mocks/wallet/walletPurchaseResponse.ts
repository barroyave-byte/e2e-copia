/**
 * Builds a canned successful response for `POST /merchants/transactions/purchase`
 * suitable for the Apple Pay / Google Pay happy-path tests.
 *
 * Echoes back identifying fields from the inbound request (transaction_id,
 * email, processor_name, billing/shipping addresses) so the iframe sees a
 * realistic shape; everything else is hardcoded from the reference response
 * the platform team supplied.
 *
 * The response sets:
 *   - order.status: 'succeeded'
 *   - order.payment.data.status: 'processed'
 *
 * which is what modular-checkout's post-purchase state machine reads to
 * surface the thank-you screen / fire `onSuccess`.
 */

interface PurchaseRequestBody {
  token?: string;
  email?: string;
  processor_name?: string;
  transaction_id?: string;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  browser_details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const FALLBACK_TRANSACTION_ID = '31735b29-b6b2-44a5-aa00-08b9e613f55f';
const FALLBACK_EMAIL = 'mock.qa@deuna.com';

export const buildPurchaseSuccessResponse = (
  request: PurchaseRequestBody = {}
): Record<string, unknown> => {
  const transactionId = request.transaction_id ?? FALLBACK_TRANSACTION_ID;
  const email = request.email ?? FALLBACK_EMAIL;
  const processorName = request.processor_name ?? 'apple_pay';

  return {
    order: {
      order_id: transactionId,
      transaction_id: transactionId,
      store_code: 'all',
      currency: 'MXN',
      tax_amount: 3000,
      display_tax_amount: '',
      shipping_amount: 3000,
      display_shipping_amount: 'MXN 30.00',
      items_total_amount: 3000,
      display_items_total_amount: 'MXN 30.00',
      sub_total: 3000,
      display_sub_total: 'MXN 30.00',
      total_amount: 3000,
      display_total_amount: 'MXN 30.00',
      items: [
        {
          id: '79',
          name: '10 ALITAS VOLANTE',
          description: '10 alitas picantes',
          options: 'string option',
          total_amount: {
            amount: 1200,
            original_amount: 0,
            display_amount: 'MXN 12.00',
            display_original_amount: 'MXN 0.00',
            currency: '',
            currency_symbol: '',
            total_discount: 0,
            display_total_discount: 'MXN 0.00',
          },
          unit_price: { amount: 850, display_amount: 'MXN 8.50', currency: '', currency_symbol: '' },
          tax_amount: { amount: 100, display_amount: 'MXN 1.00', currency: '', currency_symbol: '' },
          quantity: 1,
          uom: 'string',
          upc: 'string',
          sku: 'SKU-11021',
          isbn: '12-345-678-90123',
          brand: 'Bolt Swagstore',
          manufacturer: 'Bolt Factory',
          category: 'hats',
          color: 'Red',
          size: 'XXL',
          weight: { weight: 22, unit: 'kg' },
          image_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
          details_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
          type: 'physical',
          taxable: true,
          discounts: [],
          included_in_subscription: false,
          item_details: [],
        },
      ],
      discounts: [],
      shipping_address: request.shipping_address ?? {},
      shipping_options: {
        type: 'pickup',
        details: {
          store_name: 'Store Name',
          address: '6 Rotermanni 11343 Talinn',
          address_coordinates: { lat: 4.721245, lng: -74.04673 },
          contact: { name: 'jhon snow', phone: '9725149104' },
          additional_details: {
            delivered_at: '0001-01-01T00:00:00Z',
            pickup_time: '2021-11-03T22:09:09Z',
            stock_location: '',
          },
          store_id: '',
          event_date: '',
          event_seating: '',
          event_city: '',
          event_country_code: '',
          recipient_email: '',
        },
        method: '',
        carrier: '',
        price: null,
        tracking_number: '',
      },
      user_instructions: '',
      metadata: request.metadata ?? {},
      status: 'succeeded',
      payment: {
        data: {
          amount: { amount: 3000, currency: 'MXN' },
          metadata: {
            authorization_code: '000000',
            site_domain: null,
            ui: { language: 'es' },
          },
          from_card: {
            card_brand: 'mastercard',
            first_six: '545195',
            last_four: '5480',
            installment: {
              installments: 1,
              plan_id: '',
              plan_option_id: '',
              installment_type: '',
              installment_rate: 0,
              installment_amount: 0,
            },
            bank_name: 'Banco De La Produccion S.A. (Produbanco)',
            country_iso: 'EC',
            credential_source: '',
            expiry_month: '',
            expiry_year: '',
            card_type: 'credit_card',
          },
          updated_at: new Date().toISOString(),
          method_type: 'credit_card',
          merchant: { store_code: 'all', id: '7d9e821a-e70b-4152-98ac-23a9cc20151b', affiliation_code: '', mcc: '' },
          created_at: new Date().toISOString(),
          id: transactionId,
          processor: processorName,
          customer: { email, id: 'e20d6775-6bef-46a0-859c-5074d27fbe89', first_name: '', last_name: '' },
          status: 'processed',
          reason: '',
          external_transaction_id: '572646553927346043',
          merchant_payment_processor_name: '',
          authorization_code: '000000',
          installment_interest_calculations: null,
          merchant_payment_processor_id: '',
          payment_method_type: '',
          tid: '',
          nsu: '',
          avs: null,
          sca_details: null,
          deuna_error: { code: '', message: '' },
        },
      },
      gift_card: [],
      redirect_url: '',
      webhook_urls: null,
      total_discount: 0,
      display_total_discount: 'MXN 0.00',
      shipping: null,
      cash_change: 0,
      shipping_method: null,
      shipping_methods: [],
      timezone: '',
      scheduled_at: '',
      billing_address: request.billing_address ?? {},
      payment_link: '',
      display_shipping_tax_amount: 'MXN 0.00',
      display_total_tax_amount: 'MXN 0.00',
      shipping_tax_amount: 0,
      total_tax_amount: 0,
      user_id: '',
      include_payment_options: [],
      redirect_urls: { success: '', pending: '', error: '', fallback: '', close: '' },
      created_at: '',
      updated_at: '',
      payer_info: { email, person_type: 'UNKNOWN_PERSON' },
      discount_amount: 0,
      shipping_discount_amount: 0,
      device_fingerprint: '',
      expired_at: '',
      version: '0',
      fraud: null,
      display_total_interest_amount: '',
      payment_method: '',
      token: '',
      statement_descriptor: '',
      browser_details: request.browser_details ?? {},
      callback_urls: null,
      market_type: 'ecommerce',
      fraud_shadowmode: [],
      initiator_type: 'customer',
    },
    custom_fields: [],
  };
};
