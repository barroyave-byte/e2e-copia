import { TokenizeOrderRequestData } from '@support/http/models/order';
import * as crypto from 'crypto';

export interface NupayOrderOptions {
  order_id?: string;
  store_code?: string;
  /** CPF to embed in shipping/billing address identity_document. Default: '58188896454' */
  cpf?: string;
  /** Order total amount in cents. Default: 13000 */
  totalAmount?: number;
  /**
   * 'default' → credit order (Formularios widget)
   * 'debit'   → PAYMENT_LINK order with PaymentFormPattern (enables nupay_debit)
   */
  variant?: 'default' | 'debit';
}

export class NupayOrderBuilder {
  /**
   * Builds a NuPay order body that mirrors the Postman collection folders for
   * credit-based tests: "Tokenize Order with document", "Tokenize Order 3 Installments",
   * "Tokenize order CPF without Nupay account", "Tokenize Order without document",
   * "Tokenize Order invalid document consent".
   */
  static createOrder(options: NupayOrderOptions = {}): TokenizeOrderRequestData {
    const {
      order_id = crypto.randomUUID(),
      store_code = 'all',
      cpf = '58188896454',
      totalAmount = 13000,
    } = options;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order: any = {
      order_id,
      store_code,
      currency: 'BRL',
      items_total_amount: 1,
      tax_amount: 0,
      sub_total: totalAmount,
      shipping_amount: 0,
      payment_method: 'wallet',
      shipping_tax_amount: 0,
      total_tax_amount: 0,
      total_amount: totalAmount,
      discounts: [],
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Papas',
          description: 'Papas fritas con paprica',
          total_amount: {
            original_amount: 2100,
            amount: 2050,
            total_discount: 100,
            currency: 'BRL',
            currency_symbol: 'R$',
          },
          unit_price: {
            amount: 1050,
            currency: 'BRL',
            currency_symbol: 'R$',
          },
          tax_amount: {
            amount: 50,
            currency: 'BRL',
            currency_symbol: 'R$',
          },
          quantity: 2,
          image_url:
            'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
          taxable: true,
        },
        {
          id: crypto.randomUUID(),
          name: 'Refresco',
          description: 'Coca-cola Sprite',
          total_amount: {
            original_amount: 75,
            amount: 90,
            total_discount: 0,
            currency: 'BRL',
            currency_symbol: 'R$',
          },
          unit_price: {
            amount: 75,
            currency: 'BRL',
            currency_symbol: 'R$',
          },
          tax_amount: {
            amount: 15,
            currency: 'BRL',
            currency_symbol: 'R$',
          },
          quantity: 1,
          image_url:
            'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
          taxable: true,
        },
      ],
      shipping_address: {
        id: Math.floor(Math.random() * 100000),
        first_name: 'Pablo',
        last_name: 'Murillo',
        email: 'johndoe@deuna.com',
        identity_document: cpf,
        identity_document_type: 'CPF',
        address1: 'Praia de Botafogo St.,',
        address2: '3o. Andar',
        zipcode: '22251-050',
        city: 'Rio de Janeiro',
        state_name: 'Rio de Janeiro',
        country_code: 'BRA',
        phone: '+551146733466',
        lat: -22.943934,
        lng: -43.182984,
        additional_description: 'confirmar',
        address_type: 'home',
      },
      billing_address: {
        id: Math.floor(Math.random() * 100000),
        first_name: 'Jean',
        last_name: 'Roldan',
        email: 'jroldan@deuna.com',
        identity_document: cpf,
        identity_document_type: 'CPF',
        address1: 'Rua Capote Valente',
        address2: 'Pinheiros',
        zipcode: '05409-002',
        city: 'São Paulo',
        state_name: 'SP',
        country_code: 'BRA',
        phone: '+5521988939196',
        lat: -23.555425,
        lng: -46.677048,
        address_type: 'home',
      },
      metadata: { origin: 'core' },
      browser_details: { screen_height: 1000, screen_width: 2000 },
      webhook_urls: {
        notify_order: 'https://webhook.site/065ef7c7-38e8-48aa-9da7-49f73a2d7a2a',
      },
    };

    return { order } as unknown as TokenizeOrderRequestData;
  }

  /**
   * Builds a NuPay debit order body — mirrors the "Tokenize order Debit" Postman folder.
   * Uses order_type PAYMENT_LINK with PaymentFormPattern checkout module, which enables
   * both nupay_credit and nupay_debit in the payments-methods response.
   */
  static createDebitOrder(order_id: string = crypto.randomUUID()): TokenizeOrderRequestData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      order: {
        order_id,
        store_code: 'all',
        currency: 'BRL',
        tax_amount: 0,
        display_tax_amount: 'R$     5.28',
        shipping_amount: 0,
        display_shipping_amount: 'BRL0,00',
        items_total_amount: 528,
        display_items_total_amount: 'R$     5.28',
        sub_total: 528,
        display_sub_total: 'BRL0',
        total_amount: 528,
        display_total_amount: 'R$     5.28',
        items: [
          {
            name: 'Polo Shirt',
            image_url: 'https://cdn.stg.deuna.io/explore-deuna/assets/shirt.png',
            quantity: 1,
            price: 528,
            slug: 'polo-shirt',
            displayPrice: 'R$ 5.28',
            productTitle: 'Camisa Polo',
            description:
              'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod bibendum laoreet.',
            brand: 'Generic Brand',
            category: 'Electronics',
            collections: ['Electronics', 'Headphones'],
            color: 'Black',
            details_url: '',
            id: '789456123',
            item_details: [],
            isbn: '123-456-789',
            manufacturer: 'Generic Manufacturer',
            options: 'string option',
            size: '',
            sku: 'HEADPH001',
            tax_amount: {
              original_amount: 0,
              discount_amount: 0,
              display_original_amount: '',
              amount: 0,
              currency: 'BRL',
              currency_symbol: 'R$',
              display_amount: 'R$ 0.00',
            },
            taxable: true,
            total_amount: {
              amount: 528,
              discount_amount: 0,
              currency: 'BRL',
              currency_symbol: 'R$',
              display_amount: 'R$ 5.28',
              display_original_amount: 'R$ 5.28',
              original_amount: 0,
            },
            type: 'Electronics',
            unit_price: {
              original_amount: 528,
              discount_amount: 0,
              display_original_amount: '',
              amount: 528,
              currency: 'BRL',
              currency_symbol: 'R$',
              display_amount: 'R$ 5.28',
            },
            uom: 'Piece',
            upc: 'string',
            weight: { weight: 1, unit: 'kg' },
          },
        ],
        discounts: [],
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '+551146733466',
          identity_document: '58188896454',
          lat: 19.3600265,
          lng: -99.1574174,
          address1: 'José Luis Lagrange 456, Colonia Polanco',
          address2: 'José Luis Lagrange 456, Colonia Polanco',
          city: 'Ciudad de México',
          zipcode: '11510',
          state_name: 'Cundinamarca',
          country_code: 'BR',
          additional_description: '',
          address_type: 'home',
          identity_document_type: 'CPF',
          email: 'john@doe.com',
          state_code: '',
          country: 'BR',
        },
        shipping_options: {
          type: 'delivery',
          details: {
            store_name: '',
            address: '',
            address_coordinates: { lat: 0, lng: 0 },
            contact: { name: '', phone: '' },
            additional_details: {},
          },
        },
        user_instructions: 'This item is a gift.',
        status: '',
        redirect_url: '',
        total_discount: 0,
        display_total_discount: '',
        shipping_methods: [],
        timezone: '',
        scheduled_at: '',
        billing_address: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '+551146733466',
          identity_document: '58188896454',
          lat: 19.3600265,
          lng: -99.1574174,
          address1: 'José Luis Lagrange 456, Colonia Polanco',
          address2: 'José Luis Lagrange 456, Colonia Polanco',
          city: 'Ciudad de México',
          zipcode: '11510',
          state_name: '',
          country_code: 'BR',
          additional_description: '',
          address_type: '',
          identity_document_type: 'CPF',
          email: 'john@doe.com',
          state_code: '',
          country: 'BR',
        },
        payment_link: '',
        display_total_tax_amount: '',
        total_tax_amount: 0,
        payment_method: 'wallet',
      },
      order_type: 'PAYMENT_LINK',
      shipping_rate: {
        service_name: '',
        description: '',
        cost: 0,
        tax_amount: 0,
        display_tax_amount: '',
        reference: '',
        estimated_delivery_date: '',
        tax_code: '',
      },
      checkout_modules: [
        {
          name: 'PaymentFormPattern',
          url: '',
        },
      ],
    };

    return body as unknown as TokenizeOrderRequestData;
  }
}
