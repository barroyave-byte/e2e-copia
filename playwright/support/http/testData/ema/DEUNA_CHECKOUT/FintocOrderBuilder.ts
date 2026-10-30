import { EmailGenerator } from '@support/utils/EmailGenerator';
import { TokenizeOrderRequestData } from '@support/http/models/order';
import * as crypto from 'crypto';

export interface FintocOrderOptions {
  email?: string;
  order_id?: string;
  totalAmount?: number;
  description?: string;
}

export class FintocOrderBuilder {
  static createOrder(options: FintocOrderOptions = {}): TokenizeOrderRequestData {
    const {
      email = EmailGenerator.generatePayerEmail(),
      order_id = `fintoc-${Math.floor(Math.random() * 100000000)}`,
      totalAmount = 30000,
      description = 'Pago Fintoc test',
    } = options;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      order_type: 'DEUNA_CHECKOUT',
      payer_info: {
        email,
        save_user_info: false,
        person_type: 'NATURAL_PERSON',
      },
      payment_source: {
        method_type: 'bank_transfer',
        processor: 'fintoc',
        method_type_specific_fields: { description },
      },
      anti_fraud_info: {
        session_id: crypto.randomUUID(),
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ip_address: '190.98.10.10',
        device: { id: crypto.randomUUID() },
        browser_details: {
          screen_height: 982,
          screen_width: 1512,
          color_depth: 30,
          language: 'es-CL',
          java_enabled: false,
          java_script_enabled: true,
          time_zone_offset: 240,
          accept_header: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      order: {
        order_id,
        currency: 'CLP',
        market_type: 'ecommerce',
        channel_type: 'desktop_web',
        description,
        store_code: 'all',
        total_amount: totalAmount,
        sub_total: totalAmount,
        items_total_amount: totalAmount,
        tax_amount: 0,
        total_tax_amount: 0,
        shipping_amount: 0,
        shipping_tax_amount: 0,
        total_discount: 0,
        discount_amount: 0,
        shipping_discount_amount: 0,
        items: [
          {
            id: 'SKU-FINTOC-01',
            name: 'Producto Fintoc Test',
            description: 'Item Fintoc',
            quantity: 1,
            sku: 'SKU-FINTOC-01',
            category: 'electronics',
            type: 'physical',
            taxable: false,
            unit_price: { amount: totalAmount, currency: 'CLP' },
            total_amount: {
              amount: totalAmount,
              original_amount: totalAmount,
              total_discount: 0,
              currency: 'CLP',
            },
            tax_amount: { amount: 0, currency: 'CLP' },
          },
        ],
        discounts: [],
        gift_card: [],
        shipping_address: {
          first_name: 'Deuna',
          last_name: 'Fintoc',
          email,
          phone: '56912345678',
          identity_document: '11111111-1',
          identity_document_type: 'RUT',
          address1: 'Av. Providencia 1234',
          city: 'Santiago',
          zipcode: '7500000',
          state_name: 'Region Metropolitana',
          state_code: 'RM',
          country_code: 'CL',
        },
        billing_address: {
          first_name: 'Deuna',
          last_name: 'Fintoc',
          email,
          phone: '56912345678',
          identity_document: '11111111-1',
          identity_document_type: 'RUT',
          address1: 'Av. Providencia 1234',
          city: 'Santiago',
          zipcode: '7500000',
          state_name: 'Region Metropolitana',
          state_code: 'RM',
          country_code: 'CL',
        },
        payer_info: { email, person_type: 'NATURAL_PERSON' },
        metadata: {},
      },
    };

    return body;
  }
}
